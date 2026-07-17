// Project 362: your days on screen, reported like news

import React, { useState, useEffect } from "react";
import { useSettings } from "./hooks/use-settings";
import {
  fetchActivitySummary,
  fetchHealth,
  fetchMeetings,
  fetchSearch,
  isEngineRunning,
  isCapturingFrames,
  filterSelfActivity,
} from "./lib/engine-client";
import type { ActivitySummary, HealthStatus } from "./lib/engine-client";
import {
  generateArticles,
  generateArticlesAI,
  attachFramesToArticles,
} from "./lib/headline-engine";
import type { Article } from "./lib/headline-engine";
import { computeWrappedStats } from "./lib/wrapped-engine";
import type { WrappedStats } from "./lib/wrapped-engine";
import { displayApp } from "./lib/app-display";

// UI Components
import { Masthead } from "./components/Masthead";
import { ArticleCard } from "./components/ArticleCard";
import { FocusMeter } from "./components/FocusMeter";
import { ActiveApps } from "./components/ActiveApps";
import { ScreenCapture } from "./components/ScreenCapture";
import { WrappedSlide } from "./components/WrappedSlide";
import { EmptyState } from "./components/EmptyState";
import { SettingsModal } from "./components/SettingsModal";

// Icons
import { Minimize2 } from "lucide-react";

const TOTAL_WRAPPED_SLIDES = 5;

function dayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  return Math.floor((date.getTime() - start.getTime()) / 86_400_000);
}

export default function App() {
  const { apiConfig, settings, loading: settingsLoading, saveSettings } = useSettings();

  // Read if starting in native desktop widget window mode
  const isWidgetUrl = typeof window !== "undefined" && window.location.search.includes("view=widget");
  const [isWidgetMode, setIsWidgetMode] = useState(isWidgetUrl);

  const [activeView, setActiveView] = useState<"chronicle" | "wrapped">(
    "chronicle"
  );
  // Separate render view to allow delayed transitions for fade-out animations
  const [renderView, setRenderView] = useState<"chronicle" | "wrapped">("chronicle");
  const [transitionState, setTransitionState] = useState<"idle" | "leaving" | "entering">("idle");

  const [date, setDate] = useState<Date>(new Date());
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [hasHistoryBefore, setHasHistoryBefore] = useState(true);
  const [lastArticleHeadlines, setLastArticleHeadlines] = useState<string[]>([]);

  // Data states
  const [loading, setLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isBackendRunning, setIsBackendRunning] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [, setHealth] = useState<HealthStatus | null>(null);

  // Daily edition states
  const [summary, setSummary] = useState<ActivitySummary | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [recentFrame, setRecentFrame] = useState<{
    id: number;
    appName: string;
    timestamp: string;
  } | null>(null);

  // Wrapped states
  const [wrappedStats, setWrappedStats] = useState<WrappedStats | null>(null);
  const [currentWrappedSlide, setCurrentWrappedSlide] = useState(0);

  // Make body background transparent when in widget URL mode
  useEffect(() => {
    if (isWidgetUrl && typeof document !== "undefined") {
      document.body.style.backgroundColor = "transparent";
      document.documentElement.style.backgroundColor = "transparent";
    }
  }, [isWidgetUrl]);

  const notifyHighlight = async (title: string, body: string) => {
    try {
      if (typeof window !== "undefined" && "Notification" in window) {
        if (Notification.permission === "granted") {
          new Notification(title, { body });
        } else if (Notification.permission !== "denied") {
          const permission = await Notification.requestPermission();
          if (permission === "granted") {
            new Notification(title, { body });
          }
        }
      }
    } catch (err) {
      console.warn("Failed to trigger notification:", err);
    }
  };

  const handleViewChange = (newView: "chronicle" | "wrapped") => {
    if (newView === renderView) return;
    setTransitionState("leaving");
    setTimeout(() => {
      setActiveView(newView);
      setRenderView(newView);
      setCurrentWrappedSlide(0);
      setTransitionState("entering");
      setTimeout(() => {
        setTransitionState("idle");
      }, 300);
    }, 300);
  };

  const toggleWidgetMode = async () => {
    try {
      const { WebviewWindow } = await import("@tauri-apps/api/webviewWindow");

      if (isWidgetUrl) {
        // Expand: show main window (labeled "home") and close this widget window
        const mainWin = await WebviewWindow.getByLabel("home");
        if (mainWin) {
          await mainWin.show();
          await mainWin.setFocus();
        }
        const { getCurrentWebviewWindow } = await import("@tauri-apps/api/webviewWindow");
        const widgetWin = getCurrentWebviewWindow();
        await widgetWin.close();
      } else {
        // Shrink: open widget window and hide main window
        const existing = await WebviewWindow.getByLabel("desktop-widget");
        if (existing) {
          await existing.show();
          await existing.setFocus();
        } else {
          new WebviewWindow("desktop-widget", {
            url: "/index.html?view=widget",
            title: "Project 362 Widget",
            width: 330,
            height: 520,
            decorations: false,
            transparent: true,
            alwaysOnBottom: true,
            skipTaskbar: true,
            resizable: true,
            minWidth: 260,
            minHeight: 300,
          });
        }
        const { getCurrentWebviewWindow } = await import("@tauri-apps/api/webviewWindow");
        const mainWin = getCurrentWebviewWindow();
        await mainWin.hide();
      }
    } catch (err) {
      console.error("Failed to toggle desktop widget window:", err);
      setIsWidgetMode(!isWidgetMode);
    }
  };

  const loadData = async () => {
    if (isInitialLoad) {
      setLoading(true);
    }
    try {
      // 1. Verify health of the local capture engine. NOTE: "degraded"
      // (e.g. an audio hiccup) still means the engine is alive and
      // capturing the screen: never blank the app for it.
      const healthData = await fetchHealth();
      setHealth(healthData);
      const running = isEngineRunning(healthData);
      setIsBackendRunning(running);
      setIsCapturing(isCapturingFrames(healthData));

      if (!running) {
        setLoading(false);
        setIsInitialLoad(false);
        return;
      }

      if (activeView === "chronicle") {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);
        const startISO = startOfDay.toISOString();
        const endISO = endOfDay.toISOString();

        const [summaryData, meetingsData, searchData, prevCheck] = await Promise.all([
          fetchActivitySummary(startISO, endISO),
          fetchMeetings(startISO, endISO),
          fetchSearch({
            contentType: "ocr",
            startTime: startISO,
            endTime: endISO,
            limit: 1,
          }),
          fetchSearch({
            contentType: "ocr",
            endTime: startISO,
            limit: 1,
          }),
        ]);

        setHasHistoryBefore(prevCheck.data.length > 0);

        const filteredSummary = filterSelfActivity(summaryData);
        setSummary(filteredSummary);

        // Write the edition with the user's configured chat LLM.
        // Falls back to the local template engine only when no AI
        // provider is configured or the call fails.
        const aiArticles = await generateArticlesAI(
          filteredSummary,
          meetingsData,
          settings
        );
        const generated =
          aiArticles ?? generateArticles(filteredSummary, meetingsData);
        const withFrames = await attachFramesToArticles(
          generated,
          startISO,
          endISO
        );
        setArticles([...withFrames]);

        // Compare with previous articles to trigger notifications for new highlights
        if (withFrames.length > 0) {
          const currentHeadlines = withFrames.map((a) => a.headline);
          if (lastArticleHeadlines.length > 0) {
            const newStories = withFrames.filter(
              (a) => !lastArticleHeadlines.includes(a.headline)
            );
            if (newStories.length > 0) {
              const topNew = newStories[0];
              notifyHighlight(
                topNew.headline,
                topNew.subtitle || topNew.body.slice(0, 120)
              );
            }
          }
          setLastArticleHeadlines(currentHeadlines);
        }

        // Populate most recent screen capture frame
        const item = searchData.data[0];
        if (item?.content.frame_id) {
          setRecentFrame({
            id: item.content.frame_id,
            appName: item.content.app_name || "Unknown App",
            timestamp: item.content.timestamp,
          });
        } else {
          setRecentFrame(null);
        }
      } else {
        // Wrapped data for the current month
        const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
        const endOfMonth = new Date(
          date.getFullYear(),
          date.getMonth() + 1,
          0,
          23,
          59,
          59,
          999
        );
        const startISO = startOfMonth.toISOString();
        const endISO = endOfMonth.toISOString();

        const [summaryData, meetingsData] = await Promise.all([
          fetchActivitySummary(startISO, endISO),
          fetchMeetings(startISO, endISO),
        ]);

        const filteredSummary = filterSelfActivity(summaryData);
        const periodLabel = date.toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
        });
        const stats = computeWrappedStats(
          filteredSummary,
          meetingsData,
          periodLabel
        );
        setWrappedStats(stats);
      }
    } catch (err) {
      console.error("Failed to load edition data:", err);
    } finally {
      setLoading(false);
      setIsInitialLoad(false);
    }
  };

  // Reload when date or view mode changes
  useEffect(() => {
    if (!settingsLoading && apiConfig) {
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, activeView, settingsLoading, apiConfig]);

  // Set up auto-refresh every 60 seconds when looking at today
  useEffect(() => {
    const isToday = date.toDateString() === new Date().toDateString();
    if (!settingsLoading && apiConfig && isToday && activeView === "chronicle") {
      const interval = setInterval(() => {
        loadData();
      }, 60000);
      return () => clearInterval(interval);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, activeView, settingsLoading, apiConfig]);

  const handlePrevDay = () => {
    const prev = new Date(date);
    prev.setDate(prev.getDate() - 1);
    setDate(prev);
  };

  const handleNextDay = () => {
    const next = new Date(date);
    next.setDate(next.getDate() + 1);
    if (next <= new Date()) {
      setDate(next);
    }
  };

  const isToday = date.toDateString() === new Date().toDateString();

  const hasData =
    activeView === "chronicle"
      ? summary &&
        (summary.total_active_minutes > 0 ||
          summary.total_frames > 0 ||
          summary.apps.length > 0)
      : wrappedStats &&
        (wrappedStats.totalMinutes > 0 || wrappedStats.topApps.length > 0);

  if (settingsLoading || (loading && isInitialLoad)) {
    return (
      <div className="min-h-screen bg-canvas p-[clamp(16px,3vw,32px)]">
        <div className="bg-surface rounded-frame max-md:rounded-frame-sm border-hairline border-charcoal max-w-[min(100%,1320px)] mx-auto min-h-[80vh] flex items-center justify-center p-[clamp(20px,4vw,40px)]">
          <div className="text-center">
            <p className="p362-eyebrow text-charcoal flex items-center justify-center gap-2 mb-4">
              <span className="p362-diamond" aria-hidden="true" />
              Project 362
            </p>
            <h2 className="p362-display text-charcoal text-[34px] mb-6">
              Pressing today&apos;s edition…
            </h2>
            <div
              className="w-10 h-10 rounded-full border-hairline border-charcoal border-t-orange animate-spin mx-auto"
              style={{ borderTopColor: "var(--orange)", borderTopWidth: "3px" }}
            />
          </div>
        </div>
      </div>
    );
  }

  // Native widget window view wrapper (Transparent borderless desktop widget)
  if (isWidgetUrl) {
    return (
      <div className="w-screen h-screen flex flex-col p-3 bg-transparent overflow-hidden select-none cursor-move box-border" data-tauri-drag-region>
        <div className="flex flex-col flex-grow items-stretch justify-between p-4 bg-canvas/95 border-hairline border-charcoal rounded-card shadow-xl cursor-move min-h-0 box-border overflow-hidden animate-stagger-1" data-tauri-drag-region>
          <div className="w-full space-y-3 flex-grow flex flex-col min-h-0" data-tauri-drag-region>
            {/* Widget Header with compact indicator */}
            <div className="flex items-center justify-between pb-2 border-b border-charcoal/20 cursor-move" data-tauri-drag-region>
              <div className="flex items-center gap-1.5" data-tauri-drag-region>
                <span className="p362-diamond bg-charcoal w-1.5 h-1.5" aria-hidden="true" />
                <span className="p362-eyebrow text-charcoal text-[10px]" data-tauri-drag-region>Project 362</span>
                <span className="p362-eyebrow text-ink text-[10px]" data-tauri-drag-region>Widget</span>
              </div>
              <button
                onClick={toggleWidgetMode}
                className="w-5 h-5 rounded-full border-hairline border-charcoal bg-tan-soft text-charcoal flex items-center justify-center cursor-pointer hover:bg-charcoal hover:text-surface"
                title="Exit Widget Mode"
              >
                <Minimize2 size={10} />
              </button>
            </div>

            {/* Widget Date navigator */}
            <div className="flex items-center justify-between gap-2 py-1.5 border-b border-charcoal/10">
              <button
                onClick={handlePrevDay}
                disabled={!hasHistoryBefore}
                className={`text-[10px] p362-pill px-2.5 py-0.5 bg-surface text-charcoal cursor-pointer ${
                  !hasHistoryBefore ? "opacity-45 cursor-not-allowed" : ""
                }`}
              >
                Prev
              </button>
              <span className="font-sans text-[11px] text-charcoal font-semibold select-none">
                {date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
              <button
                onClick={handleNextDay}
                disabled={isToday}
                className="text-[10px] p362-pill px-2.5 py-0.5 bg-surface text-charcoal cursor-pointer"
              >
                Next
              </button>
            </div>

            {/* Middle scrollable content */}
            <div className="w-full flex-grow flex flex-col overflow-y-auto space-y-3 pr-1 py-2 min-h-0 cursor-default" data-tauri-drag-region>
              {/* Focus score progress ring */}
              {summary && (
                <div className="flex flex-col items-center justify-center p-3 border-hairline border-charcoal bg-surface py-3 rounded-card">
                  <p className="p362-eyebrow text-charcoal text-[10px] mb-1.5">Focus Score</p>
                  <div className="relative w-20 h-20 flex items-center justify-center rounded-full border-hairline border-charcoal bg-tan-soft">
                    <span className="p362-display text-charcoal text-[28px] tabular-nums font-bold leading-none">
                      {summary.total_active_minutes > 0
                        ? Math.round(
                            ((summary.apps[0]?.minutes ?? 0) /
                              summary.total_active_minutes) *
                              100
                          ) || 50
                        : 50}
                    </span>
                  </div>
                </div>
              )}

              {/* Top active apps list */}
              {summary && (
                <div className="p-3 border-hairline border-charcoal bg-surface rounded-card">
                  <p className="p362-eyebrow text-charcoal text-[10px] mb-1.5">Top Apps</p>
                  <div className="space-y-1">
                    {summary.apps.slice(0, 3).map((app, idx) => (
                      <div key={app.name} className="flex justify-between items-center text-[11px] font-sans text-charcoal">
                        <span className="font-semibold">{idx + 1}. {displayApp(app.name)}</span>
                        <span className="text-ink">{Math.round(app.minutes)}m</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Daily Lead highlight */}
              {articles.length > 0 && (
                <div className="p-3 border-hairline border-charcoal bg-tan rounded-card flex-grow overflow-hidden min-h-[100px]">
                  <span className="p362-eyebrow inline-flex items-center gap-1.5 text-charcoal text-[10px] mb-1.5">
                    <span className="p362-diamond" aria-hidden="true" />
                    <span>Highlight</span>
                  </span>
                  <h3 className="p362-display text-charcoal text-[15px] mb-0.5 leading-snug line-clamp-2">
                    {articles[0].headline}
                  </h3>
                  <p className="font-sans text-[10px] text-ink line-clamp-3">
                    {articles[0].body}
                  </p>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={toggleWidgetMode}
            className="p362-pill bg-charcoal text-surface w-full justify-center py-2 text-[12px] font-semibold cursor-pointer"
          >
            Expand View
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-canvas p-[clamp(16px,3vw,32px)] box-border flex flex-col overflow-hidden">
      <div className="bg-surface rounded-frame max-md:rounded-frame-sm border-hairline border-charcoal max-w-[min(100%,1320px)] w-full mx-auto flex flex-col p-[clamp(20px,4vw,40px)] h-full overflow-hidden box-border">
        {/* Header and controls */}
        <Masthead
          date={date}
          edition={dayOfYear(date)}
          activeView={renderView}
          onViewChange={handleViewChange}
          onRefresh={loadData}
          onOpenSettings={() => setShowSettingsModal(true)}
          onToggleWidget={toggleWidgetMode}
          isWidgetMode={isWidgetMode}
          loading={loading}
        />

        <main className="flex-grow flex flex-col relative min-h-0">
          {/* Date navigator for the Daily Edition: remains mounted and transitions opacity so it is layout static */}
          {isBackendRunning && (
            <div className={`flex flex-wrap items-center justify-between gap-3 py-4 transition-opacity duration-300 ${
              renderView === "chronicle" ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}>
              <button
                onClick={handlePrevDay}
                disabled={!hasHistoryBefore}
                className={`p362-pill bg-surface text-charcoal ${
                  !hasHistoryBefore ? "opacity-45 cursor-not-allowed" : ""
                }`}
              >
                ← Previous day
              </button>
              <span className="p362-eyebrow text-charcoal text-center">
                {isToday ? "Today's Edition" : "Archive Edition"}
              </span>
              <button
                onClick={handleNextDay}
                disabled={isToday}
                className="p362-pill bg-surface text-charcoal"
              >
                Next day →
              </button>
            </div>
          )}

          {/* Main view area */}
          {!isBackendRunning || !hasData ? (
            <EmptyState
              isBackendRunning={isBackendRunning}
              isCapturing={isCapturing}
              onRetry={loadData}
            />
          ) : isWidgetMode ? (
            /* Inline Widget Mode fallback inside main window */
            <div className="flex-grow flex items-center justify-center py-4 min-h-0">
              <div className="w-full max-w-[330px] h-[480px] border-hairline border-charcoal bg-canvas/95 p-4 rounded-card shadow-lg flex flex-col justify-between min-h-0 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between pb-2 border-b border-charcoal/20">
                  <div className="flex items-center gap-1.5">
                    <span className="p362-diamond bg-charcoal w-1.5 h-1.5" aria-hidden="true" />
                    <span className="p362-eyebrow text-charcoal text-[10px]">Project 362</span>
                    <span className="p362-eyebrow text-ink text-[10px]">Widget</span>
                  </div>
                  <button
                    onClick={toggleWidgetMode}
                    className="w-5 h-5 rounded-full border-hairline border-charcoal bg-tan-soft text-charcoal flex items-center justify-center cursor-pointer hover:bg-charcoal hover:text-surface"
                    title="Exit Widget Mode"
                  >
                    <Minimize2 size={10} />
                  </button>
                </div>

                {/* Widget Date navigator */}
                <div className="flex items-center justify-between gap-2 py-1.5 border-b border-charcoal/10">
                  <button
                    onClick={handlePrevDay}
                    disabled={!hasHistoryBefore}
                    className={`text-[10px] p362-pill px-2.5 py-0.5 bg-surface text-charcoal cursor-pointer ${
                      !hasHistoryBefore ? "opacity-45 cursor-not-allowed" : ""
                    }`}
                  >
                    Prev
                  </button>
                  <span className="font-sans text-[11px] text-charcoal font-semibold select-none">
                    {date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                  <button
                    onClick={handleNextDay}
                    disabled={isToday}
                    className="text-[10px] p362-pill px-2.5 py-0.5 bg-surface text-charcoal cursor-pointer"
                  >
                    Next
                  </button>
                </div>

                {/* Middle scrollable content */}
                <div className="w-full flex-grow flex flex-col overflow-y-auto space-y-3 pr-1 py-2 min-h-0">
                  {/* Focus score card */}
                  {summary && (
                    <div className="flex flex-col items-center justify-center p-3 border-hairline border-charcoal bg-surface py-3 rounded-card">
                      <p className="p362-eyebrow text-charcoal text-[10px] mb-1.5">Focus Score</p>
                      <div className="relative w-20 h-20 flex items-center justify-center rounded-full border-hairline border-charcoal bg-tan-soft">
                        <span className="p362-display text-charcoal text-[28px] tabular-nums font-bold leading-none">
                          {summary.total_active_minutes > 0
                            ? Math.round(
                                ((summary.apps[0]?.minutes ?? 0) /
                                  summary.total_active_minutes) *
                                  100
                              ) || 50
                            : 50}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Top active apps list */}
                  {summary && (
                    <div className="p-3 border-hairline border-charcoal bg-surface rounded-card">
                      <p className="p362-eyebrow text-charcoal text-[10px] mb-1.5">Top Apps</p>
                      <div className="space-y-1">
                        {summary.apps.slice(0, 3).map((app, idx) => (
                          <div key={app.name} className="flex justify-between items-center text-[11px] font-sans text-charcoal">
                            <span className="font-semibold">{idx + 1}. {displayApp(app.name)}</span>
                            <span className="text-ink">{Math.round(app.minutes)}m</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Daily Lead highlight */}
                  {articles.length > 0 && (
                    <div className="p-3 border-hairline border-charcoal bg-tan rounded-card flex-grow overflow-hidden min-h-[100px]">
                      <span className="p362-eyebrow inline-flex items-center gap-1.5 text-charcoal text-[10px] mb-1.5">
                        <span className="p362-diamond" aria-hidden="true" />
                        <span>Highlight</span>
                      </span>
                      <h3 className="p362-display text-charcoal text-[15px] mb-0.5 leading-snug line-clamp-2">
                        {articles[0].headline}
                      </h3>
                      <p className="font-sans text-[10px] text-ink line-clamp-3">
                        {articles[0].body}
                      </p>
                    </div>
                  )}
                </div>

                <button
                  onClick={toggleWidgetMode}
                  className="p362-pill bg-charcoal text-surface w-full justify-center py-2 text-[12px] font-semibold cursor-pointer"
                >
                  Expand View
                </button>
              </div>
            </div>
          ) : renderView === "chronicle" ? (
            /* Daily Edition: asymmetric bento */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mt-2 flex-grow items-stretch min-h-0 overflow-y-auto pr-2">
              {/* Left: news stories */}
              <div className="lg:col-span-8 flex flex-col gap-4 h-full">
                {articles.length > 0 ? (
                  <>
                    {/* Lead story */}
                    <div className={transitionState === "leaving" ? "animate-fade-out-1" : "animate-stagger-1"}>
                      <ArticleCard article={articles[0]} variant="lead" />
                    </div>

                    {/* Secondary stories: equal heights; an odd last
                        card spans the full row so no hole is left */}
                    <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch flex-grow content-start md:[&>*:last-child:nth-child(odd)]:col-span-2 ${
                      transitionState === "leaving" ? "animate-fade-out-2" : "animate-stagger-2"
                    }`}>
                      {articles.slice(1, 5).map((article) => (
                        <ArticleCard
                          key={article.id}
                          article={article}
                          variant="standard"
                        />
                      ))}
                    </div>

                    {/* Brief dispatches */}
                    {articles.length > 5 && (
                      <div className={`p362-card bg-tan-soft p-5 ${
                        transitionState === "leaving" ? "animate-fade-out-3" : "animate-stagger-3"
                      }`}>
                        <p className="p362-eyebrow text-charcoal flex items-center gap-2 mb-2">
                          <span className="p362-diamond" aria-hidden="true" />
                          Dispatches
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 md:[&>*:last-child:nth-child(odd)]:col-span-2">
                          {articles.slice(5).map((article) => (
                            <ArticleCard
                              key={article.id}
                              article={article}
                              variant="sidebar"
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <EmptyState
                    isBackendRunning={isBackendRunning}
                    isCapturing={isCapturing}
                    onRetry={loadData}
                  />
                )}
              </div>

              {/* Right: metrics sidebar: stretches to match left column */}
              <div className="lg:col-span-4 grid grid-cols-1 md:grid-cols-3 lg:flex lg:flex-col gap-4 h-full items-stretch">
                {summary && (
                  <div className={`flex flex-col ${
                    transitionState === "leaving" ? "animate-fade-out-1" : "animate-stagger-1"
                  }`}>
                    <FocusMeter
                      score={
                        summary.total_active_minutes > 0
                          ? Math.round(
                              ((summary.apps[0]?.minutes ?? 0) /
                                summary.total_active_minutes) *
                                100
                            ) || 50
                          : 50
                      }
                      topAppName={summary.apps[0] ? displayApp(summary.apps[0].name) : "None"}
                      topAppMinutes={summary.apps[0]?.minutes || 0}
                    />
                  </div>
                )}

                {summary && (
                  <div className={`flex flex-col ${
                    transitionState === "leaving" ? "animate-fade-out-2" : "animate-stagger-2"
                  }`}>
                    <ActiveApps
                      apps={summary.apps.slice(0, 5).map((app) => ({
                        name: displayApp(app.name),
                        minutes: app.minutes,
                        percentage:
                          summary.total_active_minutes > 0
                            ? Math.round(
                                (app.minutes / summary.total_active_minutes) * 100
                              )
                            : 0,
                      }))}
                    />
                  </div>
                )}

                {/* Real screen capture frame wrapper stretching to fill any empty space under it */}
                <div className={`flex flex-col flex-grow ${
                  transitionState === "leaving" ? "animate-fade-out-3" : "animate-stagger-3"
                }`}>
                  <ScreenCapture
                    frameId={recentFrame?.id || null}
                    appName={recentFrame?.appName}
                    timestamp={recentFrame?.timestamp}
                  />
                </div>
              </div>
            </div>
          ) : (
            /* Wrapped: monthly recap slides */
            <div className="flex-grow flex items-center justify-center py-4 min-h-0 overflow-y-auto">
              {wrappedStats && (
                <div className={`w-full max-w-[min(100%,720px)] ${
                  transitionState === "leaving" ? "animate-fade-out-1" : "animate-stagger-1"
                }`}>
                  <WrappedSlide
                    stats={wrappedStats}
                    currentSlide={currentWrappedSlide}
                    totalSlides={TOTAL_WRAPPED_SLIDES}
                    onNext={() =>
                      setCurrentWrappedSlide((prev) =>
                        Math.min(prev + 1, TOTAL_WRAPPED_SLIDES - 1)
                      )
                    }
                    onPrev={() =>
                      setCurrentWrappedSlide((prev) => Math.max(prev - 1, 0))
                    }
                  />
                </div>
              )}
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="mt-8">
          <div className="p362-divider" />
        </footer>

        {showSettingsModal && settings && (
          <SettingsModal
            settings={settings}
            onSave={saveSettings}
            onClose={() => setShowSettingsModal(false)}
          />
        )}
      </div>
    </div>
  );
}
