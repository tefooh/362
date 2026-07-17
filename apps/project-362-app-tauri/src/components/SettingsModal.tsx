// Project 362: your days on screen, reported like news

import React, { useState } from "react";
import type { AppSettings } from "@/src/hooks/use-settings";

export interface SettingsModalProps {
  settings: AppSettings;
  onSave: (settings: AppSettings) => Promise<boolean>;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onSave,
  onClose,
}) => {
  const [provider, setProvider] = useState<string>(
    settings.aiProviderType || "openai"
  );
  const [openaiKey, setOpenaiKey] = useState<string>(
    settings.openaiApiKey || ""
  );
  const [openaiModel, setOpenaiModel] = useState<string>(
    settings.aiModel || "gpt-4o"
  );
  const [compatibleEndpoint, setCompatibleEndpoint] = useState<string>(
    settings.openaiCompatibleEndpoint || ""
  );
  const [compatibleKey, setCompatibleKey] = useState<string>(
    settings.openaiCompatibleApiKey || ""
  );
  const [compatibleModel, setCompatibleModel] = useState<string>(
    settings.openaiCompatibleModel || ""
  );
  const [ollamaUrl, setOllamaUrl] = useState<string>(
    settings.ollamaUrl || "http://localhost:11434"
  );
  const [ollamaModel, setOllamaModel] = useState<string>(
    settings.aiModel || "llama3"
  );
  const [customPrompt, setCustomPrompt] = useState<string>(
    settings.customPrompt || ""
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [animateOut, setAnimateOut] = useState(false);

  const handleClose = () => {
    setAnimateOut(true);
    setTimeout(() => {
      onClose();
    }, 200);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const newSettings: AppSettings = {
      aiProviderType: provider,
      customPrompt,
      openaiApiKey: openaiKey,
      aiModel: provider === "openai" ? openaiModel : provider === "ollama" ? ollamaModel : settings.aiModel,
      openaiCompatibleEndpoint: compatibleEndpoint,
      openaiCompatibleApiKey: compatibleKey,
      openaiCompatibleModel: compatibleModel,
      ollamaUrl,
    };

    const success = await onSave(newSettings);
    setSaving(false);
    if (success) {
      handleClose();
    } else {
      setError("Failed to save settings. Please try again.");
    }
  };

  return (
    <div
      className={`fixed inset-0 bg-charcoal/30 flex items-center justify-center p-4 z-50 backdrop-blur-[2px] transition-opacity duration-200 ${
        animateOut ? "opacity-0" : "opacity-100"
      }`}
    >
      <div
        className={`p362-card bg-canvas w-full max-w-xl mx-auto p-6 md:p-8 flex flex-col max-h-[90vh] ${
          animateOut ? "animate-modal-out" : "animate-modal-in"
        }`}
      >
        <div className="flex items-center justify-between border-b border-charcoal pb-4 mb-6">
          <h2 className="p362-display text-[26px] text-charcoal">
            Chronicle Editor Settings
          </h2>
          <button
            onClick={handleClose}
            className="p362-pill h-8 px-3 bg-tan-soft text-charcoal"
          >
            ✕ Close
          </button>
        </div>

        <form onSubmit={handleSave} className="flex-grow overflow-y-auto pr-2 space-y-5">
          {error && (
            <div className="p-3 border-hairline border-orange bg-orange/10 text-orange font-semibold font-sans text-[11px] uppercase tracking-wider">
              {error}
            </div>
          )}

          <div>
            <label className="p362-eyebrow mb-2 block text-charcoal">
              AI Provider
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(["openai", "ollama", "compatible"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setProvider(t)}
                  className={`p362-pill justify-center ${
                    provider === t
                      ? "bg-charcoal text-surface"
                      : "bg-tan-soft text-charcoal"
                  }`}
                >
                  {t === "openai"
                    ? "OpenAI"
                    : t === "ollama"
                    ? "Ollama"
                    : "Compatible"}
                </button>
              ))}
            </div>
          </div>

          {provider === "openai" && (
            <div className="space-y-4">
              <div>
                <label className="p362-eyebrow mb-1.5 block text-charcoal">
                  OpenAI API Key
                </label>
                <input
                  type="password"
                  value={openaiKey}
                  onChange={(e) => setOpenaiKey(e.target.value)}
                  className="bg-surface border-hairline border-charcoal px-3 py-2 text-charcoal text-[13px] outline-none rounded-none w-full font-mono"
                  placeholder="sk-..."
                />
              </div>
              <div>
                <label className="p362-eyebrow mb-1.5 block text-charcoal">
                  Model
                </label>
                <select
                  value={openaiModel}
                  onChange={(e) => setOpenaiModel(e.target.value)}
                  className="bg-surface border-hairline border-charcoal px-3 py-2 text-charcoal text-[13px] outline-none rounded-none w-full"
                >
                  <option value="gpt-4o">gpt-4o</option>
                  <option value="gpt-4o-mini">gpt-4o-mini</option>
                  <option value="o1-mini">o1-mini</option>
                </select>
              </div>
            </div>
          )}

          {provider === "ollama" && (
            <div className="space-y-4">
              <div>
                <label className="p362-eyebrow mb-1.5 block text-charcoal">
                  Ollama URL
                </label>
                <input
                  type="text"
                  value={ollamaUrl}
                  onChange={(e) => setOllamaUrl(e.target.value)}
                  className="bg-surface border-hairline border-charcoal px-3 py-2 text-charcoal text-[13px] outline-none rounded-none w-full"
                  placeholder="http://localhost:11434"
                />
              </div>
              <div>
                <label className="p362-eyebrow mb-1.5 block text-charcoal">
                  Model Name
                </label>
                <input
                  type="text"
                  value={ollamaModel}
                  onChange={(e) => setOllamaModel(e.target.value)}
                  className="bg-surface border-hairline border-charcoal px-3 py-2 text-charcoal text-[13px] outline-none rounded-none w-full"
                  placeholder="llama3"
                />
              </div>
            </div>
          )}

          {provider === "compatible" && (
            <div className="space-y-4">
              <div>
                <label className="p362-eyebrow mb-1.5 block text-charcoal">
                  Endpoint URL
                </label>
                <input
                  type="text"
                  value={compatibleEndpoint}
                  onChange={(e) => setCompatibleEndpoint(e.target.value)}
                  className="bg-surface border-hairline border-charcoal px-3 py-2 text-charcoal text-[13px] outline-none rounded-none w-full"
                  placeholder="https://api.your-provider.com/v1"
                />
              </div>
              <div>
                <label className="p362-eyebrow mb-1.5 block text-charcoal">
                  API Key
                </label>
                <input
                  type="password"
                  value={compatibleKey}
                  onChange={(e) => setCompatibleKey(e.target.value)}
                  className="bg-surface border-hairline border-charcoal px-3 py-2 text-charcoal text-[13px] outline-none rounded-none w-full font-mono"
                  placeholder="API Key if needed"
                />
              </div>
              <div>
                <label className="p362-eyebrow mb-1.5 block text-charcoal">
                  Model Name
                </label>
                <input
                  type="text"
                  value={compatibleModel}
                  onChange={(e) => setCompatibleModel(e.target.value)}
                  className="bg-surface border-hairline border-charcoal px-3 py-2 text-charcoal text-[13px] outline-none rounded-none w-full"
                  placeholder="e.g. meta-llama/llama-3-70b-instruct"
                />
              </div>
            </div>
          )}

          <div className="border-t border-charcoal pt-4">
            <label className="p362-eyebrow mb-1.5 block text-charcoal">
              Custom Prompt Instructions (Optional)
            </label>
            <textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              rows={5}
              className="bg-surface border-hairline border-charcoal px-3 py-2 text-charcoal text-[12px] leading-relaxed outline-none rounded-none w-full font-mono"
              placeholder="Leave blank to use the standard editorial system prompt, or supply your own constraints (e.g. 'Report my day like a retro cyberpunk news anchor. Focus entirely on terminal operations and ignore all browser activities.')"
            />
            <p className="font-sans text-[11px] text-ink-muted mt-1">
              Custom instructions override the default prompt rules when compiling your news daily.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-charcoal">
            <button
              type="submit"
              disabled={saving}
              className="p362-pill bg-charcoal text-surface w-full md:w-auto"
            >
              {saving ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SettingsModal;
