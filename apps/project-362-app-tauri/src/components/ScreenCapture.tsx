// Project 362: your days on screen, reported like news

import React from "react";
import { getFrameImageUrl } from "@/src/lib/engine-client";

export interface ScreenCaptureProps {
  frameId: number | null;
  appName?: string;
  timestamp?: string;
}

export const ScreenCapture: React.FC<ScreenCaptureProps> = ({
  frameId,
  appName,
  timestamp,
}) => {
  if (frameId === null) {
    return (
      <section className="p362-card bg-surface p-6 text-center flex-grow flex items-center justify-center">
        <p className="font-sans text-[12px] text-ink">
          No captures yet. Screen recording will populate this section.
        </p>
      </section>
    );
  }

  return (
    <section className="p362-card bg-surface p-4 flex-grow flex flex-col">
      <p className="p362-eyebrow text-charcoal flex items-center gap-2 mb-3">
        <span className="p362-diamond" aria-hidden="true" />
        Latest Capture
      </p>

      <div className="relative overflow-hidden rounded-inset border-hairline border-charcoal bg-orange flex-grow min-h-0">
        <img
          src={getFrameImageUrl(frameId)}
          alt="Latest screen capture"
          className="w-full h-full min-h-[180px] object-cover"
          loading="lazy"
        />
        {appName && (
          <span className="absolute left-3 bottom-3 inline-flex items-center rounded-full border-hairline border-charcoal bg-yellow px-3 py-1 font-sans text-[10px] font-semibold uppercase tracking-eyebrow text-charcoal">
            {appName}
          </span>
        )}
      </div>

      <p className="mt-3 font-sans text-[10px] text-ink">
        Captured locally for privacy.
        {timestamp ? ` Captured ${new Date(timestamp).toLocaleTimeString()}.` : ""}
      </p>
    </section>
  );
};

export default ScreenCapture;
