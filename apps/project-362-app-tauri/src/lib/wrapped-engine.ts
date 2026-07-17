// Project 362: your days on screen, reported like news
//
// Computes "Wrapped" statistics: a periodic recap (month / year) of your
// on-screen life, distilled into stats, top apps, and a personality.

import type { ActivitySummary, Meeting } from "./engine-client";
import { displayApp } from "./app-display";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WrappedPersonality {
  label: string;
  description: string;
}

export interface WrappedStats {
  periodLabel: string; // e.g. "July 2026" or "2026"
  totalMinutes: number;
  totalDays: number; // days with activity
  topApps: Array<{ name: string; minutes: number; percentage: number }>; // top 5
  focusScore: number; // 0-100
  lateNightMinutes: number; // minutes of activity after 11pm
  totalMeetings: number;
  totalMeetingHours: number;
  topKeywords: string[]; // top 10 words
  personality: WrappedPersonality;
  longestDay: { date: string; hours: number } | null;
}

// ---------------------------------------------------------------------------
// Stop words (same set as headline engine, kept local to avoid coupling)
// ---------------------------------------------------------------------------

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

// Apps commonly recognised as IDEs / code editors
const IDE_APPS = new Set([
  "code", "vscode", "visual studio code", "cursor", "windsurf",
  "intellij", "webstorm", "pycharm", "goland", "rider", "clion",
  "android studio", "xcode", "neovim", "vim", "emacs", "sublime text",
  "zed", "fleet", "nova",
]);

// Apps commonly recognised as browsers
const BROWSER_APPS = new Set([
  "chrome", "google chrome", "firefox", "safari", "edge",
  "microsoft edge", "brave", "arc", "opera", "vivaldi",
]);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Normalise an app name for pattern matching. */
function normaliseApp(name: string): string {
  return name.replace(/\.exe$/i, "").replace(/[_-]/g, " ").toLowerCase().trim();
}

/** Compute focus score: share of top app in total active time, 0-100. */
function computeFocusScore(summary: ActivitySummary): number {
  if (summary.total_active_minutes === 0 || summary.apps.length === 0) return 0;
  const sorted = [...summary.apps].sort((a, b) => b.minutes - a.minutes);
  const topMinutes = sorted[0].minutes;
  return Math.min(100, Math.round((topMinutes / summary.total_active_minutes) * 100));
}

/** Estimate late-night minutes from key_texts timestamps. */
function computeLateNightMinutes(summary: ActivitySummary): number {
  const lateTexts = summary.key_texts.filter((kt) => {
    try {
      const hour = new Date(kt.timestamp).getHours();
      return hour >= 23 || hour < 4;
    } catch {
      return false;
    }
  });

  return lateTexts.length; // 1 capture frame roughly corresponds to 1 active minute
}

/** Extract top N keywords from key_texts. */
function extractTopKeywords(summary: ActivitySummary, n: number): string[] {
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

  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([w]) => w);
}

interface Interval {
  start: number;
  end: number;
}

/** Compute total meeting hours using interval merging to avoid overlapping double-counts. */
function computeMeetingStats(meetings: Meeting[]): {
  totalMeetings: number;
  totalMeetingHours: number;
} {
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

  if (intervals.length === 0) {
    return {
      totalMeetings: 0,
      totalMeetingHours: 0,
    };
  }

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

  return {
    totalMeetings: merged.length,
    totalMeetingHours: Math.round((totalMinutes / 60) * 10) / 10,
  };
}

/** Count unique days with activity based on key_texts timestamps. */
function countActiveDays(summary: ActivitySummary): number {
  const days = new Set<string>();

  for (const kt of summary.key_texts) {
    try {
      const d = new Date(kt.timestamp);
      days.add(d.toISOString().slice(0, 10)); // YYYY-MM-DD
    } catch {
      // skip malformed timestamps
    }
  }

  if (days.size === 0 && summary.total_active_minutes > 0) return 1;
  return days.size;
}

/** Find the day with the longest total activity. */
function findLongestDay(
  summary: ActivitySummary
): { date: string; hours: number } | null {
  const dayMinutes = new Map<string, number>();

  for (const app of summary.apps) {
    try {
      const day = new Date(app.first_seen).toISOString().slice(0, 10);
      dayMinutes.set(day, (dayMinutes.get(day) ?? 0) + app.minutes);
    } catch {
      // skip
    }
  }

  if (dayMinutes.size === 0) return null;

  let bestDay = "";
  let bestMins = 0;
  for (const [day, mins] of dayMinutes) {
    if (mins > bestMins) {
      bestMins = mins;
      bestDay = day;
    }
  }

  return bestDay
    ? { date: bestDay, hours: Math.round((bestMins / 60) * 10) / 10 }
    : null;
}

/** Determine personality archetype based on usage patterns. */
function determinePersonality(
  summary: ActivitySummary,
  meetingStats: { totalMeetings: number; totalMeetingHours: number },
  focusScore: number,
  lateNightHours: number
): WrappedPersonality {
  const topApp =
    summary.apps.length > 0
      ? [...summary.apps].sort((a, b) => b.minutes - a.minutes)[0]
      : null;

  const topAppNorm = topApp ? normaliseApp(topApp.name) : "";

  if (topApp && IDE_APPS.has(topAppNorm)) {
    return {
      label: "The Deep Worker",
      description:
        "You spend most of your digital time in code editors and IDEs, building, debugging, and creating. Your screen is your workshop.",
    };
  }

  if (topApp && BROWSER_APPS.has(topAppNorm) && summary.windows.length > 10) {
    return {
      label: "The Explorer",
      description:
        "Tabs upon tabs: you're a relentless researcher and web navigator. The internet is your playground and your office.",
    };
  }

  if (meetingStats.totalMeetings >= 3 || meetingStats.totalMeetingHours >= 2) {
    return {
      label: "The Communicator",
      description:
        "Meetings, calls, and conversations fill your day. You're the glue that holds teams together.",
    };
  }

  if (lateNightHours > 5) {
    return {
      label: "The Night Owl",
      description:
        "When the world sleeps, you're still going. Late-night sessions are where your best ideas emerge.",
    };
  }

  if (focusScore > 70) {
    return {
      label: "The Laser",
      description:
        "Distraction-proof and locked in: your ability to concentrate on a single tool is remarkable.",
    };
  }

  return {
    label: "The Digital Native",
    description:
      "A well-rounded digital citizen who fluidly moves between tools, tasks, and contexts throughout the day.",
  };
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Compute Wrapped / period-in-review statistics from an activity summary and
 * meeting data for a given period.
 */
export function computeWrappedStats(
  summary: ActivitySummary,
  meetings: Meeting[],
  periodLabel: string
): WrappedStats {
  const totalMinutes = summary.total_active_minutes;

  const sortedApps = [...summary.apps].sort((a, b) => b.minutes - a.minutes);
  const topApps = sortedApps.slice(0, 5).map((app) => ({
    name: displayApp(app.name),
    minutes: app.minutes,
    percentage:
      summary.total_active_minutes > 0
        ? Math.round((app.minutes / summary.total_active_minutes) * 100)
        : 0,
  }));

  const focusScore = computeFocusScore(summary);
  const lateNightMinutes = computeLateNightMinutes(summary);
  const meetingStats = computeMeetingStats(meetings);
  const topKeywords = extractTopKeywords(summary, 10);
  const totalDays = countActiveDays(summary);
  const longestDay = findLongestDay(summary);
  const personality = determinePersonality(
    summary,
    meetingStats,
    focusScore,
    lateNightMinutes / 60
  );

  return {
    periodLabel,
    totalMinutes,
    totalDays,
    topApps,
    focusScore,
    lateNightMinutes,
    totalMeetings: meetingStats.totalMeetings,
    totalMeetingHours: meetingStats.totalMeetingHours,
    topKeywords,
    personality,
    longestDay,
  };
}
