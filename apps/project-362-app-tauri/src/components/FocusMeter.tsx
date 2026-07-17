// Project 362: your days on screen, reported like news

import React, { useEffect, useState } from "react";

export interface FocusMeterProps {
  score: number; // 0-100
  topAppName: string;
  topAppMinutes: number;
}

function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${Math.round(minutes)}m`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

export const FocusMeter: React.FC<FocusMeterProps> = ({
  score,
  topAppName,
  topAppMinutes,
}) => {
  const [animatedWidth, setAnimatedWidth] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedWidth(Math.min(Math.max(score, 0), 100));
    }, 100);
    return () => clearTimeout(timer);
  }, [score]);

  return (
    <section className="p362-card bg-charcoal text-surface p-5">
      <p className="p362-eyebrow text-surface flex items-center gap-2 mb-4">
        <span className="p362-diamond" aria-hidden="true" />
        Focus Index
      </p>

      {/* Score display */}
      <div className="flex items-baseline gap-2 mb-4">
        <span className="p362-display text-[42px] text-yellow tabular-nums">
          {score}%
        </span>
        <span className="font-sans text-[12px] text-surface/70">
          focus score
        </span>
      </div>

      {/* Bar meter */}
      <div
        className="w-full h-3.5 rounded-full border-hairline border-surface/60 overflow-hidden"
        role="meter"
        aria-valuenow={score}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Focus score"
      >
        <div
          className="h-full bg-yellow"
          style={{
            width: `${animatedWidth}%`,
            transition: "width 220ms ease-out",
          }}
        />
      </div>

      {/* Primary focus app */}
      <p className="mt-4 font-sans text-[12px] text-surface/85">
        <span className="font-semibold text-surface">Primary focus:</span>{" "}
        {topAppName}{" "}
        <span className="text-surface/60">
          ({formatDuration(topAppMinutes)})
        </span>
      </p>

      <p className="mt-1.5 font-sans text-[10px] text-surface/50">
        Focus score = time in primary app ÷ total active time
      </p>
    </section>
  );
};

export default FocusMeter;
