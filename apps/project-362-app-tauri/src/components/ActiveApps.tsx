// Project 362: your days on screen, reported like news

import React from "react";

export interface ActiveAppsProps {
  apps: Array<{ name: string; minutes: number; percentage: number }>;
}

function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${Math.round(minutes)}m`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

export const ActiveApps: React.FC<ActiveAppsProps> = ({ apps }) => {
  const topApps = apps.slice(0, 5);

  return (
    <section className="p362-card bg-tan-soft p-5">
      <p className="p362-eyebrow text-charcoal flex items-center gap-2 mb-4">
        <span className="p362-diamond" aria-hidden="true" />
        Active Workspaces
      </p>

      <div className="space-y-3.5">
        {topApps.map((app, index) => (
          <div key={`${app.name}-${index}`}>
            <div className="flex items-baseline justify-between mb-1.5">
              <span className="font-sans text-[12px] font-semibold text-charcoal truncate max-w-[60%]">
                {app.name}
              </span>
              <span className="font-sans text-[11px] text-ink tabular-nums flex-shrink-0 ml-2">
                {formatDuration(app.minutes)}
              </span>
            </div>

            <div className="w-full h-2.5 rounded-full border-hairline border-charcoal bg-surface overflow-hidden">
              <div
                className="h-full bg-charcoal"
                style={{
                  width: `${Math.min(app.percentage, 100)}%`,
                  transition: "width 220ms ease-out",
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {topApps.length === 0 && (
        <p className="font-sans text-[12px] text-ink">
          No application activity recorded yet.
        </p>
      )}
    </section>
  );
};

export default ActiveApps;
