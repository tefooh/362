// Project 362: your days on screen, reported like news

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { WrappedStats } from "@/src/lib/wrapped-engine";

export interface WrappedSlideProps {
  stats: WrappedStats;
  currentSlide: number;
  totalSlides: number;
  onNext: () => void;
  onPrev: () => void;
}

function formatHours(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (hours === 0) return `${mins}m`;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

const Eyebrow: React.FC<{ children: React.ReactNode; light?: boolean }> = ({
  children,
  light,
}) => (
  <p
    className={`p362-eyebrow flex items-center justify-center gap-2 ${
      light ? "text-surface" : "text-charcoal"
    }`}
  >
    <span className="p362-diamond" aria-hidden="true" />
    {children}
  </p>
);

// Slide 0 - Title (inverted charcoal card)
const TitleSlide: React.FC<{ stats: WrappedStats }> = ({ stats }) => (
  <div className="flex flex-col items-center justify-center h-full text-center px-8 animate-fadeIn bg-charcoal text-surface">
    <Eyebrow light>Wrapped</Eyebrow>
    <h1 className="p362-display text-surface text-[clamp(44px,7vw,72px)] mt-4 mb-6">
      {stats.periodLabel}
    </h1>
    <div className="mb-8">
      <span className="p362-display text-yellow text-[clamp(34px,4vw,42px)] tabular-nums">
        {formatHours(stats.totalMinutes)}
      </span>
      <p className="font-sans text-[12px] text-surface/60 mt-1.5">
        total screen time across {stats.totalDays}{" "}
        {stats.totalDays === 1 ? "day" : "days"}
      </p>
    </div>
    <span className="p362-pill bg-yellow text-charcoal pointer-events-none">
      Turn the page →
    </span>
  </div>
);

// Slide 1 - Top Apps (white card)
const TopAppsSlide: React.FC<{ stats: WrappedStats }> = ({ stats }) => (
  <div className="flex flex-col items-center justify-center h-full px-8 md:px-12 animate-fadeIn bg-surface">
    <Eyebrow>Your Top Apps</Eyebrow>
    <div className="w-full max-w-md mt-8">
      {stats.topApps.slice(0, 5).map((app, i) => (
        <div
          key={app.name}
          className="py-3 border-b last:border-b-0"
          style={{ borderBottomWidth: "1.25px", borderColor: "#171512" }}
        >
          <div className="flex items-baseline justify-between mb-1.5 gap-3">
            <span className="flex items-baseline gap-3 min-w-0">
              <span className="p362-display text-orange text-[22px] tabular-nums flex-shrink-0">
                {i + 1}
              </span>
              <span className="font-sans text-[13px] font-semibold text-charcoal truncate">
                {app.name}
              </span>
            </span>
            <span className="font-sans text-[12px] text-ink tabular-nums flex-shrink-0">
              {formatHours(app.minutes)}
            </span>
          </div>
          <div className="w-full h-2.5 rounded-full border-hairline border-charcoal bg-tan-soft overflow-hidden">
            <div
              className="h-full bg-charcoal"
              style={{
                width: `${app.percentage}%`,
                transition: "width 220ms ease-out",
              }}
            />
          </div>
        </div>
      ))}
      {stats.topApps.length === 0 && (
        <p className="font-sans text-[12px] text-ink text-center">
          No app activity recorded for this period yet.
        </p>
      )}
    </div>
  </div>
);

// Slide 2 - Focus Score (tan card)
const FocusScoreSlide: React.FC<{ stats: WrappedStats }> = ({ stats }) => (
  <div className="flex flex-col items-center justify-center h-full text-center px-8 animate-fadeIn bg-tan">
    <Eyebrow>Your Focus Score</Eyebrow>

    <div className="my-8 w-44 h-44 md:w-52 md:h-52 rounded-full border-hairline border-charcoal bg-surface flex flex-col items-center justify-center">
      <span className="p362-display text-charcoal text-[clamp(48px,6vw,64px)] tabular-nums leading-none">
        {stats.focusScore}
      </span>
      <span className="font-sans text-[11px] text-ink mt-1">out of 100</span>
    </div>

    <p className="p362-display text-charcoal text-[26px]">
      {stats.personality.label}
    </p>
    <p className="font-sans text-[12px] text-ink mt-2 max-w-xs">
      Based on how consistently you stayed with your primary tools
    </p>
  </div>
);

// Slide 3 - After Hours (inverted charcoal card)
const AfterHoursSlide: React.FC<{ stats: WrappedStats }> = ({ stats }) => (
  <div className="flex flex-col items-center justify-center h-full text-center px-8 animate-fadeIn bg-charcoal text-surface">
    <Eyebrow light>After Hours</Eyebrow>

    <div className="mt-8 mb-6">
      <span className="p362-display text-yellow text-[clamp(40px,5vw,56px)] tabular-nums">
        {formatHours(stats.lateNightMinutes)}
      </span>
      <p className="font-sans text-[12px] text-surface/60 mt-1.5">
        of late-night activity past 11 PM
      </p>
    </div>

    <div
      className="w-full max-w-[240px] pt-5"
      style={{ borderTop: "1.25px solid rgba(255,255,255,0.35)" }}
    >
      <span className="p362-display text-surface text-[34px] tabular-nums">
        {stats.totalMeetings}
      </span>
      <p className="font-sans text-[12px] text-surface/60 mt-1">
        {stats.totalMeetings === 1 ? "meeting" : "meetings"} attended
        {stats.totalMeetingHours > 0 ? ` (${stats.totalMeetingHours}h)` : ""}
      </p>
    </div>
  </div>
);

// Slide 4 - Personality (white card, yellow reward badge)
const PersonalitySlide: React.FC<{ stats: WrappedStats }> = ({ stats }) => (
  <div className="flex flex-col items-center justify-center h-full text-center px-8 animate-fadeIn bg-surface">
    <Eyebrow>Your Personality</Eyebrow>

    <span className="mt-8 mb-5 inline-flex items-center rounded-full border-hairline border-charcoal bg-yellow px-5 py-2 font-sans text-[12px] font-bold uppercase tracking-eyebrow text-charcoal">
      Certified
    </span>

    <h2 className="p362-display text-charcoal text-[clamp(36px,4.5vw,54px)] mb-4">
      {stats.personality.label}
    </h2>

    <p className="font-sans text-[13px] leading-relaxed text-ink max-w-sm mb-8">
      {stats.personality.description}
    </p>

    <p className="font-sans text-[12px] text-ink italic">
      That&apos;s your {stats.periodLabel}. Own it.
    </p>
  </div>
);

const SLIDES = [
  TitleSlide,
  TopAppsSlide,
  FocusScoreSlide,
  AfterHoursSlide,
  PersonalitySlide,
];

export const WrappedSlide: React.FC<WrappedSlideProps> = ({
  stats,
  currentSlide,
  totalSlides,
  onNext,
  onPrev,
}) => {
  const SlideComponent = SLIDES[currentSlide] ?? TitleSlide;

  return (
    <div className="relative w-full h-[calc(100vh-260px)] min-h-[480px] p362-card overflow-hidden select-none">
      {/* Slide content */}
      <div key={currentSlide} className="h-full">
        <SlideComponent stats={stats} />
      </div>

      {/* Navigation */}
      {currentSlide > 0 && (
        <button
          onClick={onPrev}
          className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full border-hairline border-charcoal bg-tan-soft text-charcoal inline-flex items-center justify-center transition-transform duration-200 ease-out hover:-translate-y-[calc(50%+1px)]"
          style={{ transform: "translateY(-50%)" }}
          aria-label="Previous slide"
        >
          <ChevronLeft size={18} />
        </button>
      )}
      {currentSlide < totalSlides - 1 && (
        <button
          onClick={onNext}
          className="absolute right-3 top-1/2 w-9 h-9 rounded-full border-hairline border-charcoal bg-yellow text-charcoal inline-flex items-center justify-center transition-transform duration-200 ease-out"
          style={{ transform: "translateY(-50%)" }}
          aria-label="Next slide"
        >
          <ChevronRight size={18} />
        </button>
      )}

      {/* Diamond progress indicators */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2.5">
        {Array.from({ length: totalSlides }).map((_, i) => (
          <span
            key={i}
            className="inline-block w-2 h-2 border-hairline border-charcoal"
            style={{
              transform: "rotate(45deg)",
              background:
                i === currentSlide ? "var(--orange)" : "var(--tan-soft)",
              transition: "background-color 180ms ease-out",
            }}
            aria-hidden="true"
          />
        ))}
      </div>
    </div>
  );
};

export default WrappedSlide;
