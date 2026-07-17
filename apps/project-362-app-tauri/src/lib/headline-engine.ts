// Project 362: your days on screen, reported like news
//
// Turns raw activity data into editorial "news" stories: it scans the day's
// captured activity for anything special (deep-work streaks, meeting
// marathons, late-night sessions, trending topics) and writes headlines.

import type { ActivitySummary, Meeting } from "./engine-client";
import { fetchSearch } from "./engine-client";
import { chatCompletion, extractJson, isAiConfigured } from "./ai-client";
import type { AppSettings } from "@/src/hooks/use-settings";
import { displayApp } from "./app-display";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ArticleCategory =
  | "PRODUCTIVITY"
  | "FOCUS"
  | "COMMUNICATION"
  | "NIGHT OWL"
  | "TRENDING"
  | "DISCOVERY"
  | "MILESTONE";

export interface Article {
  id: string;
  headline: string;
  subtitle: string;
  body: string;
  category: ArticleCategory;
  frameId?: number;
  appName?: string;
  timestamp?: string;
  priority: number; // higher = more newsworthy
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MAX_ARTICLES = 7;

/** Format minutes into a human-friendly duration string. */
function fmtDuration(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)} Minutes`;
  const hrs = minutes / 60;
  return `${hrs.toFixed(1)} Hours`;
}

/** Same but lowercase for use within sentences. */
function fmtDurationLower(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)} minutes`;
  const hrs = minutes / 60;
  return `${hrs.toFixed(1)} hours`;
}

/** Compute percentage share. */
function pct(part: number, whole: number): number {
  if (whole === 0) return 0;
  return Math.round((part / whole) * 100);
}

// Stop words filtered out of trending keywords
const STOP_WORDS = new Set([
  "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
  "have", "has", "had", "do", "does", "did", "will", "would", "could",
  "should", "may", "might", "shall", "can", "to", "of", "in", "for",
  "on", "with", "at", "by", "from", "as", "into", "through", "during",
  "before", "after", "above", "below", "between", "out", "off", "over",
  "under", "again", "further", "then", "once", "and", "but", "or", "nor",
  "not", "no", "so", "if", "it", "its", "this", "that", "these", "those",
  "i", "me", "my", "we", "our", "you", "your", "he", "him", "his", "she",
  "her", "they", "them", "their", "what", "which", "who", "whom", "how",
  "all", "each", "every", "both", "few", "more", "most", "other", "some",
  "such", "than", "too", "very", "just", "about", "up", "down", "here",
  "there", "when", "where", "why", "any", "new", "also", "like",
  "get", "got", "set", "one", "two", "use", "used", "file", "true", "false",
  "null", "undefined", "return", "const", "let", "var", "function", "class",
  "import", "export", "default", "type", "interface", "string", "number",
]);

// ---------------------------------------------------------------------------
// Article generators
// ---------------------------------------------------------------------------

/** Scan window titles for a specific app to extract the active topic or file name. */
function getAppHighlight(
  summary: ActivitySummary,
  appName: string
): { topic: string; windowName: string } | null {
  const appWindows = summary.windows.filter(
    (w) =>
      w.app_name.toLowerCase() === appName.toLowerCase() &&
      w.window_name &&
      w.window_name.length > 5 &&
      !["new tab", "untitled", "home", "inbox"].includes(
        w.window_name.toLowerCase()
      )
  );
  if (appWindows.length === 0) return null;

  // Sort by minutes spent on this window
  const sorted = [...appWindows].sort((a, b) => b.minutes - a.minutes);
  const topWindow = sorted[0];

  // Try to clean the window title (e.g. "auth.rs - project-362" -> "auth.rs")
  let cleanTitle = topWindow.window_name;
  const delimiters = [" \u2014 ", " - ", " | "];
  for (const delim of delimiters) {
    if (cleanTitle.includes(delim)) {
      const parts = cleanTitle.split(delim);
      const firstPart = parts[0].trim();
      if (
        firstPart.toLowerCase() !== appName.toLowerCase() &&
        firstPart.length > 3
      ) {
        cleanTitle = firstPart;
        break;
      }
    }
  }

  // Remove em-dashes and en-dashes
  cleanTitle = cleanTitle.replace(/\u2014/g, ",").replace(/\u2013/g, "-").trim();

  return {
    topic: cleanTitle,
    windowName: topWindow.window_name.replace(/\u2014/g, ",").replace(/\u2013/g, "-"),
  };
}

function topAppArticle(summary: ActivitySummary): Article | null {
  if (summary.apps.length === 0) return null;

  const sorted = [...summary.apps].sort((a, b) => b.minutes - a.minutes);
  const top = sorted[0];
  const share = pct(top.minutes, summary.total_active_minutes);
  const runner = sorted.length > 1 ? sorted[1] : null;

  const appDisplay = displayApp(top.name);
  const highlight = getAppHighlight(summary, top.name);

  let headline = `${appDisplay} was your main companion today`;
  let subtitle = `You spent ${fmtDurationLower(top.minutes)} here, which is ${share}% of your screen time`;
  let body = `${appDisplay} was your go-to space today, accounting for ${share}% of your active screen time.`;

  if (highlight) {
    headline = `Focusing on ${highlight.topic} in ${appDisplay}`;
    subtitle = `You spent ${fmtDurationLower(top.minutes)} dedicated to this topic`;
    body = `You spent most of your digital flow in ${appDisplay} today, focusing particularly on ${highlight.topic}. This work accounted for ${share}% of your active screen time.`;
  }

  if (runner) {
    body += ` You also spent some quality time in ${displayApp(runner.name)} (${fmtDurationLower(runner.minutes)}).`;
  }
  body += ` In total, you checked in on ${summary.apps.length} different tools today to keep your day moving.`;

  return {
    id: "top-app",
    headline,
    subtitle,
    body,
    category: "PRODUCTIVITY",
    appName: top.name,
    priority: 80,
  };
}

// A "focus streak" = single app accumulating 45+ minutes in window data.
function focusStreakArticle(summary: ActivitySummary): Article | null {
  const appMinutes = new Map<string, number>();
  for (const w of summary.windows) {
    appMinutes.set(w.app_name, (appMinutes.get(w.app_name) ?? 0) + w.minutes);
  }

  let bestApp = "";
  let bestMinutes = 0;
  for (const [app, mins] of appMinutes) {
    if (mins > bestMinutes) {
      bestMinutes = mins;
      bestApp = app;
    }
  }

  if (bestMinutes < 45) return null;

  const appDisplay = displayApp(bestApp);
  const highlight = getAppHighlight(summary, bestApp);

  let headline = `Super focused: you spent ${Math.round(bestMinutes)} minutes in ${appDisplay}`;
  let subtitle = "Getting things done without any distractions";
  let body = `You got into a great flow today, spending a solid ${fmtDurationLower(bestMinutes)} focused purely on ${appDisplay}. This kind of deep focus is where your best ideas and work come to life.`;

  if (highlight) {
    headline = `Deep work: ${highlight.topic} in ${appDisplay}`;
    subtitle = `Focused session for ${fmtDurationLower(bestMinutes)}`;
    body = `You got into a great flow today in ${appDisplay}, spending a solid ${fmtDurationLower(bestMinutes)} focused purely on ${highlight.topic}. This kind of deep focus is where your best work comes to life.`;
  }

  return {
    id: "focus-streak",
    headline,
    subtitle,
    body,
    category: "FOCUS",
    appName: bestApp,
    priority: 90,
  };
}

function gamingArticle(summary: ActivitySummary): Article | null {
  const gameKeywords = ["fortnite", "roblox", "leagueoflegends", "league of legends", "valorant", "minecraft", "counterstrike", "steamwebhelper", "steam"];
  
  const activeGame = summary.apps.find((a) =>
    gameKeywords.some((g) => a.name.toLowerCase().includes(g))
  );

  if (!activeGame) return null;

  const gameName = displayApp(activeGame.name);
  const gameTexts = summary.key_texts.filter(
    (kt) => kt.app_name.toLowerCase().includes(activeGame.name.toLowerCase())
  );
  
  let victoryText = "";
  for (const kt of gameTexts) {
    const textLower = kt.text.toLowerCase();
    if (
      textLower.includes("victory") ||
      textLower.includes("won") ||
      textLower.includes("defeat") ||
      textLower.includes("level") ||
      textLower.includes("unlocked") ||
      textLower.includes("achievement")
    ) {
      victoryText = kt.text.trim();
      break;
    }
  }

  const headline = `Gaming session in ${gameName}`;
  const subtitle = `You spent ${fmtDurationLower(activeGame.minutes)} in the game`;
  
  let body = `You took some time for gaming today, playing ${gameName} for ${fmtDurationLower(activeGame.minutes)}.`;
  if (victoryText) {
    const cleanVictoryText = victoryText.replace(/\u2014/g, ",").replace(/\u2013/g, "-");
    body += ` The screen logs captured this memorable moment: "${cleanVictoryText}".`;
  } else {
    body += ` It was a good break to recharge your batteries before jumping back into your tasks.`;
  }

  return {
    id: "game-highlight",
    headline,
    subtitle,
    body,
    category: "MILESTONE",
    appName: activeGame.name,
    priority: 85,
  };
}

function appSwitchingArticle(summary: ActivitySummary): Article | null {
  const count = summary.apps.length;
  if (count < 5) return null;

  const headline = `A busy day: you hopped between ${count} tools`;
  const subtitle = "Keeping all plates spinning";
  const topThree = [...summary.apps]
    .sort((a, b) => b.minutes - a.minutes)
    .slice(0, 3)
    .map((a) => displayApp(a.name));
  const body = `You had a dynamic day, moving between ${count} different programs like ${topThree.join(", ")}. It shows you were handling a variety of tasks and keeping everything moving forward.`;

  return {
    id: "app-switching",
    headline,
    subtitle,
    body,
    category: "PRODUCTIVITY",
    priority: 60,
  };
}

interface Interval {
  start: number;
  end: number;
}

function meetingHeavyArticle(meetings: Meeting[]): Article | null {
  if (meetings.length === 0) return null;

  const intervals: Interval[] = [];
  for (const m of meetings) {
    if (!m.meeting_end) continue;
    const start = new Date(m.meeting_start).getTime();
    const end = new Date(m.meeting_end).getTime();
    if (end > start) {
      // Cap single meeting duration to 4 hours (14400000 ms) as a safeguard against stuck end times
      const duration = Math.min(end - start, 4 * 60 * 60 * 1000);
      intervals.push({ start, end: start + duration });
    }
  }

  if (intervals.length === 0) return null;

  // Sort intervals by start time
  intervals.sort((a, b) => a.start - b.start);

  const merged: Interval[] = [intervals[0]];
  for (let i = 1; i < intervals.length; i++) {
    const last = merged[merged.length - 1];
    const current = intervals[i];
    if (current.start <= last.end) {
      last.end = Math.max(last.end, current.end);
    } else {
      merged.push(current);
    }
  }

  let totalMinutes = 0;
  for (const interval of merged) {
    totalMinutes += (interval.end - interval.start) / 60_000;
  }

  if (totalMinutes < 60) return null;

  const headline = `Sharing ideas: you spent ${fmtDurationLower(totalMinutes)} in meetings`;
  const subtitle = `Connecting with your team across ${merged.length} discussions`;
  const body = `You spent a good portion of your day, ${fmtDurationLower(totalMinutes)}, in meetings and calls. It was a collaborative day focused on aligning with others, sharing thoughts, and planning ahead.`;

  return {
    id: "meeting-heavy",
    headline,
    subtitle,
    body,
    category: "COMMUNICATION",
    priority: 75,
  };
}

function lateNightArticle(summary: ActivitySummary): Article | null {
  const lateTexts = summary.key_texts.filter((kt) => {
    try {
      const hour = new Date(kt.timestamp).getHours();
      return hour >= 23 || hour < 4;
    } catch {
      return false;
    }
  });

  if (lateTexts.length === 0) return null;

  const latestTimestamp = lateTexts.reduce((latest, kt) => {
    return kt.timestamp > latest ? kt.timestamp : latest;
  }, lateTexts[0].timestamp);

  const latestHour = new Date(latestTimestamp).getHours();
  const timeLabel = latestHour >= 23 ? `${latestHour}:00` : `${latestHour}:00 AM`;

  const headline = "Burning the midnight oil";
  const subtitle = "Working late into the evening";
  const body = `You were up late tonight, with active screen time recorded past 11 PM. The latest check-in was around ${timeLabel}. Make sure to get some good rest so you're fresh and energized for tomorrow!`;

  return {
    id: "late-night",
    headline,
    subtitle,
    body,
    category: "NIGHT OWL",
    timestamp: latestTimestamp,
    priority: 70,
  };
}

function trendingWordsArticle(summary: ActivitySummary): Article | null {
  if (summary.key_texts.length === 0) return null;

  const freq = new Map<string, number>();
  for (const kt of summary.key_texts) {
    const words = kt.text
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length > 2 && !STOP_WORDS.has(w));

    for (const word of words) {
      freq.set(word, (freq.get(word) ?? 0) + 1);
    }
  }

  const sorted = [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  if (sorted.length < 3) return null;

  const topWords = sorted.map(([w]) => `'${w}'`);
  const headline = `What was on your mind: ${topWords.slice(0, 3).join(", ")}`;
  const subtitle = "The themes and topics that shaped your day";
  const body = `You spent a lot of time reading, writing, or searching about ${topWords.join(", ")} today. These topics defined the major areas of focus and interest throughout your day.`;

  return {
    id: "trending-words",
    headline,
    subtitle,
    body,
    category: "TRENDING",
    priority: 50,
  };
}

function audioArticle(summary: ActivitySummary): Article | null {
  if (!summary.audio_summary || summary.audio_summary.segment_count === 0) {
    return null;
  }

  const audio = summary.audio_summary;
  const speakerCount = audio.speakers.length;
  const headline = "A day filled with conversations";
  const subtitle = "Connecting and sharing ideas with others";

  let body = `Today you had some great discussions on your mic, captured across ${speakerCount === 1 ? "one speaker" : `${speakerCount} speakers`}.`;
  if (audio.top_transcriptions.length > 0) {
    const snippet = audio.top_transcriptions[0].transcription.slice(0, 80);
    body += ` Here's a quick highlight from what was said: "${snippet}…"`;
  }

  return {
    id: "audio-summary",
    headline,
    subtitle,
    body,
    category: "COMMUNICATION",
    priority: 55,
  };
}

function totalScreenTimeArticle(summary: ActivitySummary): Article | null {
  if (summary.total_frames === 0 && summary.total_active_minutes === 0) {
    return null;
  }

  const minutes = summary.total_active_minutes;
  const headline = `Another day of great work: you spent ${fmtDurationLower(minutes)} on screen`;
  const subtitle = "A full day of accomplishments and focus";
  const body = `You spent ${fmtDurationLower(minutes)} actively using your screen today across ${summary.apps.length} different ${summary.apps.length === 1 ? "tool" : "tools"}. Whether writing, browsing, or chatting, it was a productive journey from start to finish.`;

  return {
    id: "total-screen-time",
    headline,
    subtitle,
    body,
    category: "MILESTONE",
    priority: 40,
  };
}

// ---------------------------------------------------------------------------
// AI newsroom
// ---------------------------------------------------------------------------

const VALID_CATEGORIES: ArticleCategory[] = [
  "PRODUCTIVITY",
  "FOCUS",
  "COMMUNICATION",
  "NIGHT OWL",
  "TRENDING",
  "DISCOVERY",
  "MILESTONE",
];

/**
 * Filter raw OCR/accessibility text down to human-meaningful snippets.
 * Screen captures are full of icon glyphs, menu labels, and UI chrome:
 * none of which belongs in a news story.
 */
function cleanKeyTexts(
  texts: ActivitySummary["key_texts"],
  max = 40
): ActivitySummary["key_texts"] {
  const seen = new Set<string>();
  const cleaned = texts.filter((kt) => {
    const t = kt.text.trim();
    if (t.length < 8 || t.length > 400) return false;
    // Require a reasonable ratio of letters+spaces (drops glyph soup)
    const readable = (t.match(/[a-zA-Z\s0-9]/g) ?? []).length / t.length;
    if (readable < 0.6) return false;
    // Require at least 2 words
    if (t.split(/\s+/).length < 2) return false;
    const key = t.toLowerCase().slice(0, 80);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return cleaned.slice(0, max);
}

/** Compact, factual digest of the day handed to the LLM as source material. */
function buildActivityDigest(
  summary: ActivitySummary,
  meetings: Meeting[]
): string {
  const parts: string[] = [];

  parts.push(
    `TOTAL ACTIVE SCREEN TIME: ${Math.round(summary.total_active_minutes)} minutes across ${summary.apps.length} apps.`
  );

  const apps = [...summary.apps]
    .sort((a, b) => b.minutes - a.minutes)
    .slice(0, 10)
    .map((a) => `- ${displayApp(a.name)}: ${Math.round(a.minutes)} min`)
    .join("\n");
  if (apps) parts.push(`APP USAGE:\n${apps}`);

  const windows = [...summary.windows]
    .sort((a, b) => b.minutes - a.minutes)
    .slice(0, 20)
    .map(
      (w) =>
        `- [${displayApp(w.app_name)}] "${w.window_name}"${w.browser_url ? ` (${w.browser_url})` : ""}: ${Math.round(w.minutes)} min`
    )
    .join("\n");
  if (windows) parts.push(`WINDOW TITLES (what was actually open):\n${windows}`);

  const texts = cleanKeyTexts(summary.key_texts)
    .map(
      (kt) =>
        `- [${displayApp(kt.app_name)} @ ${new Date(kt.timestamp).toLocaleTimeString()}] ${kt.text.replace(/\s+/g, " ").trim()}`
    )
    .join("\n");
  if (texts) parts.push(`ON-SCREEN TEXT SNIPPETS (OCR, may be noisy):\n${texts}`);

  if (meetings.length > 0) {
    const m = meetings
      .slice(0, 8)
      .map(
        (mt) =>
          `- ${mt.title ?? "Untitled meeting"} (${displayApp(mt.meeting_app ?? "")} or unknown app) ${new Date(mt.meeting_start).toLocaleTimeString()}${mt.meeting_end ? ` to ${new Date(mt.meeting_end).toLocaleTimeString()}` : ""}`
      )
      .join("\n");
    parts.push(`MEETINGS:\n${m}`);
  }

  if (summary.audio_summary && summary.audio_summary.segment_count > 0) {
    const a = summary.audio_summary.top_transcriptions
      .slice(0, 5)
      .map(
        (t) =>
          `- [${t.speaker_name ?? "unknown speaker"}] ${t.transcription.replace(/\s+/g, " ").slice(0, 200)}`
      )
      .join("\n");
    parts.push(
      `AUDIO (${summary.audio_summary.segment_count} segments):\n${a}`
    );
  }

  return parts.join("\n\n");
}

const EDITOR_SYSTEM_PROMPT = `You are a highly intelligent daily-news editor (like Little Bird AI or Screenpipe AI) who turns one person's real computer activity into a short, human, easy-to-read daily chronicle written ABOUT that person. The digest you receive is a factual record of THEIR day: the programs they used, the windows/documents open, text on their screen (OCR), and their meetings/audio.

Tone: warm, welcoming, and personal: like a custom newspaper written for the reader themselves. No jargon, no technical terms, no file paths. Write the way a person would talk to a friend. Do not include any em-dashes or en-dashes in your output.

EDITORIAL RULES:
1. HUNT FOR REAL EVENTS & ACHIEVEMENTS:
   - Identify specific milestones achieved, files created/edited, Pull Requests merged, or git commits (e.g. "shipped feature X", "fixed bug Y" in VS Code/Cursor).
   - Find games played and specific achievements, wins, or match highlights (e.g. Fortnite Victory Royales, Roblox milestones, Roblox levels, game sessions).
   - Recognize key reading/research topics browsed in Microsoft Edge or Google Chrome (e.g. "researched the new LLM API", "read about astrophysics").
   - Lead with the single most meaningful human moment or achievement of the day as the front-page story.
2. Use ONLY facts present in the digest. Never invent programs, scores, names, people, or events. If the day's data is thin, write fewer, shorter stories rather than padding.
3. IGNORE clutter: icon labels, menu text, button names, file paths, code syntax, and fragments that don't describe what the person actually did or achieved.
4. Always speak directly to the reader as "you". Never use "the user", "the operator", "the subject", or "our correspondent".
5. Refer to programs by the friendly names already given in the digest (e.g. "Google Chrome", "Visual Studio Code", "Microsoft Teams", "Fortnite", "File Explorer"). Do not echo raw process/client names.
6. Each article's "appName" MUST be copied verbatim from an app name exactly as it appears in the digest (it is used to attach a screenshot of that program), or null if no program fits.
7. Vary the length of the stories: one detailed lead story, a few secondary stories, and a couple of brief notes to make the chronicle feel alive and polished.

OUTPUT: respond with ONLY a JSON array (no prose, no markdown) of 4 to 7 articles, most meaningful first:
[
  {
    "headline": "string, max 90 chars, friendly and clear",
    "subtitle": "string, one plain-sentence summary",
    "body": "string, 2 to 4 plain sentences written directly to the reader",
    "category": "one of PRODUCTIVITY | FOCUS | COMMUNICATION | NIGHT OWL | TRENDING | DISCOVERY | MILESTONE",
    "appName": "app name exactly as shown in the digest, or null"
  }
]`;

interface AiArticlePayload {
  headline?: unknown;
  subtitle?: unknown;
  body?: unknown;
  category?: unknown;
  appName?: unknown;
}

/**
 * Generate the day's edition with the user's configured chat LLM.
 * Returns null when no LLM is configured or the call/parse fails:
 * callers fall back to the local template engine.
 */
export async function generateArticlesAI(
  summary: ActivitySummary,
  meetings: Meeting[],
  settings: AppSettings | null
): Promise<Article[] | null> {
  if (!isAiConfigured(settings)) return null;

  const digest = buildActivityDigest(summary, meetings);
  if (digest.length < 80) return null; // not enough material for a real edition

  const systemPrompt =
    settings?.customPrompt && settings.customPrompt.trim().length > 10
      ? settings.customPrompt
      : EDITOR_SYSTEM_PROMPT;

  const raw = await chatCompletion(settings, [
    { role: "system", content: systemPrompt },
    { role: "user", content: `Today's digest:\n\n${digest}` },
  ]);
  if (!raw) return null;

  const parsed = extractJson<AiArticlePayload[]>(raw);
  if (!Array.isArray(parsed) || parsed.length === 0) return null;

  const knownApps = new Set(summary.apps.map((a) => a.name));
  const articles: Article[] = [];

  parsed.slice(0, MAX_ARTICLES).forEach((item, i) => {
    if (typeof item?.headline !== "string" || typeof item?.body !== "string") {
      return;
    }
    const category = VALID_CATEGORIES.includes(item.category as ArticleCategory)
      ? (item.category as ArticleCategory)
      : "TRENDING";
    const appName =
      typeof item.appName === "string" && knownApps.has(item.appName)
        ? item.appName
        : undefined;

    articles.push({
      id: `ai-${i}`,
      headline: item.headline.slice(0, 140),
      subtitle: typeof item.subtitle === "string" ? item.subtitle : "",
      body: item.body,
      category,
      appName,
      priority: 100 - i, // model already returns most newsworthy first
    });
  });

  return articles.length > 0 ? articles : null;
}

// ---------------------------------------------------------------------------
// Main entry points
// ---------------------------------------------------------------------------

/**
 * Analyse an ActivitySummary and generate up to 6 news-style articles
 * sorted by priority (most newsworthy first).
 */
export function generateArticles(
  summary: ActivitySummary,
  meetings: Meeting[]
): Article[] {
  const generators = [
    () => focusStreakArticle(summary),
    () => gamingArticle(summary),
    () => topAppArticle(summary),
    () => meetingHeavyArticle(meetings),
    () => lateNightArticle(summary),
    () => appSwitchingArticle(summary),
    () => audioArticle(summary),
    () => trendingWordsArticle(summary),
    () => totalScreenTimeArticle(summary),
  ];

  const articles: Article[] = [];
  for (const gen of generators) {
    const article = gen();
    if (article) articles.push(article);
  }

  articles.sort((a, b) => b.priority - a.priority);
  return articles.slice(0, MAX_ARTICLES);
}

/**
 * Attach real screenshot frames to articles by searching captured OCR frames
 * for each article's app within the time range. Runs lookups in parallel and
 * never throws: an article without a matching frame simply has no image.
 */
export async function attachFramesToArticles(
  articles: Article[],
  startTime: string,
  endTime: string
): Promise<Article[]> {
  const withApps = articles.filter((a) => a.appName);
  if (withApps.length === 0) return articles;

  const lookups = withApps.slice(0, 4).map(async (article) => {
    try {
      const res = await fetchSearch({
        contentType: "ocr",
        appName: article.appName,
        startTime,
        endTime,
        limit: 1,
      });
      const frameId = res.data[0]?.content.frame_id;
      if (frameId) {
        article.frameId = frameId;
        article.timestamp =
          article.timestamp ?? res.data[0].content.timestamp;
      }
    } catch {
      // No frame: the article still runs without an image.
    }
  });

  await Promise.all(lookups);
  return articles;
}
