"use client";

import { useEffect, useMemo, useRef } from "react";
import { useMessages, useTranslations } from "next-intl";
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  Database,
  ExternalLink,
  Loader2,
  RefreshCw,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type {
  WafGenieRecommendation,
  WafRecommendationBatch,
} from "@/lib/engines/waf-assessment/types";

export const MAX_RECOMMENDATION_AUTO_RETRIES = 4;
const RECOMMENDATION_RETRY_BASE_DELAY_MS = 2_000;
const RECOMMENDATION_RETRY_MAX_DELAY_MS = 15_000;

export type RecommendationLoadState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ready" }
  | {
      kind: "transient_error";
      message: string;
      attempt: number;
      retrying: boolean;
    }
  | {
      kind: "terminal_error";
      message: string;
      status: number;
    };

export type RecommendationBatchPhase =
  | "not_started"
  | "running"
  | "completed"
  | "partial"
  | "failed";

export interface RecommendationBatchPresentation {
  processed: number;
  phase: RecommendationBatchPhase;
}

export function isTerminalRecommendationHttpStatus(status: number): boolean {
  return status >= 401 && status <= 404;
}

export function recommendationRetryDelayMs(attempt: number): number {
  const normalizedAttempt = Math.max(1, Math.floor(attempt));
  return Math.min(
    RECOMMENDATION_RETRY_BASE_DELAY_MS * 2 ** (normalizedAttempt - 1),
    RECOMMENDATION_RETRY_MAX_DELAY_MS,
  );
}

export function getRecommendationBatchPresentation(
  batch: WafRecommendationBatch,
): RecommendationBatchPresentation {
  const processed = batch.completed + batch.failed;
  if (batch.setupStatus === "failed" || batch.status === "failed") {
    return { processed, phase: "failed" };
  }
  if (batch.status === "partial") {
    return { processed, phase: "partial" };
  }
  if (batch.setupStatus === "running" || batch.status === "pending" || batch.status === "running") {
    return { processed, phase: "running" };
  }
  if (batch.status === "completed") {
    return { processed, phase: "completed" };
  }
  return { processed, phase: "not_started" };
}

function safeHttpsUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function StatusBadge({ item }: { item: WafGenieRecommendation }) {
  const t = useTranslations("assessment.recommendations");
  if (item.status === "completed") {
    return (
      <Badge variant="default" className="gap-1">
        <CheckCircle2 className="h-3 w-3" /> {t("completed")}
      </Badge>
    );
  }
  if (item.status === "failed") {
    return (
      <Badge variant="destructive" className="gap-1">
        <AlertCircle className="h-3 w-3" /> {t("failed")}
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="gap-1">
      <Loader2 className="h-3 w-3 animate-spin" />{" "}
      {item.status === "running" ? t("running") : t("pending")}
    </Badge>
  );
}

function RecommendationCard({
  item,
  genieUrl,
}: {
  item: WafGenieRecommendation;
  genieUrl: string | null;
}) {
  const t = useTranslations("assessment.recommendations");
  const messages = useMessages() as {
    assessment?: {
      controls?: Record<string, { best_practice?: string; principle?: string }>;
    };
  };
  const localizedControl = messages.assessment?.controls?.[item.wafId];
  const citations = item.citations.map(safeHttpsUrl).filter((url): url is string => url !== null);
  const documentation = item.documentationUrls
    .map(safeHttpsUrl)
    .filter((url): url is string => url !== null);
  const safeGenieUrl = genieUrl ? safeHttpsUrl(genieUrl) : null;

  return (
    <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="font-mono text-xs text-muted-foreground">{item.wafId}</div>
          <h3 className="mt-1 text-base font-semibold">
            {localizedControl?.best_practice ?? item.bestPractice}
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {localizedControl?.principle ?? item.principle}
          </p>
        </div>
        <StatusBadge item={item} />
      </div>

      {(item.status === "pending" || item.status === "running") && (
        <div className="mt-4 flex items-center gap-2 rounded-md bg-muted/50 p-3 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t("analysis_in_progress")}
        </div>
      )}

      {item.status === "failed" && (
        <div className="mt-4 rounded-md border border-destructive/30 bg-destructive/5 p-3">
          <p className="text-sm font-medium text-destructive">{t("analysis_failed")}</p>
          <p className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">
            {item.errorMessage ?? t("unknown_error")}
          </p>
          {item.errorCode && (
            <code className="mt-2 inline-block text-[11px] text-muted-foreground">
              {item.errorCode}
            </code>
          )}
        </div>
      )}

      {item.reportMarkdown && (
        <div className="mt-4">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t("agent_report")}
          </h4>
          <div className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">
            {item.reportMarkdown}
          </div>
        </div>
      )}

      {item.evidence.length > 0 && (
        <div className="mt-4 space-y-2">
          <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <Database className="h-3.5 w-3.5" />
            {t("sql_evidence", { count: item.queryCount })}
          </h4>
          {item.evidence.map((evidence, index) => (
            <details
              key={evidence.callId}
              className="rounded-md border border-border/70 bg-muted/20 p-3"
            >
              <summary className="cursor-pointer text-sm font-medium">
                {evidence.title || t("query_number", { number: index + 1 })}
              </summary>
              {evidence.sql && (
                <pre className="mt-3 max-h-64 overflow-auto rounded bg-background p-3 text-xs leading-relaxed">
                  <code>{evidence.sql}</code>
                </pre>
              )}
              {evidence.columns.length > 0 && evidence.previewRows.length > 0 ? (
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full border-collapse text-xs">
                    <thead>
                      <tr>
                        {evidence.columns.map((column, columnIndex) => (
                          <th
                            key={`${evidence.callId}-${column.name}-${columnIndex}`}
                            className="border border-border px-2 py-1 text-left font-medium"
                          >
                            {column.name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {evidence.previewRows.slice(0, 20).map((row, rowIndex) => (
                        <tr key={`${evidence.callId}-row-${rowIndex}`}>
                          {row.map((cell, columnIndex) => (
                            <td
                              key={`${evidence.callId}-${rowIndex}-${columnIndex}`}
                              className="border border-border px-2 py-1 align-top"
                            >
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : evidence.output ? (
                <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap rounded bg-background p-3 text-xs">
                  {evidence.output}
                </pre>
              ) : null}
            </details>
          ))}
        </div>
      )}

      {(documentation.length > 0 || citations.length > 0 || safeGenieUrl) && (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-border/60 pt-3">
          {documentation.map((url, index) => (
            <Button key={url} size="sm" variant="outline" asChild>
              <a href={url} target="_blank" rel="noopener noreferrer">
                <BookOpen className="mr-1.5 h-3.5 w-3.5" />
                {t("documentation_link", { number: index + 1 })}
              </a>
            </Button>
          ))}
          {citations.map((url, index) => (
            <Button key={url} size="sm" variant="outline" asChild>
              <a href={url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                {t("data_citation", { number: index + 1 })}
              </a>
            </Button>
          ))}
          {safeGenieUrl && (
            <Button size="sm" variant="outline" asChild>
              <a href={safeGenieUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                {t("open_genie")}
              </a>
            </Button>
          )}
        </div>
      )}
    </section>
  );
}

export interface RecommendationsDialogProps {
  open: boolean;
  batch: WafRecommendationBatch | null;
  loadState: RecommendationLoadState;
  selectedWafId: string | null;
  genieUrl: string | null;
  onClose: () => void;
  onRetry: () => void;
}

export function RecommendationsDialog({
  open,
  batch,
  loadState,
  selectedWafId,
  genieUrl,
  onClose,
  onRetry,
}: RecommendationsDialogProps) {
  const t = useTranslations("assessment.recommendations");
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const presentation = batch ? getRecommendationBatchPresentation(batch) : null;
  const items = useMemo(() => {
    if (!batch) return [];
    return selectedWafId ? batch.items.filter((item) => item.wafId === selectedWafId) : batch.items;
  }, [batch, selectedWafId]);

  useEffect(() => {
    if (!open) return;
    previousFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;

      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          "a[href], button:not([disabled]), summary, input:not([disabled]), " +
            "select:not([disabled]), textarea:not([disabled]), " +
            '[tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => element.tabIndex >= 0 && element.getClientRects().length > 0);
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !dialogRef.current.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !dialogRef.current.contains(active))) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocusRef.current?.focus();
    };
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="waf-recommendations-title"
        className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-border bg-background shadow-2xl"
      >
        <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div>
            <h2 id="waf-recommendations-title" className="text-lg font-semibold">
              {selectedWafId ? t("title_for_control", { wafId: selectedWafId }) : t("title")}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground" aria-live="polite" aria-atomic="true">
              {batch
                ? t("progress", {
                    processed: presentation?.processed ?? 0,
                    completed: batch.completed,
                    failed: batch.failed,
                    total: batch.total,
                  })
                : loadState.kind === "loading"
                  ? t("loading")
                  : t("unavailable")}
            </p>
          </div>
          <Button
            ref={closeRef}
            size="icon"
            variant="ghost"
            onClick={onClose}
            aria-label={t("close")}
          >
            <X className="h-4 w-4" />
          </Button>
        </header>

        <div className="space-y-4 overflow-y-auto p-5">
          {loadState.kind === "transient_error" && (
            <div
              role={loadState.retrying ? "status" : "alert"}
              aria-live={loadState.retrying ? "polite" : "assertive"}
              className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-amber-500/40 bg-amber-50/60 p-3 text-sm dark:bg-amber-950/20"
            >
              <div className="flex min-w-0 items-start gap-2">
                {loadState.retrying ? (
                  <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-amber-600" />
                ) : (
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                )}
                <div>
                  <p className="font-medium">{t("refresh_failed")}</p>
                  <p className="mt-0.5 break-words text-xs text-muted-foreground">
                    {loadState.message}
                  </p>
                  {loadState.retrying && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t("retrying", {
                        attempt: loadState.attempt,
                        max: MAX_RECOMMENDATION_AUTO_RETRIES,
                      })}
                    </p>
                  )}
                </div>
              </div>
              {!loadState.retrying && (
                <Button size="sm" variant="outline" onClick={onRetry}>
                  <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                  {t("retry")}
                </Button>
              )}
            </div>
          )}

          {loadState.kind === "terminal_error" && (
            <div
              role="alert"
              aria-live="assertive"
              className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm"
            >
              <div className="flex min-w-0 items-start gap-2">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                <div>
                  <p className="font-medium text-destructive">
                    {t("terminal_error", { status: loadState.status })}
                  </p>
                  <p className="mt-0.5 break-words text-xs text-muted-foreground">
                    {loadState.message}
                  </p>
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={onRetry}>
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                {t("retry")}
              </Button>
            </div>
          )}

          {batch?.setupStatus === "failed" && (
            <div
              role="alert"
              aria-live="assertive"
              className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm"
            >
              <div className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                <div>
                  <p className="font-medium text-destructive">{t("setup_failed")}</p>
                  <p className="mt-0.5 whitespace-pre-wrap text-xs text-muted-foreground">
                    {batch.setupError ?? t("unknown_error")}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">{t("setup_retry_hint")}</p>
                </div>
              </div>
            </div>
          )}

          {batch && batch.setupStatus !== "failed" && presentation?.phase === "running" && (
            <div
              role="status"
              aria-live="polite"
              className="flex items-center gap-2 rounded-md border border-border bg-muted/30 p-3 text-sm text-muted-foreground"
            >
              <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
              {t("batch_running", {
                processed: presentation.processed,
                total: batch.total,
              })}
            </div>
          )}

          {batch && batch.setupStatus !== "failed" && presentation?.phase === "completed" && (
            <div
              role="status"
              aria-live="polite"
              className="flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-50/60 p-3 text-sm text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-300"
            >
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              {t("batch_completed", { total: batch.total })}
            </div>
          )}

          {batch && batch.setupStatus !== "failed" && presentation?.phase === "partial" && (
            <div
              role="alert"
              aria-live="assertive"
              className="flex items-center gap-2 rounded-md border border-amber-500/40 bg-amber-50/60 p-3 text-sm text-amber-900 dark:bg-amber-950/20 dark:text-amber-200"
            >
              <AlertCircle className="h-4 w-4 shrink-0" />
              {t("batch_partial", {
                completed: batch.completed,
                failed: batch.failed,
                total: batch.total,
              })}
            </div>
          )}

          {batch && batch.setupStatus !== "failed" && presentation?.phase === "failed" && (
            <div
              role="alert"
              aria-live="assertive"
              className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive"
            >
              <AlertCircle className="h-4 w-4 shrink-0" />
              {t("batch_failed", { failed: batch.failed, total: batch.total })}
            </div>
          )}

          {!batch && loadState.kind === "loading" ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> {t("loading")}
            </div>
          ) : !batch &&
            (loadState.kind === "transient_error" || loadState.kind === "terminal_error") ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{t("unavailable")}</p>
          ) : batch?.setupStatus === "failed" && items.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {t("setup_no_results")}
            </p>
          ) : items.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">{t("empty")}</p>
          ) : (
            items.map((item) => (
              <RecommendationCard key={item.id} item={item} genieUrl={genieUrl} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
