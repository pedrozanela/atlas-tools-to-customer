"use client";

import { Star, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAppStore } from "@/lib/store";
import { CRITERIA_CATEGORIES, type CriteriaCategory } from "@/lib/criteria";

interface Props {
  onNext: () => void;
}

/**
 * "Guiding Criteria" canvas — strategic intake collected before the AS-IS
 * mapping. Layout mirrors the printed canvas: 6 cards arranged in 3 rows
 * × 2 columns around a central Databricks logo, with the rating stars on
 * each card facing the centre.
 *
 * Each item is rated 1–5 (irrelevant → very important) so the architect
 * can prioritise the AS-IS / TO-BE conversation.
 */
export default function CriteriaForm({ onNext }: Props) {
  const criteria = useAppStore((s) => s.criteria);
  const setCriterion = useAppStore((s) => s.setCriterion);

  const totalItems = CRITERIA_CATEGORIES.reduce(
    (acc, c) => acc + c.items.length,
    0,
  );
  const ratedCount = Object.keys(criteria).filter((k) => criteria[k] > 0).length;

  // Pair the 6 categories left↔right, matching the printed canvas.
  const [
    costReduction,
    innovation,
    integration,
    riskReduction,
    businessEnablement,
    opEfficiency,
  ] = CRITERIA_CATEGORIES;

  return (
    <div data-atlas-tour="tap-criteria" className="mx-auto max-w-[1600px] px-4 md:px-8 py-6">
      <header className="mb-6">
        <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-raised pb-3">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-widest text-foreground/50">
              Step 1 of 2 · Canvas
            </div>
            <h1 className="mt-0.5 text-2xl font-bold tracking-tight">
              Guiding Criteria
            </h1>
            <p className="mt-1 text-sm text-foreground/70">
              Rate how important each strategic driver is to your business (1 — irrelevant, 5 — very important). This priorisation guides the AS-IS conversation and the roadmap discussion with your Databricks architect.
            </p>
          </div>
          <div className="text-right text-xs text-foreground/60">
            <div className="font-semibold text-foreground">
              {ratedCount} / {totalItems} items
            </div>
            <div>rated</div>
          </div>
        </div>
      </header>

      {/* Canvas-style 2-col grid (lg+): cards mirror across a vertical
          axis — left side cards have items right-aligned with stars on
          the right edge, right side cards are the opposite, so star
          ratings cluster down the centre. Narrow viewports fall back
          to a single column (left-aligned). */}
      <div className="hidden lg:grid lg:grid-cols-2 lg:gap-x-6 lg:gap-y-4">
        <CriteriaCard category={costReduction} align="right" values={criteria} onChange={setCriterion} />
        <CriteriaCard category={innovation} align="left" values={criteria} onChange={setCriterion} />

        <CriteriaCard category={integration} align="right" values={criteria} onChange={setCriterion} />
        <CriteriaCard category={riskReduction} align="left" values={criteria} onChange={setCriterion} />

        <CriteriaCard category={businessEnablement} align="right" values={criteria} onChange={setCriterion} />
        <CriteriaCard category={opEfficiency} align="left" values={criteria} onChange={setCriterion} />
      </div>

      {/* Fallback for narrow screens: single column, all left-aligned. */}
      <div className="grid gap-4 md:grid-cols-1 lg:hidden">
        {CRITERIA_CATEGORIES.map((cat) => (
          <CriteriaCard
            key={cat.key}
            category={cat}
            align="left"
            values={criteria}
            onChange={setCriterion}
          />
        ))}
      </div>

      <div
        data-atlas-tour="tap-criteria-actions"
        className="mt-8 flex items-center justify-between gap-3 border-t border-raised pt-4"
      >
        <p className="text-xs text-foreground/60">
          Rating every item is optional — unrated items are treated as neutral.
        </p>
        <Button
          onClick={onNext}
          className="inline-flex items-center gap-2 rounded-md bg-brand px-6 py-2 text-sm font-semibold text-canvas shadow-[0_2px_8px_rgba(255,54,33,0.4)] hover:bg-brand-hover"
        >
          Continue to AS-IS
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function CriteriaCard({
  category,
  align,
  values,
  onChange,
}: {
  category: CriteriaCategory;
  /** Side that stars hug — "left" places stars before the label, "right" after. */
  align: "left" | "right";
  values: Record<string, number>;
  onChange: (key: string, score: number) => void;
}) {
  return (
    <section className="rounded-lg border border-raised bg-surface p-4 shadow-card">
      <h2
        className={`mb-3 text-sm font-bold uppercase tracking-wider text-foreground/80 ${
          align === "left" ? "text-left" : "text-right"
        }`}
      >
        {category.title}
      </h2>
      <ul className="space-y-2">
        {category.items.map((item) => (
          <li
            key={item.key}
            className={`flex items-center gap-3 rounded-md px-2 py-1.5 transition-colors hover:bg-canvas ${
              align === "left"
                ? "flex-row"
                : "flex-row-reverse"
            }`}
          >
            <StarRating
              value={values[item.key] ?? 0}
              onChange={(score) => onChange(item.key, score)}
            />
            <span
              className={`flex-1 text-[13px] leading-snug text-foreground/85 ${
                align === "right" ? "text-right" : "text-left"
              }`}
            >
              {item.label}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function StarRating({
  value,
  onChange,
}: {
  value: number;
  onChange: (score: number) => void;
}) {
  return (
    <div className="flex shrink-0 items-center gap-0.5" role="radiogroup">
      {[1, 2, 3, 4, 5].map((n) => {
        const active = n <= value;
        return (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} of 5`}
            onClick={() => onChange(value === n ? 0 : n)}
            className="rounded p-0.5 transition-transform hover:scale-110"
          >
            <Star
              className={`h-4 w-4 ${
                active
                  ? "fill-amber-400 text-amber-400"
                  : "fill-transparent text-foreground/25"
              }`}
              strokeWidth={1.5}
            />
          </button>
        );
      })}
    </div>
  );
}
