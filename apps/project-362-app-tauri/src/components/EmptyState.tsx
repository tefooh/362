// Project 362: your days on screen, reported like news

import React from "react";
import { RefreshCw } from "lucide-react";

export interface EmptyStateProps {
  isBackendRunning: boolean;
  isCapturing: boolean;
  onRetry: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  isBackendRunning,
  isCapturing,
  onRetry,
}) => {
  let headline: string;
  let body: string;
  let statusLabel: string;
  let showRetry = false;

  if (!isBackendRunning) {
    headline = "The presses are stopped";
    body =
      "Project 362 can't reach its capture engine. Make sure the app's recording engine is running, then try again.";
    statusLabel = "Engine offline";
    showRetry = true;
  } else if (!isCapturing) {
    headline = "Stand by for news";
    body =
      "The presses are warming up. Screen capture will begin momentarily. Once recording starts, your daily edition compiles automatically.";
    statusLabel = "Warming up";
    showRetry = true;
  } else {
    headline = "Edition in progress";
    body =
      "Your day is being recorded right now. Give it a few minutes of activity and the first stories will appear here.";
    statusLabel = "Recording";
    showRetry = true;
  }

  return (
    <section className="w-full py-10 animate-fadeIn flex-grow flex items-center justify-center">
      <div className="p362-card bg-tan-soft w-full max-w-lg mx-auto text-center px-8 py-12">
        <p className="flex items-center justify-center gap-3 mb-6" aria-hidden="true">
          <span className="p362-diamond" />
          <span className="p362-diamond" />
          <span className="p362-diamond" />
        </p>

        <h2 className="p362-display text-charcoal text-[clamp(30px,4vw,40px)] mb-4">
          {headline}
        </h2>

        <p className="font-sans text-[13px] leading-relaxed text-ink max-w-md mx-auto mb-8">
          {body}
        </p>

        <div className="flex items-center justify-center gap-3 flex-wrap">
          <span className="inline-flex items-center gap-2 rounded-full border-hairline border-charcoal bg-surface px-4 py-1.5 font-sans text-[11px] font-semibold uppercase tracking-eyebrow text-charcoal">
            <span
              className="w-2 h-2 rounded-full"
              style={{
                background: isBackendRunning ? "var(--orange)" : "var(--charcoal)",
              }}
            />
            {statusLabel}
          </span>

          {showRetry && (
            <button
              onClick={onRetry}
              className="p362-pill bg-charcoal text-surface"
            >
              <RefreshCw size={13} />
              Check again
              <span className="w-4 h-4 rounded-full bg-yellow border-hairline border-charcoal inline-block" />
            </button>
          )}
        </div>
      </div>
    </section>
  );
};

export default EmptyState;
