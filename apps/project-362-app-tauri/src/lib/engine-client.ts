// Project 362: your days on screen, reported like news
//
// Client for the local capture engine HTTP API (127.0.0.1, auth handled by
// lib/api). All data stays on this machine.

import { localFetch, getApiBaseUrl, appendAuthToken } from "@/lib/api";

// ---------------------------------------------------------------------------
// Domain types
// ---------------------------------------------------------------------------

export interface AppUsage {
  name: string;
  frame_count: number;
  minutes: number;
  first_seen: string;
  last_seen: string;
}

export interface WindowUsage {
  app_name: string;
  window_name: string;
  browser_url?: string;
  minutes: number;
  frame_count: number;
}

export interface KeyText {
  text: string;
  app_name: string;
  window_name: string;
  timestamp: string;
}

export interface AudioSummary {
  segment_count: number;
  speakers: Array<{
    id: number;
    name: string | null;
    segment_count: number;
  }>;
  top_transcriptions: Array<{
    transcription: string;
    timestamp: string;
    speaker_name: string | null;
  }>;
}

export interface RecordingStatus {
  last_frame_at: string | null;
  last_audio_at: string | null;
  frames_in_range: number;
  audio_segments_in_range: number;
  recent_capture: boolean;
}

export interface Memory {
  id: number;
  content: string;
  source: string;
  tags: string[];
  importance: number;
  created_at: string;
}

export interface ActivitySummary {
  apps: AppUsage[];
  windows: WindowUsage[];
  key_texts: KeyText[];
  audio_summary: AudioSummary | null;
  total_frames: number;
  total_active_minutes: number;
  time_range: { start: string; end: string };
  data_status: string;
  recording: RecordingStatus | null;
  memories: Memory[];
}

export interface SearchResult {
  type: "OCR" | "Audio" | "Input" | "Memory";
  content: {
    frame_id?: number;
    chunk_id?: number;
    text?: string;
    transcription?: string;
    timestamp: string;
    app_name?: string;
    window_name?: string;
    browser_url?: string;
    device_name?: string;
    speaker?: { id: number; name: string | null };
  };
}

export interface SearchResponse {
  data: SearchResult[];
  pagination: { limit: number; offset: number; total: number };
}

export interface Meeting {
  id: number;
  meeting_start: string;
  meeting_end: string | null;
  meeting_app: string | null;
  title: string | null;
  attendees: string | null;
  note: string | null;
}

export interface HealthStatus {
  status: string; // "ok" | "degraded" | "error" | "unhealthy"
  last_frame_timestamp: string | null;
  last_audio_timestamp: string | null;
  frame_status: string;
  audio_status: string;
  version: string;
}

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

/**
 * Fetch the activity summary for a given time range, including apps, windows,
 * key texts, recording status, and memories.
 */
export async function fetchActivitySummary(
  startTime: string,
  endTime: string
): Promise<ActivitySummary> {
  const emptyResult: ActivitySummary = {
    apps: [],
    windows: [],
    key_texts: [],
    audio_summary: null,
    total_frames: 0,
    total_active_minutes: 0,
    time_range: { start: startTime, end: endTime },
    data_status: "error",
    recording: null,
    memories: [],
  };

  try {
    const params = new URLSearchParams({
      start_time: startTime,
      end_time: endTime,
      include_apps: "true",
      include_windows: "true",
      include_key_texts: "true",
      include_recording: "true",
      include_memories: "true",
      include_snippets: "false",
      include_guidance: "false",
    });

    const res = await localFetch(`/activity-summary?${params.toString()}`);
    if (!res.ok) {
      console.error(
        `[engine-client] fetchActivitySummary failed: ${res.status} ${res.statusText}`
      );
      return emptyResult;
    }
    return (await res.json()) as ActivitySummary;
  } catch (err) {
    console.error("[engine-client] fetchActivitySummary error:", err);
    return emptyResult;
  }
}

/**
 * Search across captured content (OCR, audio, input, memory).
 */
export async function fetchSearch(params: {
  q?: string;
  contentType?:
    | "all"
    | "ocr"
    | "audio"
    | "input"
    | "accessibility"
    | "memory";
  startTime?: string;
  endTime?: string;
  appName?: string;
  limit?: number;
  offset?: number;
}): Promise<SearchResponse> {
  const emptyResult: SearchResponse = {
    data: [],
    pagination: {
      limit: params.limit ?? 20,
      offset: params.offset ?? 0,
      total: 0,
    },
  };

  try {
    const qs = new URLSearchParams();
    if (params.q) qs.set("q", params.q);
    if (params.contentType) qs.set("content_type", params.contentType);
    if (params.startTime) qs.set("start_time", params.startTime);
    if (params.endTime) qs.set("end_time", params.endTime);
    if (params.appName) qs.set("app_name", params.appName);
    if (params.limit !== undefined) qs.set("limit", String(params.limit));
    if (params.offset !== undefined) qs.set("offset", String(params.offset));

    const res = await localFetch(`/search?${qs.toString()}`);
    if (!res.ok) {
      console.error(
        `[engine-client] fetchSearch failed: ${res.status} ${res.statusText}`
      );
      return emptyResult;
    }
    return (await res.json()) as SearchResponse;
  } catch (err) {
    console.error("[engine-client] fetchSearch error:", err);
    return emptyResult;
  }
}

/**
 * Build the authenticated URL for a frame thumbnail. Returns a plain URL
 * string suitable for `<img src={…}>`. Defaults to the highest quality the
 * thumbnail endpoint allows (1920px wide, JPEG quality 95) - the UI shows
 * captures at full display quality; low-res is only for constrained uses.
 */
export function getFrameThumbnailUrl(
  frameId: number,
  width: number = 1920,
  quality: number = 95
): string {
  const base = `${getApiBaseUrl()}/frames/${frameId}/thumbnail`;
  const url = `${base}?width=${width}&quality=${quality}`;
  return appendAuthToken(url);
}

/**
 * Build the authenticated URL for the ORIGINAL frame image (native
 * resolution, no thumbnail downscaling). Use for full-quality display.
 */
export function getFrameImageUrl(frameId: number): string {
  return appendAuthToken(`${getApiBaseUrl()}/frames/${frameId}`);
}

/**
 * Fetch meetings within a time range.
 */
export async function fetchMeetings(
  startTime: string,
  endTime: string
): Promise<Meeting[]> {
  try {
    const params = new URLSearchParams({
      start_time: startTime,
      end_time: endTime,
    });

    const res = await localFetch(`/meetings?${params.toString()}`);
    if (!res.ok) {
      console.error(
        `[engine-client] fetchMeetings failed: ${res.status} ${res.statusText}`
      );
      return [];
    }
    return (await res.json()) as Meeting[];
  } catch (err) {
    console.error("[engine-client] fetchMeetings error:", err);
    return [];
  }
}

/**
 * Fetch overall health status from the local capture engine.
 *
 * IMPORTANT: the /health endpoint returns HTTP 503 when the engine is
 * "degraded" (e.g. an audio device hiccup) while screen capture is still
 * fully operational. The 503 body still contains the complete health JSON,
 * so we always try to parse the body regardless of the HTTP status code.
 * Treating 503 as "engine offline" was the bug that blanked the whole app.
 */
export async function fetchHealth(): Promise<HealthStatus> {
  const fallback: HealthStatus = {
    status: "error",
    last_frame_timestamp: null,
    last_audio_timestamp: null,
    frame_status: "unknown",
    audio_status: "unknown",
    version: "unknown",
  };

  try {
    const res = await localFetch("/health");
    const data = (await res.json().catch(() => null)) as HealthStatus | null;
    if (data && typeof data.status === "string") {
      return data;
    }
    console.error(
      `[engine-client] fetchHealth: unparseable response (${res.status})`
    );
    return fallback;
  } catch (err) {
    console.error("[engine-client] fetchHealth error:", err);
    return fallback;
  }
}

/**
 * True when the engine responded at all: "ok" and "degraded" both mean the
 * engine process is alive. Only a network failure / unparseable response
 * ("error") means it is actually offline.
 */
export function isEngineRunning(health: HealthStatus): boolean {
  return health.status !== "error";
}

/**
 * True when screen frames are actively being captured.
 */
export function isCapturingFrames(health: HealthStatus): boolean {
  return health.frame_status === "ok" || health.last_frame_timestamp !== null;
}

/**
 * Purge self-activity from the daily/monthly activity summaries.
 * Filters out Project 362 and Screenpipe app names from the record.
 */
export function filterSelfActivity(summary: ActivitySummary): ActivitySummary {
  const selfNames = new Set([
    "project-362",
    "project_362",
    "screenpipe",
    "project-362-app-tauri",
    "project-362-app-tauri.exe",
    "project_362.exe"
  ]);

  const filteredApps = summary.apps.filter(
    (a) => !selfNames.has(a.name.toLowerCase())
  );

  const filteredWindows = summary.windows.filter(
    (w) =>
      !selfNames.has(w.app_name.toLowerCase()) &&
      !selfNames.has(w.window_name.toLowerCase())
  );

  const filteredKeyTexts = summary.key_texts.filter(
    (kt) => !selfNames.has(kt.app_name.toLowerCase())
  );

  const totalActiveMinutes = filteredApps.reduce((sum, a) => sum + a.minutes, 0);

  return {
    ...summary,
    apps: filteredApps,
    windows: filteredWindows,
    key_texts: filteredKeyTexts,
    total_active_minutes: totalActiveMinutes,
  };
}
