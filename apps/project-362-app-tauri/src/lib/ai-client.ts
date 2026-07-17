// Project 362: your days on screen, reported like news
//
// Provider-agnostic chat LLM client. Reads the user's configured AI provider
// from settings (Ollama, OpenAI, or any OpenAI-compatible endpoint) and
// exposes a single chatCompletion() call. Nothing about the provider, model,
// or prompt output is hard-coded to a specific vendor.

import type { AppSettings } from "@/src/hooks/use-settings";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ResolvedProvider {
  endpoint: string;
  apiKey: string | null;
  model: string;
}

/**
 * Resolve the chat-completions endpoint, key, and model from user settings.
 * Returns null when no provider is usable (nothing configured).
 */
export function resolveProvider(
  settings: AppSettings | null
): ResolvedProvider | null {
  if (!settings) return null;

  // 1. Explicit OpenAI-compatible endpoint (LM Studio, vLLM, LiteLLM, etc.)
  if (settings.openaiCompatibleEndpoint) {
    const base = settings.openaiCompatibleEndpoint.replace(/\/+$/, "");
    return {
      endpoint: base.endsWith("/chat/completions")
        ? base
        : `${base}/chat/completions`,
      apiKey: settings.openaiCompatibleApiKey || null,
      model:
        settings.openaiCompatibleModel || settings.aiModel || "default",
    };
  }

  // 2. Local Ollama
  if (settings.useOllama || settings.aiProviderType === "ollama") {
    const base = (settings.ollamaUrl || "http://localhost:11434").replace(
      /\/+$/,
      ""
    );
    return {
      endpoint: `${base}/v1/chat/completions`,
      apiKey: null,
      model: settings.aiModel || "llama3.1",
    };
  }

  // 3. OpenAI with the user's own key
  if (settings.openaiApiKey) {
    return {
      endpoint: "https://api.openai.com/v1/chat/completions",
      apiKey: settings.openaiApiKey,
      model: settings.aiModel || "gpt-4o",
    };
  }

  return null;
}

/** True when a chat LLM is configured and can be called. */
export function isAiConfigured(settings: AppSettings | null): boolean {
  return resolveProvider(settings) !== null;
}

/**
 * Run a chat completion against whichever provider the user configured.
 * Returns the assistant text, or null on any failure (callers fall back
 * to non-AI behaviour and must never crash the UI).
 */
export async function chatCompletion(
  settings: AppSettings | null,
  messages: ChatMessage[],
  options?: { temperature?: number; maxTokens?: number; timeoutMs?: number }
): Promise<string | null> {
  const provider = resolveProvider(settings);
  if (!provider) return null;

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    options?.timeoutMs ?? 60_000
  );

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (provider.apiKey) {
      headers["Authorization"] = `Bearer ${provider.apiKey}`;
    }

    const res = await fetch(provider.endpoint, {
      method: "POST",
      headers,
      signal: controller.signal,
      body: JSON.stringify({
        model: provider.model,
        messages,
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 2048,
      }),
    });

    if (!res.ok) {
      console.error(
        `[ai-client] chatCompletion failed: ${res.status} ${res.statusText}`
      );
      return null;
    }

    const data = await res.json();
    const content: string | undefined = data?.choices?.[0]?.message?.content;
    return typeof content === "string" && content.length > 0 ? content : null;
  } catch (err) {
    console.error("[ai-client] chatCompletion error:", err);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Extract a JSON value from an LLM response that may be wrapped in prose
 * or markdown code fences. Returns null when nothing parseable is found.
 */
export function extractJson<T>(raw: string): T | null {
  // Strip markdown fences first
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced ? fenced[1] : raw).trim();

  try {
    return JSON.parse(candidate) as T;
  } catch {
    // Fall back to the first [...] or {...} block in the text
    const start = candidate.search(/[[{]/);
    if (start === -1) return null;
    const open = candidate[start];
    const close = open === "[" ? "]" : "}";
    const end = candidate.lastIndexOf(close);
    if (end <= start) return null;
    try {
      return JSON.parse(candidate.slice(start, end + 1)) as T;
    } catch {
      return null;
    }
  }
}
