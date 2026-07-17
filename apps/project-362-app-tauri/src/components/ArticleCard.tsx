// Project 362: your days on screen, reported like news

import React from "react";
import type { Article } from "@/src/lib/headline-engine";
import { getFrameThumbnailUrl } from "@/src/lib/engine-client";

export interface ArticleCardProps {
  article: Article;
  variant: "lead" | "standard" | "sidebar";
}

const CATEGORY_LABELS: Record<string, string> = {
  PRODUCTIVITY: "Getting Things Done",
  FOCUS: "In the Zone",
  COMMUNICATION: "Staying in Touch",
  "NIGHT OWL": "Burning the Midnight Oil",
  TRENDING: "What Kept Coming Up",
  DISCOVERY: "New Discoveries",
  MILESTONE: "Daily Stats",
};

function friendlyCategory(category: string): string {
  return CATEGORY_LABELS[category] ?? "Your Day";
}

const CategoryBadge: React.FC<{ category: string }> = ({ category }) => (
  <span className="p362-eyebrow inline-flex items-center gap-2 text-charcoal">
    <span className="p362-diamond" aria-hidden="true" />
    <span>{friendlyCategory(category)}</span>
  </span>
);

const ArticleThumbnail: React.FC<{ frameId: number }> = ({ frameId }) => (
  <div className="relative overflow-hidden rounded-inset border-hairline border-charcoal my-4 bg-orange">
    <img
      src={getFrameThumbnailUrl(frameId)}
      alt="Captured screen moment"
      className="w-full h-auto object-cover"
      loading="lazy"
    />
    <span className="absolute left-3 bottom-3 inline-flex items-center rounded-full border-hairline border-charcoal bg-surface px-3 py-1 font-sans text-[10px] font-semibold uppercase tracking-eyebrow text-charcoal">
      Screen Capture
    </span>
  </div>
);

export const ArticleCard: React.FC<ArticleCardProps> = ({
  article,
  variant,
}) => {
  if (variant === "lead") {
    return (
      <article className="p362-card bg-tan p-6 md:p-7 animate-fadeIn">
        <CategoryBadge category={article.category} />

        <h2 className="p362-display text-charcoal text-[clamp(28px,3.4vw,35px)] mt-3 mb-2">
          {article.headline}
        </h2>

        {article.subtitle && (
          <p className="font-sans text-[13px] text-ink mb-1">
            {article.subtitle}
          </p>
        )}

        {article.frameId && (
          <ArticleThumbnail frameId={article.frameId} />
        )}

        <div className="font-sans text-[13px] leading-relaxed text-charcoal mt-3">
          {article.body.split("\n\n").map((paragraph, i) => (
            <p key={i} className="mb-3 last:mb-0">
              {paragraph}
            </p>
          ))}
        </div>
      </article>
    );
  }

  if (variant === "standard") {
    return (
      <article className="p362-card bg-surface p-5 animate-fadeIn h-full flex flex-col">
        <CategoryBadge category={article.category} />

        <h3 className="p362-display text-charcoal text-[22px] mt-2.5 mb-2">
          {article.headline}
        </h3>

        {article.subtitle && (
          <p className="font-sans text-[12px] text-ink mb-1">
            {article.subtitle}
          </p>
        )}

        {article.frameId && (
          <ArticleThumbnail frameId={article.frameId} />
        )}

        <div className="font-sans text-[12px] leading-relaxed text-ink flex-grow">
          {article.body.split("\n\n").map((paragraph, i) => (
            <p key={i} className="mb-2 last:mb-0">
              {paragraph}
            </p>
          ))}
        </div>
      </article>
    );
  }

  // sidebar / brief variant
  return (
    <article className="py-3 first:pt-0 last:pb-0">
      <CategoryBadge category={article.category} />
      <h4 className="p362-display text-charcoal text-[17px] mt-1.5 mb-1">
        {article.headline}
      </h4>
      {article.subtitle && (
        <p className="font-sans text-[11px] text-ink mb-1">
          {article.subtitle}
        </p>
      )}
      <p className="font-sans text-[12px] leading-relaxed text-ink line-clamp-3">
        {article.body.split("\n\n")[0]}
      </p>
    </article>
  );
};

export default ArticleCard;
