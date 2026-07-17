// Project 362: your days on screen, reported like news

import React from "react";
import { RefreshCw, Settings, LayoutGrid, Minimize2 } from "lucide-react";

export interface MastheadProps {
  date: Date;
  edition: number;
  activeView: "chronicle" | "wrapped";
  onViewChange: (view: "chronicle" | "wrapped") => void;
  onRefresh: () => void;
  onOpenSettings: () => void;
  onToggleWidget: () => void;
  isWidgetMode: boolean;
  loading: boolean;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export const Masthead: React.FC<MastheadProps> = ({
  date,
  edition,
  activeView,
  onViewChange,
  onRefresh,
  onOpenSettings,
  onToggleWidget,
  isWidgetMode,
  loading,
}) => {
  const [cooldown, setCooldown] = React.useState(0);

  React.useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleRefreshClick = () => {
    if (cooldown === 0 && !loading) {
      onRefresh();
      setCooldown(5); // 5s cooldown
    }
  };

  return (
    <header className="w-full select-none">
      {/* Eyebrow row */}
      <div className="flex items-center justify-between gap-4 pb-5">
        <span className="p362-eyebrow flex items-center gap-2.5 text-charcoal">
          <span className="p362-diamond" aria-hidden="true" />
          The Daily You
        </span>
        <span className="p362-eyebrow hidden md:block text-ink">
          Edition No. {edition}
        </span>
      </div>

      {/* Nameplate + controls */}
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
        <h1 className="p362-display text-charcoal text-[clamp(46px,6vw,62px)]">
          Project 362
        </h1>

        <nav className="flex items-center gap-2 pb-1.5" aria-label="Views">
          <button
            onClick={() => onViewChange("chronicle")}
            className={`p362-pill ${
              activeView === "chronicle"
                ? "bg-charcoal text-surface"
                : "bg-tan-soft text-charcoal"
            }`}
            aria-pressed={activeView === "chronicle"}
          >
            Daily Edition
          </button>
          <button
            onClick={() => onViewChange("wrapped")}
            className={`p362-pill ${
              activeView === "wrapped"
                ? "bg-charcoal text-surface"
                : "bg-tan-soft text-charcoal"
            }`}
            aria-pressed={activeView === "wrapped"}
          >
            Wrapped
          </button>
          <button
            onClick={handleRefreshClick}
            disabled={loading || cooldown > 0}
            className="w-9 h-9 rounded-full border-hairline border-charcoal bg-yellow text-charcoal inline-flex items-center justify-center transition-transform duration-200 ease-out hover:-translate-y-px disabled:opacity-45"
            title={cooldown > 0 ? `Refresh (cooldown ${cooldown}s)` : "Refresh"}
            aria-label="Refresh"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
          <button
            onClick={onToggleWidget}
            className="w-9 h-9 rounded-full border-hairline border-charcoal bg-tan-soft text-charcoal inline-flex items-center justify-center transition-transform duration-200 ease-out hover:-translate-y-px"
            title={isWidgetMode ? "Exit Widget Mode" : "Widget Mode"}
            aria-label={isWidgetMode ? "Exit Widget Mode" : "Widget Mode"}
          >
            {isWidgetMode ? <Minimize2 size={14} /> : <LayoutGrid size={14} />}
          </button>
          <button
            onClick={onOpenSettings}
            className="w-9 h-9 rounded-full border-hairline border-charcoal bg-tan-soft text-charcoal inline-flex items-center justify-center transition-transform duration-200 ease-out hover:-translate-y-px"
            title="Settings"
            aria-label="Settings"
          >
            <Settings size={14} />
          </button>
        </nav>
      </div>

      {/* Date rule */}
      <div className="mt-6">
        <div className="p362-divider" />
        <div className="flex items-center justify-between gap-4 py-2.5">
          <span className="font-sans text-[12px] font-medium text-charcoal">
            {formatDate(date)}
          </span>
        </div>
        <div className="p362-divider" />
      </div>
    </header>
  );
};

export default Masthead;
