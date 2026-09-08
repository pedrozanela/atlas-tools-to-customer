"use client";

import { useState } from "react";
import {
  Download,
  RotateCcw,
  Check,
  ChevronDown,
  ChevronRight,
  FileSpreadsheet,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { CANVAS_SECTIONS, COLUMN_TITLES, MAX_ROW } from "@/lib/canvas-layout";
import { CRITERIA_CATEGORIES } from "@/lib/criteria";
import { downloadExcel } from "@/lib/excel";
import { sanitizeCategory } from "@/lib/utils";

const BASE_PATH = "/tap";

function iconUrl(category: string, tool: string): string {
  // Mirrors SectionBlock.iconUrl — keeps the canvas summary consistent
  // with the form's logo lookup. Falls back to a generic icon if the
  // server doesn't have a matching PNG for this tool.
  const filename = tool.toLowerCase().replace(/ /g, "_");
  const folder = encodeURIComponent(sanitizeCategory(category));
  return `${BASE_PATH}/static/data_tools/${folder}/${filename}.png`;
}

const FALLBACK_ICON = `${BASE_PATH}/static/other_assets/creativity.png`;

interface Props {
  cloudProviders: string[];
  tools: Record<string, string[]>;
  companyName: string;
  userName: string;
  /** Star rating 1–5 per "Guiding Criteria" item key (lib/criteria.ts).
   *  Items without a rating are omitted from the table. */
  criteria: Record<string, number>;
  onReset: () => void;
}

/**
 * Post-submit summary for the TAP AS-IS canvas.
 *
 * Designed as a print-first canvas blueprint: a 7-column × N-row grid
 * mirroring the original printed Power BI canvas (Data Sources → Ingestion →
 * Catalog & Governance → Storage → Warehouse → Data Lab/ML → Consumption).
 * Each column has dark cell headers, sub-rows stacked vertically, and the
 * selected tools listed inside. The on-screen view is the same as the
 * printed view — `window.print()` + `@media print` strips the action bar
 * and forces landscape A4 via @page rules in globals.css.
 *
 * Company / user / cloud-provider go in three header cells across the
 * top, matching the original handwritten canvas layout.
 */
export default function SubmittedSummary({
  cloudProviders,
  tools,
  companyName,
  userName,
  criteria,
  onReset,
}: Props) {
  const cloudLabel =
    cloudProviders.length === 0 ? "—" : cloudProviders.join(" · ");
  const hasAny =
    cloudProviders.length > 0 ||
    Object.values(tools).some((t) => t.length > 0);
  const hasCriteria = Object.values(criteria ?? {}).some((s) => s > 0);
  const ratedCount = Object.values(criteria ?? {}).filter((s) => s > 0).length;

  // Collapse state. Default: Criteria collapsed, Architecture expanded.
  // The print stylesheet expands both regardless via .print-show-collapsed.
  const [criteriaOpen, setCriteriaOpen] = useState(false);
  const [canvasOpen, setCanvasOpen] = useState(true);

  return (
    <div className="mx-auto max-w-[1600px] px-4 md:px-8 py-6">
      {/* Action bar — hidden on print */}
      <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-foreground/70">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand text-canvas">
            <Check className="h-4 w-4" strokeWidth={3} />
          </span>
          <span>Saved to Unity Catalog.</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() =>
              downloadExcel({
                companyName,
                userName,
                cloudProviders,
                tools,
                criteria: criteria ?? {},
              })
            }
            className="inline-flex items-center gap-2 border border-raised bg-surface px-4 py-2 text-sm hover:bg-raised"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Download Excel
          </Button>
          <Button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 border border-raised bg-surface px-4 py-2 text-sm hover:bg-raised"
          >
            <Download className="h-4 w-4" />
            Download PDF
          </Button>
          <Button
            onClick={onReset}
            className="inline-flex items-center gap-2 border border-raised bg-surface px-4 py-2 text-sm hover:bg-raised"
          >
            <RotateCcw className="h-4 w-4" />
            New mapping
          </Button>
        </div>
      </div>

      {/* Strategic Guiding Criteria — comes first so the architect reads
          the customer's drivers before looking at the AS-IS canvas.
          Collapsed by default; expanded for print. */}
      {hasCriteria && (
        <section className="mb-4">
          <SectionToggle
            label="Guiding Criteria"
            badge={`${ratedCount} drivers rated`}
            open={criteriaOpen}
            onToggle={() => setCriteriaOpen((v) => !v)}
          />
          <div
            className={`mt-2 print-show ${criteriaOpen ? "" : "hidden"}`}
          >
            <CriteriaTable criteria={criteria} />
          </div>
        </section>
      )}

      {/* AS-IS architecture canvas — expanded by default, also collapsible. */}
      <section className={hasCriteria ? "" : ""}>
        <SectionToggle
          label="AS-IS Architecture"
          open={canvasOpen}
          onToggle={() => setCanvasOpen((v) => !v)}
        />
      <article
        className={`print-report mt-2 border border-foreground/15 bg-canvas print-show ${
          canvasOpen ? "" : "hidden"
        } ${hasCriteria ? "" : ""}`}
        style={hasCriteria ? { pageBreakBefore: "always", breakBefore: "page" } : undefined}
      >
        {/* Header strip: title cell + 3 metadata cells. Use a div (not
            <header>) so the print stylesheet's chrome-hiding rule
            doesn't blow it away — only the app's top-level
            <header> should be hidden on print. */}
        <div className="grid grid-cols-12 border-b border-foreground/15">
          <div className="col-span-3 border-r border-foreground/15 px-4 py-3">
            <div className="text-[10px] font-bold uppercase tracking-widest text-foreground/50">
              TAP
            </div>
            <div className="text-base font-bold leading-tight tracking-tight">
              AS-IS Architecture
            </div>
          </div>
          <HeaderField label="Company" value={companyName || "—"} className="col-span-3" />
          <HeaderField label="Author" value={userName || "—"} className="col-span-3" />
          <HeaderField label="Cloud Provider" value={cloudLabel} className="col-span-3" />
        </div>

        {/* 7-column canvas grid */}
        <div className="grid grid-cols-7">
          {COLUMN_TITLES.map((title, i) => {
            const col = i + 1;
            const isLast = col === COLUMN_TITLES.length;
            return (
              <div
                key={title}
                className={`flex flex-col ${isLast ? "" : "border-r border-foreground/15"}`}
              >
                {/* Column header (dark bar, light text). Fixed h-10 so
                    the tallest 2-line title (Catalog & Governance) sets
                    a height that the 1-line titles match — keeps the
                    sub-row band aligned across all 7 columns. */}
                <div className="flex h-10 items-center justify-center bg-foreground px-2 text-center text-[11px] font-bold uppercase leading-tight tracking-wide text-canvas">
                  {title}
                </div>

                {/* Per-row sub-sections; pad up to MAX_ROW for visual alignment */}
                {Array.from({ length: MAX_ROW }).map((_, r) => {
                  const section = CANVAS_SECTIONS.find(
                    (s) => s.col === col && s.row === r + 1,
                  );
                  if (!section) {
                    // empty filler so columns align visually
                    return (
                      <div
                        key={r}
                        className="min-h-[110px] border-t border-foreground/10"
                      />
                    );
                  }
                  const selected = tools[section.category] ?? [];
                  return (
                    <div
                      key={section.category}
                      className="flex min-h-[110px] flex-col border-t border-foreground/10"
                    >
                      {/* Sub-row header — fixed h-9 so 2-line labels
                          (Query Tools & Data Sharing, Cloud Storage
                          Format) match 1-line ones and the content
                          band below stays horizontally aligned. */}
                      <div className="flex h-9 items-center justify-center bg-foreground/85 px-2 text-center text-[10px] font-semibold uppercase leading-tight tracking-wide text-canvas">
                        {section.category}
                      </div>
                      <div className="flex-1 px-2 py-2">
                        {selected.length === 0 ? (
                          <div className="text-[10px] italic text-foreground/30">
                            —
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-1.5">
                            {selected.map((tool) => (
                              <div
                                key={tool}
                                className="flex flex-col items-center gap-0.5 rounded bg-surface p-1 ring-1 ring-raised"
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={iconUrl(section.category, tool)}
                                  alt={tool}
                                  title={tool}
                                  className="h-7 w-7 object-contain"
                                  onError={(e) => {
                                    e.currentTarget.src = FALLBACK_ICON;
                                  }}
                                />
                                <span className="line-clamp-2 text-center text-[9px] leading-tight text-foreground/80">
                                  {tool}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {!hasAny && (
          <p className="px-4 py-3 text-sm text-foreground/50">
            No selections made — the canvas is empty.
          </p>
        )}

        <footer className="no-print border-t border-foreground/15 px-4 py-2 text-[10px] text-foreground/50">
          Atlas TAP · Forward this canvas to your Databricks reference architect.
        </footer>
      </article>
      </section>
    </div>
  );
}

/**
 * Compact section header with a chevron + label, used to collapse/expand
 * the Guiding Criteria and AS-IS Architecture blocks on screen. Hidden
 * on print so the PDF never shows the toggle row.
 */
function SectionToggle({
  label,
  badge,
  open,
  onToggle,
}: {
  label: string;
  badge?: string;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      className="no-print group flex w-full items-center gap-2 rounded-md border border-foreground/15 bg-surface px-3 py-2 text-left transition-colors hover:bg-raised"
    >
      {open ? (
        <ChevronDown className="h-4 w-4 shrink-0 text-foreground/60" />
      ) : (
        <ChevronRight className="h-4 w-4 shrink-0 text-foreground/60" />
      )}
      <span className="text-sm font-semibold tracking-tight text-foreground">
        {label}
      </span>
      {badge && (
        <span className="ml-2 rounded-full bg-foreground/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-foreground/60">
          {badge}
        </span>
      )}
      <span className="ml-auto text-[11px] text-foreground/50">
        {open ? "Hide" : "Show"}
      </span>
    </button>
  );
}

/**
 * Rendered after the AS-IS architecture canvas. Lists every rated item
 * from the "Guiding Criteria" step grouped by category, sorted score
 * descending so the most-important drivers surface to the top of each
 * group. Picks up its own print page so it doesn't crowd the canvas.
 */
function CriteriaTable({ criteria }: { criteria: Record<string, number> }) {
  return (
    <article
      className="print-page-break mt-6 border border-foreground/15 bg-canvas"
      style={{ pageBreakBefore: "always", breakBefore: "page" }}
    >
      <header className="border-b border-foreground/15 px-4 py-3">
        <div className="text-[10px] font-bold uppercase tracking-widest text-foreground/50">
          TAP
        </div>
        <div className="text-base font-bold leading-tight tracking-tight">
          Guiding Criteria
        </div>
        <p className="mt-1 text-[11px] text-foreground/60">
          Strategic drivers rated by the customer (1 — irrelevant, 5 — very
          important). Sorted by score within each category.
        </p>
      </header>

      <table className="w-full border-collapse text-xs">
        <colgroup>
          <col style={{ width: "22%" }} />
          <col style={{ width: "58%" }} />
          <col style={{ width: "20%" }} />
        </colgroup>
        <thead>
          <tr className="border-b border-foreground/15 bg-foreground/[0.03] text-left text-[10px] uppercase tracking-wider text-foreground/50">
            <th className="px-4 py-2 font-semibold">Category</th>
            <th className="px-2 py-2 font-semibold">Driver</th>
            <th className="px-4 py-2 text-right font-semibold">Rating</th>
          </tr>
        </thead>
        <tbody>
          {CRITERIA_CATEGORIES.flatMap((cat) => {
            const rated = cat.items
              .map((it) => ({ ...it, score: criteria[it.key] ?? 0 }))
              .filter((it) => it.score > 0)
              .sort((a, b) => b.score - a.score);
            return rated.map((it, idx) => (
              <tr
                key={it.key}
                className="border-b border-foreground/10 align-middle last:border-0"
              >
                <td className="px-4 py-1.5 align-top text-[11px] font-semibold uppercase tracking-wide text-foreground/70">
                  {idx === 0 ? cat.title : ""}
                </td>
                <td className="px-2 py-1.5 text-foreground/85">{it.label}</td>
                <td className="px-4 py-1.5">
                  <div className="flex items-center justify-end gap-0.5">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star
                        key={n}
                        className={`h-3 w-3 ${
                          n <= it.score
                            ? "fill-amber-400 text-amber-400"
                            : "fill-transparent text-foreground/20"
                        }`}
                        strokeWidth={1.5}
                      />
                    ))}
                  </div>
                </td>
              </tr>
            ));
          })}
        </tbody>
      </table>
    </article>
  );
}

function HeaderField({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={`border-r border-foreground/15 px-4 py-3 last:border-r-0 ${className}`}>
      <div className="text-[10px] font-bold uppercase tracking-widest text-foreground/50">
        {label}
      </div>
      <div className="mt-0.5 truncate text-sm font-semibold">{value}</div>
    </div>
  );
}
