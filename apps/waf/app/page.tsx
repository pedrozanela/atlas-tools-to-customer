"use client";

/**
 * WAF Assessment page.
 *
 * Customer-facing self-assessment against the Databricks Well-Architected
 * Framework. Runs deterministic SQL over `system.*` (OBO) and renders:
 *
 *   1. Per-pillar score cards (Governance / Reliability / Cost / Performance)
 *   2. Failing controls drill-down + per-pillar drill-downs
 *   3. "Fix with Forge" deep-link for controls mapped to a Forge engine
 *   4. CSV export for offline reporting
 *   5. History table with one-click compare against the latest run
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useLocale, useMessages, useTranslations } from "next-intl";
import { useL10n } from "@/i18n/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  getRecommendationBatchPresentation,
  isTerminalRecommendationHttpStatus,
  MAX_RECOMMENDATION_AUTO_RETRIES,
  recommendationRetryDelayMs,
  RecommendationsDialog,
  type RecommendationLoadState,
} from "@/components/recommendations-dialog";
import { toast } from "sonner";
import {
  Activity,
  AlertCircle,
  ArrowLeftRight,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Download,
  ExternalLink,
  Gauge,
  Loader2,
  MessageCircle,
  PiggyBank,
  Play,
  Plug,
  RotateCcw,
  Scale,
  ShieldCheck,
  Target,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import { PILLAR_LABEL } from "@/lib/engines/waf-assessment/types";
import { getCrossReference } from "@/lib/engines/waf-assessment/cross-references";
import type {
  WafAssessmentDetail,
  WafAssessmentSummary,
  WafControl,
  WafRecommendationBatch,
  WafIgnoredResource,
  WafPillar,
  WafQualitativeAnswer,
  WafQualitativeResponse,
} from "@/lib/engines/waf-assessment/types";

interface ApiState {
  latest: WafAssessmentDetail | null;
  history: WafAssessmentSummary[];
  qualitativeControls: WafControl[];
  qualitativeResponses: WafQualitativeResponse[];
  ignored: WafIgnoredResource[];
}

type RecommendationFetchResult =
  | { kind: "success"; batch: WafRecommendationBatch }
  | { kind: "transient_error"; message: string }
  | { kind: "terminal_error"; message: string; status: number };

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

async function responseErrorMessage(response: Response): Promise<string> {
  const fallback = `Request failed (${response.status})`;
  const body = await response.text().catch(() => "");
  if (!body) return fallback;
  try {
    const parsed = JSON.parse(body) as {
      error?: string | { message?: string };
      message?: string;
    };
    if (typeof parsed.error === "string") return parsed.error;
    if (parsed.error?.message) return parsed.error.message;
    if (parsed.message) return parsed.message;
  } catch {
    // Fall through to a short text response.
  }
  return body.slice(0, 500);
}

const PILLAR_ORDER: WafPillar[] = [
  "governance",
  "interoperability_usability",
  "operational_excellence",
  "security_compliance_privacy",
  "reliability",
  "performance_efficiency",
  "cost_optimisation",
];

/**
 * Mirrors the Databricks WAF documentation taxonomy:
 *   - Lakehouse-specific pillars: how data/AI is governed, discovered, used.
 *   - Common pillars: equivalent to AWS / Azure WAF (ops, sec, reliability,
 *     perf, cost).
 * Used to group the score cards into two sections so the visual structure
 * mirrors docs.databricks.com/.../lakehouse-architecture/well-architected.
 */
const LAKEHOUSE_PILLARS: WafPillar[] = ["governance", "interoperability_usability"];
const COMMON_PILLARS: WafPillar[] = [
  "operational_excellence",
  "security_compliance_privacy",
  "reliability",
  "performance_efficiency",
  "cost_optimisation",
];

function scoreToVariant(score: number | null | undefined): "default" | "secondary" | "destructive" {
  if (score == null) return "secondary";
  if (score >= 75) return "default";
  if (score >= 40) return "secondary";
  return "destructive";
}

const PILLAR_ICON: Record<WafPillar, LucideIcon> = {
  governance: Scale,
  interoperability_usability: Plug,
  operational_excellence: Workflow,
  security_compliance_privacy: ShieldCheck,
  reliability: Activity,
  performance_efficiency: Gauge,
  cost_optimisation: PiggyBank,
};

/**
 * Semantic status styling for score cards. Mature should not look the
 * same as a brand-red CTA — pick colours that convey green/amber/red
 * health at a glance.
 */
function scoreStatusStyles(score: number | null | undefined): {
  badge: string;
  bar: string;
  accent: string;
} {
  if (score == null) {
    return {
      badge:
        "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
      bar: "bg-slate-400 dark:bg-slate-600",
      accent: "text-slate-500",
    };
  }
  if (score >= 75) {
    return {
      badge:
        "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800",
      bar: "bg-emerald-500",
      accent: "text-emerald-600 dark:text-emerald-400",
    };
  }
  if (score >= 50) {
    return {
      badge:
        "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800",
      bar: "bg-amber-500",
      accent: "text-amber-600 dark:text-amber-400",
    };
  }
  if (score >= 25) {
    return {
      badge:
        "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/40 dark:text-orange-300 dark:border-orange-800",
      bar: "bg-orange-500",
      accent: "text-orange-600 dark:text-orange-400",
    };
  }
  return {
    badge:
      "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/40 dark:text-rose-300 dark:border-rose-800",
    bar: "bg-rose-500",
    accent: "text-rose-600 dark:text-rose-400",
  };
}

function useControlText() {
  const messages = useMessages() as {
    assessment?: { controls?: Record<string, { best_practice?: string; principle?: string }> };
  };
  return useCallback(
    (
      wafId: string,
      fallback: { bestPractice: string; principle: string },
    ): { bestPractice: string; principle: string } => {
      const entry = messages?.assessment?.controls?.[wafId];
      return {
        bestPractice: entry?.best_practice ?? fallback.bestPractice,
        principle: entry?.principle ?? fallback.principle,
      };
    },
    [messages],
  );
}

function useScoreLabel() {
  const t = useTranslations("assessment.score_label");
  return useCallback(
    (score: number | null | undefined): string => {
      if (score == null) return t("none");
      if (score >= 75) return t("mature");
      if (score >= 50) return t("progressing");
      if (score >= 25) return t("at_risk");
      return t("critical");
    },
    [t],
  );
}

type FixActionLabelKey = "fix_with_forge" | "open_estate" | "ask_forge" | "open_docs";
type FixAction =
  | { kind: "engine"; href: string; labelKey: FixActionLabelKey }
  | { kind: "docs"; href: string; labelKey: FixActionLabelKey };

/** Allow only http(s) absolute URLs or root-relative paths — blocks `javascript:`, `data:`, etc. */
const SAFE_HREF_RE = /^(https?:\/\/|\/)/;

function safeDocHref(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return SAFE_HREF_RE.test(value) ? value : null;
}

function fixAction(engine: string | null, paramsJson: string | null): FixAction | null {
  if (!engine) return null;
  let params: Record<string, unknown> = {};
  if (paramsJson) {
    try {
      params = JSON.parse(paramsJson);
    } catch {
      params = {};
    }
  }
  switch (engine) {
    case "comment-engine":
      return { kind: "engine", href: "/environment/comments", labelKey: "fix_with_forge" };
    case "estate-scan": {
      const reasonRaw = typeof params.reason === "string" ? params.reason : "";
      const reason = /^[a-z][a-z0-9-]{0,40}$/.test(reasonRaw) ? reasonRaw : "";
      const href = reason ? `/environment?reason=${reason}` : "/environment";
      return { kind: "engine", href, labelKey: "open_estate" };
    }
    case "tag-engine":
      return { kind: "engine", href: "/environment?tab=governance", labelKey: "fix_with_forge" };
    case "ask-forge": {
      const personaRaw = typeof params.persona === "string" ? params.persona : "";
      const persona = /^[a-z-]{1,32}$/.test(personaRaw) ? personaRaw : "tech";
      return { kind: "engine", href: `/ask-forge?persona=${persona}`, labelKey: "ask_forge" };
    }
    case "docs":
    default: {
      const href = safeDocHref(params.href);
      return href ? { kind: "docs", href, labelKey: "open_docs" } : null;
    }
  }
}

function CrossRefBadges({ wafId, pillar }: { wafId: string; pillar: WafPillar }) {
  const refs = getCrossReference(wafId, pillar);
  return (
    <div className="mt-2 flex flex-wrap gap-1">
      <a
        href={refs.awsHref}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        title={refs.awsLabel}
      >
        {refs.awsLabel}
      </a>
      <a
        href={refs.azureHref}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        title={refs.azureLabel}
      >
        {refs.azureLabel}
      </a>
    </div>
  );
}

function pillarScoreFor(s: WafAssessmentSummary | null, p: WafPillar): number | null {
  if (!s) return null;
  if (p === "governance") return s.governanceScore;
  if (p === "interoperability_usability") return s.iuScore;
  if (p === "operational_excellence") return s.oeScore;
  if (p === "security_compliance_privacy") return s.scpScore;
  if (p === "reliability") return s.reliabilityScore;
  if (p === "cost_optimisation") return s.costScore;
  if (p === "performance_efficiency") return s.performanceScore;
  return null;
}

/** Build a CSV string + trigger a download. Client-side only. */
function downloadCsv(latest: WafAssessmentDetail): void {
  const headers = [
    "waf_id",
    "pillar",
    "principle",
    "best_practice",
    "score_percentage",
    "threshold_percentage",
    "met",
    "recommendation",
  ];
  // Cells starting with these characters are interpreted as formulas by
  // Excel/Sheets/Numbers — prefix with a single quote to neutralise.
  const FORMULA_LEAD = /^[=+\-@\t\r]/;
  const escape = (raw: string) => {
    const s = FORMULA_LEAD.test(raw) ? `'${raw}` : raw;
    return `"${s.replace(/"/g, '""')}"`;
  };
  const rows = latest.results.map((r) =>
    [
      r.wafId,
      PILLAR_LABEL[r.pillar],
      r.control.principle,
      r.control.bestPractice,
      r.scorePercentage.toFixed(1),
      r.thresholdPercentage.toFixed(0),
      r.thresholdMet ? "yes" : "no",
      r.control.recommendationIfNotMet ?? "",
    ]
      .map((v) => escape(String(v)))
      .join(","),
  );
  const csv = [headers.map(escape).join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const date = (latest.completedAt ?? latest.createdAt).slice(0, 10);
  a.href = url;
  a.download = `waf-assessment-${date}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function AssessmentPage() {
  const locale = useLocale();
  const tPage = useTranslations("assessment.page");
  const tEmpty = useTranslations("assessment.empty_state");
  const tPartial = useTranslations("assessment.partial_run");
  const tTabs = useTranslations("assessment.tabs");
  const tToasts = useTranslations("assessment.toasts");
  const tShortPillar = useTranslations("assessment.pillar_short");
  const [data, setData] = useState<ApiState | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [genieUrl, setGenieUrl] = useState<string | null>(null);
  const [recommendationBatch, setRecommendationBatch] = useState<WafRecommendationBatch | null>(
    null,
  );
  const [recommendationLoadState, setRecommendationLoadState] = useState<RecommendationLoadState>({
    kind: "idle",
  });
  const [recommendationRetryNonce, setRecommendationRetryNonce] = useState(0);
  const refreshSequenceRef = useRef(0);
  const recommendationPollSequenceRef = useRef(0);
  const recommendationAssessmentRef = useRef<string | null>(null);
  const [recommendationsOpen, setRecommendationsOpen] = useState(false);
  const [selectedRecommendation, setSelectedRecommendation] = useState<string | null>(null);

  const refreshAssets = useCallback(async () => {
    try {
      const res = await fetch("/waf/api/assets", { cache: "no-store" });
      if (!res.ok) return;
      const json = (await res.json()) as {
        genie: { url: string } | null;
      };
      setGenieUrl(json.genie?.url ?? null);
    } catch {
      // Best-effort; Run will provision the Agent when needed.
    }
  }, []);

  useEffect(() => {
    void refreshAssets();
  }, [refreshAssets]);

  const refresh = useCallback(
    async (signal?: AbortSignal) => {
      const sequence = ++refreshSequenceRef.current;
      try {
        const res = await fetch("/waf/api", { cache: "no-store", signal });
        if (!res.ok) throw new Error(`Failed to load assessment (${res.status})`);
        const json = (await res.json()) as ApiState;
        if (signal?.aborted || sequence !== refreshSequenceRef.current) return;
        setData(json);
      } catch (error) {
        if (signal?.aborted || sequence !== refreshSequenceRef.current || isAbortError(error))
          return;
        const message = error instanceof Error ? error.message : tToasts("load_failed");
        toast.error(message);
      } finally {
        if (!signal?.aborted && sequence === refreshSequenceRef.current) {
          setLoading(false);
        }
      }
    },
    [tToasts],
  );

  useEffect(() => {
    const controller = new AbortController();
    void refresh(controller.signal);
    return () => controller.abort();
  }, [refresh]);

  const loadRecommendations = useCallback(
    async (assessmentId: string, signal: AbortSignal): Promise<RecommendationFetchResult> => {
      try {
        const res = await fetch(
          `/waf/api/recommendations?assessmentId=${encodeURIComponent(assessmentId)}`,
          { cache: "no-store", signal },
        );
        if (!res.ok) {
          const message = await responseErrorMessage(res);
          return isTerminalRecommendationHttpStatus(res.status)
            ? { kind: "terminal_error", message, status: res.status }
            : { kind: "transient_error", message };
        }
        const batch = (await res.json()) as WafRecommendationBatch;
        if (batch.assessmentId !== assessmentId) {
          return {
            kind: "transient_error",
            message: "The recommendations response belongs to another assessment.",
          };
        }
        return { kind: "success", batch };
      } catch (error) {
        if (signal.aborted || isAbortError(error)) throw error;
        return {
          kind: "transient_error",
          message: error instanceof Error ? error.message : "Network request failed.",
        };
      }
    },
    [],
  );

  const latestAssessmentId = data?.latest?.assessmentId ?? null;
  const activeRecommendationBatch =
    recommendationBatch?.assessmentId === latestAssessmentId ? recommendationBatch : null;
  const activeRecommendationPresentation = activeRecommendationBatch
    ? getRecommendationBatchPresentation(activeRecommendationBatch)
    : null;
  useEffect(() => {
    const sequence = ++recommendationPollSequenceRef.current;
    const controller = new AbortController();
    recommendationAssessmentRef.current = latestAssessmentId;
    setRecommendationBatch((current) =>
      current?.assessmentId === latestAssessmentId ? current : null,
    );
    if (!latestAssessmentId) {
      setRecommendationLoadState({ kind: "idle" });
      return () => controller.abort();
    }
    setRecommendationLoadState({ kind: "loading" });
    let timer: ReturnType<typeof setTimeout> | null = null;
    let failureCount = 0;
    const isCurrent = () =>
      !controller.signal.aborted &&
      sequence === recommendationPollSequenceRef.current &&
      recommendationAssessmentRef.current === latestAssessmentId;
    const schedule = (delayMs: number) => {
      if (!isCurrent()) return;
      timer = setTimeout(poll, delayMs);
    };
    const poll = async () => {
      let result: RecommendationFetchResult;
      try {
        result = await loadRecommendations(latestAssessmentId, controller.signal);
      } catch (error) {
        if (controller.signal.aborted || isAbortError(error)) return;
        result = {
          kind: "transient_error",
          message: error instanceof Error ? error.message : "Network request failed.",
        };
      }
      if (!isCurrent()) {
        return;
      }

      if (result.kind === "terminal_error") {
        setRecommendationLoadState(result);
        return;
      }

      if (result.kind === "transient_error") {
        failureCount += 1;
        const retrying = failureCount < MAX_RECOMMENDATION_AUTO_RETRIES;
        setRecommendationLoadState({
          kind: "transient_error",
          message: result.message,
          attempt: failureCount,
          retrying,
        });
        if (retrying) {
          schedule(recommendationRetryDelayMs(failureCount));
        }
        return;
      }

      failureCount = 0;
      const { batch } = result;
      setRecommendationBatch(batch);
      setRecommendationLoadState({ kind: "ready" });
      if (
        batch.setupStatus === "running" ||
        batch.status === "pending" ||
        batch.status === "running"
      ) {
        schedule(5_000);
      }
    };
    void poll();
    return () => {
      controller.abort();
      if (timer) clearTimeout(timer);
    };
  }, [latestAssessmentId, loadRecommendations, recommendationRetryNonce]);

  const runAssessment = useCallback(async () => {
    if (loading || running) return;
    setRunning(true);
    recommendationAssessmentRef.current = null;
    recommendationPollSequenceRef.current += 1;
    setRecommendationBatch(null);
    setRecommendationLoadState({ kind: "idle" });
    setRecommendationsOpen(false);
    setSelectedRecommendation(null);
    try {
      const res = await fetch("/waf/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Run failed (${res.status})`);
      }
      const summary = (await res.json()) as WafAssessmentSummary & {
        genie: { spaceUrl: string } | null;
        recommendations: { total: number } | null;
        automationError: string | null;
      };
      if (summary.status === "failed") {
        toast.error(summary.errorMessage ?? tToasts("failed"));
      } else if (summary.automationError) {
        toast.warning(tToasts("completed_with_agent_warning"), {
          description: summary.automationError,
        });
      } else if ((summary.recommendations?.total ?? 0) > 0) {
        toast.success(
          tToasts("completed_with_recommendations", {
            count: summary.recommendations?.total ?? 0,
          }),
        );
      } else {
        toast.success(tToasts("completed"));
      }
      recommendationAssessmentRef.current = summary.assessmentId;
      if (summary.genie?.spaceUrl) setGenieUrl(summary.genie.spaceUrl);
      await refresh();
      void refreshAssets();
    } catch (error) {
      const message = error instanceof Error ? error.message : tToasts("start_failed");
      toast.error(message);
    } finally {
      setRunning(false);
    }
  }, [loading, locale, refresh, refreshAssets, running, tToasts]);

  const openRecommendations = useCallback((wafId: string | null = null) => {
    setSelectedRecommendation(wafId);
    setRecommendationsOpen(true);
  }, []);

  const closeRecommendations = useCallback(() => {
    setRecommendationsOpen(false);
    setSelectedRecommendation(null);
  }, []);

  const retryRecommendations = useCallback(() => {
    setRecommendationRetryNonce((current) => current + 1);
  }, []);

  const saveQualitative = useCallback(
    async (input: { wafId: string; response: WafQualitativeAnswer; notes: string | null }) => {
      const res = await fetch("/waf/api/qualitative", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Save failed (${res.status})`);
      }
      await refresh();
    },
    [refresh],
  );

  const ignoreControl = useCallback(
    async (wafId: string) => {
      const reason = window.prompt(tToasts("ignore_prompt", { wafId }));
      if (!reason || !reason.trim()) return;
      const res = await fetch("/waf/api/ignored", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wafId, reason: reason.trim() }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error(body.error ?? tToasts("ignore_failed", { wafId }));
        return;
      }
      toast.success(tToasts("ignored_success", { wafId }));
      await refresh();
    },
    [refresh, tToasts],
  );

  const restoreIgnored = useCallback(
    async (id: string, wafId: string) => {
      const res = await fetch("/waf/api/ignored", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error(body.error ?? tToasts("restore_failed", { wafId }));
        return;
      }
      toast.success(tToasts("restore_success", { wafId }));
      await refresh();
    },
    [refresh, tToasts],
  );

  const latest = data?.latest ?? null;

  const notMet = useMemo(() => {
    if (!latest) return [];
    return latest.results
      .filter((r) => !r.thresholdMet)
      .sort((a, b) => a.scorePercentage - b.scorePercentage);
  }, [latest]);

  const byPillar = useMemo(() => {
    const map: Record<WafPillar, WafAssessmentDetail["results"]> = {
      governance: [],
      interoperability_usability: [],
      operational_excellence: [],
      security_compliance_privacy: [],
      reliability: [],
      cost_optimisation: [],
      performance_efficiency: [],
    };
    if (!latest) return map;
    for (const r of latest.results) {
      map[r.pillar].push(r);
    }
    for (const p of PILLAR_ORDER) {
      map[p].sort((a, b) => {
        if (a.thresholdMet !== b.thresholdMet) return a.thresholdMet ? 1 : -1;
        return a.scorePercentage - b.scorePercentage;
      });
    }
    return map;
  }, [latest]);

  const pillarStats = useMemo(() => {
    const stats: Record<WafPillar, { met: number; total: number }> = {
      governance: { met: 0, total: 0 },
      interoperability_usability: { met: 0, total: 0 },
      operational_excellence: { met: 0, total: 0 },
      security_compliance_privacy: { met: 0, total: 0 },
      reliability: { met: 0, total: 0 },
      cost_optimisation: { met: 0, total: 0 },
      performance_efficiency: { met: 0, total: 0 },
    };
    for (const p of PILLAR_ORDER) {
      const rows = byPillar[p];
      stats[p] = {
        met: rows.filter((r) => r.thresholdMet).length,
        total: rows.length,
      };
    }
    return stats;
  }, [byPillar]);

  return (
    <div data-atlas-tour="waf-assessment" className="mx-auto max-w-[1400px] space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{tPage("title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {tPage("subtitle_pre")} <code className="text-xs">system.*</code>{" "}
            {tPage("subtitle_post")}
          </p>
        </div>
        <div data-atlas-tour="waf-header-actions" className="flex flex-wrap items-center gap-2">
          <Button data-atlas-tour="waf-run" onClick={runAssessment} disabled={loading || running}>
            {running ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Play className="mr-2 h-4 w-4" />
            )}
            {latest ? tPage("rerun_assessment") : tPage("run_assessment")}
          </Button>
          {genieUrl && (
            <Button
              variant="outline"
              onClick={() => window.open(genieUrl, "_blank", "noopener")}
              title={tPage("open_genie_title")}
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              {tPage("open_genie")}
            </Button>
          )}
          {latest && notMet.length > 0 && (
            <Button
              variant="outline"
              onClick={() => openRecommendations(null)}
              disabled={loading || running}
              aria-busy={
                recommendationLoadState.kind === "loading" ||
                (recommendationLoadState.kind === "transient_error" &&
                  recommendationLoadState.retrying) ||
                activeRecommendationPresentation?.phase === "running"
              }
            >
              {recommendationLoadState.kind === "loading" ||
              (recommendationLoadState.kind === "transient_error" &&
                recommendationLoadState.retrying) ||
              activeRecommendationPresentation?.phase === "running" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : recommendationLoadState.kind === "terminal_error" ||
                recommendationLoadState.kind === "transient_error" ||
                activeRecommendationPresentation?.phase === "partial" ||
                activeRecommendationPresentation?.phase === "failed" ? (
                <AlertCircle className="mr-2 h-4 w-4" />
              ) : (
                <MessageCircle className="mr-2 h-4 w-4" />
              )}
              {tPage("recommendations")}
              {activeRecommendationBatch && activeRecommendationBatch.total > 0
                ? ` (${activeRecommendationPresentation?.processed ?? 0}/${activeRecommendationBatch.total})`
                : ""}
            </Button>
          )}
          {latest && (
            <div className="ml-1 flex items-center gap-2 border-l border-border pl-3">
              <Button variant="outline" onClick={() => downloadCsv(latest)}>
                <Download className="mr-2 h-4 w-4" /> {tPage("export_csv")}
              </Button>
              <Button
                variant="outline"
                onClick={() => window.open(`/waf/report/${latest.assessmentId}`, "_blank")}
                title={tPage("open_pdf_title")}
              >
                <Download className="mr-2 h-4 w-4" /> PDF
              </Button>
            </div>
          )}
        </div>
      </div>

      {loading && !data ? (
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : !latest && (data?.history.length ?? 0) > 0 ? (
        <div className="space-y-4">
          <Card className="border-amber-500/40 bg-amber-50/50 dark:bg-amber-950/20">
            <CardContent className="flex items-start gap-3 py-4 text-sm">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <div>
                <p className="font-medium">{tEmpty("failed_title")}</p>
                <p className="mt-1 text-muted-foreground">
                  {data?.history[0]?.errorMessage ?? tEmpty("failed_description")}
                </p>
              </div>
            </CardContent>
          </Card>
          <HistoryTable history={data?.history ?? []} latestId="" />
        </div>
      ) : !latest ? (
        <Card>
          <CardHeader>
            <CardTitle>{tEmpty("title")}</CardTitle>
            <CardDescription>
              {tEmpty("description_pre")} <strong>{tEmpty("description_run")}</strong>{" "}
              {tEmpty("description_post")}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <>
          <ScoreOverview
            summary={latest}
            qualitativeAnswered={data?.qualitativeResponses.length ?? 0}
            qualitativeTotal={data?.qualitativeControls.length ?? 0}
          />

          {latest.errorMessage && (
            <Card className="border-amber-500/40 bg-amber-50/50 dark:bg-amber-950/20">
              <CardContent className="flex items-start gap-3 py-4 text-sm">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <div>
                  <p className="font-medium">{tPartial("title")}</p>
                  <p className="mt-1 text-muted-foreground">{latest.errorMessage}</p>
                </div>
              </CardContent>
            </Card>
          )}

          <Tabs data-atlas-tour="waf-controls" defaultValue="failing">
            <ScrollableTabsRow>
              <TabsList className="w-max min-w-full justify-start [&>button]:flex-none">
                <TabsTrigger value="failing">
                  {tTabs("failing", { count: notMet.length })}
                </TabsTrigger>
                {/* Divider between meta-view and the 7 pillar tabs */}
                <span aria-hidden className="mx-1 h-5 w-px shrink-0 self-center bg-border" />
                {PILLAR_ORDER.map((p) => (
                  <TabsTrigger key={p} value={p}>
                    {tShortPillar(p)} ({pillarStats[p].met}/{pillarStats[p].total})
                  </TabsTrigger>
                ))}
                {/* Divider between pillars and the secondary views */}
                <span aria-hidden className="mx-1 h-5 w-px shrink-0 self-center bg-border" />
                <TabsTrigger value="qualitative">
                  {tTabs("qualitative", {
                    answered: data?.qualitativeResponses.length ?? 0,
                    total: data?.qualitativeControls.length ?? 0,
                  })}
                </TabsTrigger>
                <TabsTrigger value="ignored">
                  {tTabs("ignored", { count: data?.ignored.length ?? 0 })}
                </TabsTrigger>
                <TabsTrigger value="history">
                  {tTabs("history", { count: data?.history.length ?? 0 })}
                </TabsTrigger>
              </TabsList>
            </ScrollableTabsRow>

            <TabsContent value="failing" className="mt-4">
              {notMet.length === 0 ? (
                <Card>
                  <CardContent className="flex items-center gap-3 py-8">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    <p className="text-sm">{tTabs("all_passed")}</p>
                  </CardContent>
                </Card>
              ) : (
                <ResultsTable
                  rows={notMet}
                  showPillar
                  onIgnore={ignoreControl}
                  recommendationBatch={activeRecommendationBatch}
                  onOpenRecommendation={openRecommendations}
                  recommendationsDisabled={loading || running}
                />
              )}
            </TabsContent>

            {PILLAR_ORDER.map((p) => (
              <TabsContent key={p} value={p} className="mt-4 space-y-3">
                <PillarHeader
                  pillar={p}
                  score={pillarScoreFor(latest, p)}
                  met={pillarStats[p].met}
                  total={pillarStats[p].total}
                />
                <ResultsTable
                  rows={byPillar[p]}
                  onIgnore={ignoreControl}
                  recommendationBatch={activeRecommendationBatch}
                  onOpenRecommendation={openRecommendations}
                  recommendationsDisabled={loading || running}
                />
              </TabsContent>
            ))}

            <TabsContent value="qualitative" className="mt-4">
              <QualitativeTab
                controls={data?.qualitativeControls ?? []}
                responses={data?.qualitativeResponses ?? []}
                onSave={saveQualitative}
              />
            </TabsContent>

            <TabsContent value="ignored" className="mt-4">
              <IgnoredTab ignored={data?.ignored ?? []} onRestore={restoreIgnored} />
            </TabsContent>

            <TabsContent value="history" className="mt-4">
              <HistoryTable history={data?.history ?? []} latestId={latest.assessmentId} />
            </TabsContent>
          </Tabs>
        </>
      )}

      <RecommendationsDialog
        open={recommendationsOpen}
        batch={activeRecommendationBatch}
        loadState={recommendationLoadState}
        selectedWafId={selectedRecommendation}
        genieUrl={genieUrl}
        onClose={closeRecommendations}
        onRetry={retryRecommendations}
      />
    </div>
  );
}

function ScrollableTabsRow({ children }: { children: React.ReactNode }) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const updateState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateState();
    const onScroll = () => updateState();
    el.addEventListener("scroll", onScroll, { passive: true });
    const ro = new ResizeObserver(updateState);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", onScroll);
      ro.disconnect();
    };
  }, [updateState]);

  const scrollBy = (dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === "left" ? -240 : 240, behavior: "smooth" });
  };

  return (
    <div className="relative">
      <div ref={scrollRef} className="overflow-x-auto">
        {children}
      </div>
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-background to-transparent transition-opacity ${canLeft ? "opacity-100" : "opacity-0"}`}
      />
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-background to-transparent transition-opacity ${canRight ? "opacity-100" : "opacity-0"}`}
      />
      {canLeft && (
        <button
          type="button"
          aria-label="Scroll tabs left"
          onClick={() => scrollBy("left")}
          className="absolute left-1 top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-border/50 bg-background/80 text-foreground/80 shadow-sm backdrop-blur-sm transition hover:bg-background hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      )}
      {canRight && (
        <button
          type="button"
          aria-label="Scroll tabs right"
          onClick={() => scrollBy("right")}
          className="absolute right-1 top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-border/50 bg-background/80 text-foreground/80 shadow-sm backdrop-blur-sm transition hover:bg-background hover:text-foreground"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

function ScoreOverview({
  summary,
  qualitativeAnswered,
  qualitativeTotal,
}: {
  summary: WafAssessmentSummary;
  qualitativeAnswered: number;
  qualitativeTotal: number;
}) {
  const tOverview = useTranslations("assessment.overview");
  const tFullPillar = useTranslations("assessment.pillar_full");
  const getScoreLabel = useScoreLabel();
  const l10n = useL10n();
  const qualitativePending = qualitativeTotal - qualitativeAnswered;
  const overallStyles = scoreStatusStyles(summary.overallScore);
  const overallPct =
    summary.totalControls > 0 ? Math.round((summary.metControls / summary.totalControls) * 100) : 0;
  const qualitativeOk = qualitativeTotal > 0 && qualitativePending === 0;
  const qualitativeStyles = qualitativeOk
    ? scoreStatusStyles(100)
    : qualitativeTotal === 0
      ? scoreStatusStyles(null)
      : scoreStatusStyles(30);

  const renderPillarCard = (p: WafPillar) => {
    const score = pillarScoreFor(summary, p);
    const styles = scoreStatusStyles(score);
    const Icon = PILLAR_ICON[p];
    const pct = score ?? 0;
    return (
      <Card key={p} className="relative overflow-hidden">
        <div className={`absolute inset-x-0 top-0 h-0.5 ${styles.bar}`} />
        <CardHeader className="pb-2 pt-5">
          <div className="flex items-start justify-between gap-2">
            <CardDescription className="text-[11px] font-semibold uppercase leading-tight tracking-wider">
              {tFullPillar(p)}
            </CardDescription>
            <Icon className={`h-4 w-4 shrink-0 ${styles.accent}`} />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <CardTitle className="text-3xl font-bold tracking-tight tabular-nums">
              {score == null ? "—" : l10n.number(score)}
            </CardTitle>
            <span className="text-xs font-medium text-muted-foreground">/100</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div className={`h-full ${styles.bar} transition-all`} style={{ width: `${pct}%` }} />
          </div>
          <span
            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${styles.badge}`}
          >
            {getScoreLabel(score)}
          </span>
        </CardContent>
      </Card>
    );
  };

  return (
    <div data-atlas-tour="waf-score" className="space-y-5">
      {/* Hero row: Overall (horizontal) + Qualitative — compact so the
          full pillar grid fits in the first viewport at 100% zoom. */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="relative overflow-hidden md:col-span-2">
          <div className={`absolute inset-x-0 top-0 h-1 ${overallStyles.bar}`} />
          <div className="grid grid-cols-[auto_1fr] gap-6 px-5 pb-4 pt-4">
            {/* Left: big score + status */}
            <div>
              <div className="flex items-center gap-2">
                <Target className={`h-4 w-4 ${overallStyles.accent}`} />
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {tOverview("overall")}
                </span>
              </div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-4xl font-bold tracking-tight tabular-nums">
                  {summary.overallScore == null ? "—" : l10n.number(summary.overallScore)}
                </span>
                <span className="text-sm font-medium text-muted-foreground">/100</span>
              </div>
              <span
                className={`mt-1 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${overallStyles.badge}`}
              >
                {getScoreLabel(summary.overallScore)}
              </span>
            </div>
            {/* Right: controls met + progress + last run */}
            <div className="flex flex-col justify-center gap-2">
              <div className="flex items-baseline justify-between text-xs">
                <span className="text-muted-foreground">
                  {tOverview("controls_met", {
                    met: summary.metControls,
                    total: summary.totalControls,
                  })}
                </span>
                <span className={`font-semibold tabular-nums ${overallStyles.accent}`}>
                  {overallPct}%
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full ${overallStyles.bar} transition-all`}
                  style={{ width: `${overallPct}%` }}
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                {tOverview("last_run_pre")}{" "}
                {l10n.dateTime(summary.completedAt ?? summary.createdAt)}
              </p>
            </div>
          </div>
        </Card>

        {/* Qualitative — compact horizontal layout to match */}
        <Card className="relative overflow-hidden">
          <div className={`absolute inset-x-0 top-0 h-0.5 ${qualitativeStyles.bar}`} />
          <div className="flex flex-col gap-2 px-5 pb-4 pt-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {tOverview("qualitative")}
              </span>
              <ClipboardList className={`h-4 w-4 ${qualitativeStyles.accent}`} />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-bold tabular-nums">
                {qualitativeAnswered}/{qualitativeTotal || "—"}
              </span>
            </div>
            {qualitativeTotal > 0 && (
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full ${qualitativeStyles.bar} transition-all`}
                  style={{
                    width: `${Math.round((qualitativeAnswered / qualitativeTotal) * 100)}%`,
                  }}
                />
              </div>
            )}
            <span
              className={`inline-flex w-fit items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${qualitativeStyles.badge}`}
            >
              {qualitativeTotal === 0
                ? tOverview("no_controls")
                : qualitativePending === 0
                  ? tOverview("complete")
                  : tOverview("pending", { count: qualitativePending })}
            </span>
          </div>
        </Card>
      </div>

      {/* Lakehouse-specific pillars — Databricks WAF docs grouping */}
      <PillarSectionLabel
        title={tOverview("section_lakehouse")}
        description={tOverview("section_lakehouse_desc")}
      />
      <div className="grid gap-4 md:grid-cols-2">{LAKEHOUSE_PILLARS.map(renderPillarCard)}</div>

      {/* Common pillars — equivalent to AWS / Azure WAF */}
      <PillarSectionLabel
        title={tOverview("section_common")}
        description={tOverview("section_common_desc")}
      />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {COMMON_PILLARS.map(renderPillarCard)}
      </div>
    </div>
  );
}

function PillarSectionLabel({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border/60 pb-1.5">
      <h3 className="text-sm font-semibold tracking-tight text-foreground">{title}</h3>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

function PillarHeader({
  pillar,
  score,
  met,
  total,
}: {
  pillar: WafPillar;
  score: number | null;
  met: number;
  total: number;
}) {
  const tFullPillar = useTranslations("assessment.pillar_full");
  const tHeader = useTranslations("assessment.pillar_header");
  const getScoreLabel = useScoreLabel();
  const l10n = useL10n();
  return (
    <Card>
      <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
        <div>
          <div className="text-sm text-muted-foreground">{tFullPillar(pillar)}</div>
          <div className="mt-1 flex items-baseline gap-3">
            <span className="text-3xl font-semibold tabular-nums">
              {score == null ? "—" : l10n.number(score)}
            </span>
            <Badge variant={scoreToVariant(score)}>{getScoreLabel(score)}</Badge>
          </div>
        </div>
        <div className="text-right text-sm text-muted-foreground">
          <div className="font-medium text-foreground">
            {tHeader("controls_met", { met, total })}
          </div>
          {total > met && (
            <div className="mt-1 text-xs">{tHeader("failing_sorted", { count: total - met })}</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ResultsTable({
  rows,
  showPillar = false,
  onIgnore,
  recommendationBatch,
  onOpenRecommendation,
  recommendationsDisabled = false,
}: {
  rows: WafAssessmentDetail["results"];
  showPillar?: boolean;
  onIgnore?: (wafId: string) => Promise<void>;
  recommendationBatch?: WafRecommendationBatch | null;
  onOpenRecommendation?: (wafId: string) => void;
  recommendationsDisabled?: boolean;
}) {
  const tResults = useTranslations("assessment.results_table");
  const tShortPillar = useTranslations("assessment.pillar_short");
  const tActions = useTranslations("assessment.actions");
  const controlText = useControlText();
  const l10n = useL10n();
  return (
    <Card data-atlas-tour="waf-actions">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">{tResults("control")}</TableHead>
            {showPillar && <TableHead>{tResults("pillar")}</TableHead>}
            <TableHead>{tResults("best_practice")}</TableHead>
            <TableHead className="text-right">{tResults("score")}</TableHead>
            <TableHead className="text-right">{tResults("threshold")}</TableHead>
            <TableHead className="w-[100px]">{tResults("status")}</TableHead>
            <TableHead className="w-[160px]">{tResults("action")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => {
            const action = fixAction(r.control.fixActionEngine, r.control.fixActionParamsJson);
            const recommendation = recommendationBatch?.items.find(
              (item) => item.wafId === r.wafId,
            );
            const ct = controlText(r.wafId, {
              bestPractice: r.control.bestPractice,
              principle: r.control.principle,
            });
            return (
              <TableRow key={r.wafId}>
                <TableCell className="font-mono text-xs">{r.wafId}</TableCell>
                {showPillar && <TableCell className="text-sm">{tShortPillar(r.pillar)}</TableCell>}
                <TableCell className="text-sm">
                  <div className="font-medium">{ct.bestPractice}</div>
                  <div className="text-xs text-muted-foreground">{ct.principle}</div>
                  <CrossRefBadges wafId={r.wafId} pillar={r.pillar} />
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {l10n.number(r.scorePercentage)}
                </TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">
                  {l10n.integer(r.thresholdPercentage)}
                </TableCell>
                <TableCell>
                  {r.thresholdMet ? (
                    <Badge variant="default" className="gap-1">
                      <CheckCircle2 className="h-3 w-3" /> {tResults("met")}
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="gap-1">
                      <AlertCircle className="h-3 w-3" /> {tResults("not_met")}
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  {!r.thresholdMet &&
                  recommendation &&
                  (recommendation.status === "pending" || recommendation.status === "running") ? (
                    <Button size="sm" variant="outline" disabled>
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      {tActions("analyzing")}
                    </Button>
                  ) : !r.thresholdMet && recommendation && onOpenRecommendation ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onOpenRecommendation(r.wafId)}
                      disabled={recommendationsDisabled}
                    >
                      {recommendation.status === "failed" ? (
                        <AlertCircle className="mr-1.5 h-3.5 w-3.5" />
                      ) : (
                        <MessageCircle className="mr-1.5 h-3.5 w-3.5" />
                      )}
                      {tActions(
                        recommendation.status === "failed"
                          ? "view_recommendation_error"
                          : "recommendations",
                      )}
                    </Button>
                  ) : !r.thresholdMet && action && action.kind === "docs" ? (
                    <Button size="sm" variant="outline" asChild>
                      <a href={action.href} target="_blank" rel="noopener noreferrer">
                        <BookOpen className="mr-1.5 h-3.5 w-3.5" /> {tActions(action.labelKey)}
                      </a>
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );
}

function HistoryTable({
  history,
  latestId,
}: {
  history: WafAssessmentSummary[];
  latestId: string;
}) {
  const tHistory = useTranslations("assessment.history");
  const l10n = useL10n();
  const fmt = (v: number | null | undefined) => (v == null ? "—" : l10n.number(v));
  if (history.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          {tHistory("no_runs")}
        </CardContent>
      </Card>
    );
  }
  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{tHistory("when")}</TableHead>
            <TableHead>{tHistory("status")}</TableHead>
            <TableHead className="text-right">{tHistory("overall")}</TableHead>
            <TableHead className="text-right">{tHistory("governance")}</TableHead>
            <TableHead className="text-right">{tHistory("iu")}</TableHead>
            <TableHead className="text-right">{tHistory("oe")}</TableHead>
            <TableHead className="text-right">{tHistory("scp")}</TableHead>
            <TableHead className="text-right">{tHistory("reliability")}</TableHead>
            <TableHead className="text-right">{tHistory("cost")}</TableHead>
            <TableHead className="text-right">{tHistory("performance")}</TableHead>
            <TableHead className="text-right">{tHistory("met_total")}</TableHead>
            <TableHead className="w-[140px]">{tHistory("compare")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {history.map((h) => {
            const isLatest = h.assessmentId === latestId;
            const canCompare = h.status === "completed" && !isLatest;
            return (
              <TableRow key={h.assessmentId}>
                <TableCell className="text-sm">
                  {l10n.dateTime(h.createdAt)}
                  {isLatest && (
                    <span className="ml-2 text-xs text-muted-foreground">{tHistory("latest")}</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={h.status === "completed" ? "default" : "secondary"}>
                    {h.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right tabular-nums">{fmt(h.overallScore)}</TableCell>
                <TableCell className="text-right tabular-nums">{fmt(h.governanceScore)}</TableCell>
                <TableCell className="text-right tabular-nums">{fmt(h.iuScore)}</TableCell>
                <TableCell className="text-right tabular-nums">{fmt(h.oeScore)}</TableCell>
                <TableCell className="text-right tabular-nums">{fmt(h.scpScore)}</TableCell>
                <TableCell className="text-right tabular-nums">{fmt(h.reliabilityScore)}</TableCell>
                <TableCell className="text-right tabular-nums">{fmt(h.costScore)}</TableCell>
                <TableCell className="text-right tabular-nums">{fmt(h.performanceScore)}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {h.metControls} / {h.totalControls}
                </TableCell>
                <TableCell>
                  {canCompare ? (
                    <Button size="sm" variant="ghost" asChild>
                      <Link
                        href={`/assessment/compare?from=${encodeURIComponent(
                          h.assessmentId,
                        )}&to=${encodeURIComponent(latestId)}`}
                      >
                        <ArrowLeftRight className="mr-1.5 h-3.5 w-3.5" /> {tHistory("vs_latest")}
                      </Link>
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );
}

function IgnoredTab({
  ignored,
  onRestore,
}: {
  ignored: WafIgnoredResource[];
  onRestore: (id: string, wafId: string) => Promise<void>;
}) {
  const tIgnored = useTranslations("assessment.ignored");
  const l10n = useL10n();
  if (ignored.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          {tIgnored("empty")}
        </CardContent>
      </Card>
    );
  }
  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[120px]">{tIgnored("control")}</TableHead>
            <TableHead className="w-[140px]">{tIgnored("scope")}</TableHead>
            <TableHead>{tIgnored("reason")}</TableHead>
            <TableHead className="w-[160px]">{tIgnored("ignored_at")}</TableHead>
            <TableHead className="w-[160px]">{tIgnored("by")}</TableHead>
            <TableHead className="w-[100px]">{tIgnored("restore")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ignored.map((row) => {
            const scope =
              row.resourceType && row.resourceId
                ? `${row.resourceType}: ${row.resourceId}`
                : tIgnored("whole_control");
            return (
              <TableRow key={row.id}>
                <TableCell className="font-mono text-xs">{row.wafId}</TableCell>
                <TableCell className="text-xs">{scope}</TableCell>
                <TableCell className="text-sm whitespace-pre-wrap">{row.reason}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {l10n.dateTime(row.createdAt)}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {row.ignoredBy ?? "—"}
                </TableCell>
                <TableCell>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => void onRestore(row.id, row.wafId)}
                  >
                    <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> {tIgnored("restore")}
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );
}

function QualitativeTab({
  controls,
  responses,
  onSave,
}: {
  controls: WafControl[];
  responses: WafQualitativeResponse[];
  onSave: (input: {
    wafId: string;
    response: WafQualitativeAnswer;
    notes: string | null;
  }) => Promise<void>;
}) {
  const tQualitative = useTranslations("assessment.qualitative");
  const responseByWafId = useMemo(() => {
    const map = new Map<string, WafQualitativeResponse>();
    for (const r of responses) map.set(r.wafId, r);
    return map;
  }, [responses]);

  if (controls.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          {tQualitative("empty")}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <Card>
        <CardContent className="py-4 text-xs text-muted-foreground">
          {tQualitative("intro_pre")} <strong>{tQualitative("yes")}</strong>{" "}
          {tQualitative("intro_yes_score")}, <strong>{tQualitative("partial")}</strong>{" "}
          {tQualitative("intro_partial_score")}, <strong>{tQualitative("no")}</strong>{" "}
          {tQualitative("intro_no_score")}, <strong>{tQualitative("na")}</strong>{" "}
          {tQualitative("intro_na_score")}. {tQualitative("intro_post")}
        </CardContent>
      </Card>
      {controls.map((control) => (
        <QualitativeRow
          key={control.wafId}
          control={control}
          response={responseByWafId.get(control.wafId) ?? null}
          onSave={onSave}
        />
      ))}
    </div>
  );
}

function QualitativeRow({
  control,
  response,
  onSave,
}: {
  control: WafControl;
  response: WafQualitativeResponse | null;
  onSave: (input: {
    wafId: string;
    response: WafQualitativeAnswer;
    notes: string | null;
  }) => Promise<void>;
}) {
  const tQualitative = useTranslations("assessment.qualitative");
  const tFullPillar = useTranslations("assessment.pillar_full");
  const controlText = useControlText();
  const ct = controlText(control.wafId, {
    bestPractice: control.bestPractice,
    principle: control.principle,
  });
  const l10n = useL10n();
  const [answer, setAnswer] = useState<WafQualitativeAnswer | "">(response?.response ?? "");
  const [notes, setNotes] = useState<string>(response?.notes ?? "");
  const [saving, setSaving] = useState(false);

  const dirty = answer !== (response?.response ?? "") || notes !== (response?.notes ?? "");

  const optionLabel = (opt: WafQualitativeAnswer) =>
    opt === "not_applicable" ? tQualitative("na") : tQualitative(opt);

  const handleSave = useCallback(async () => {
    if (!answer) {
      toast.error(tQualitative("pick_answer"));
      return;
    }
    setSaving(true);
    try {
      await onSave({ wafId: control.wafId, response: answer, notes: notes.trim() || null });
      toast.success(tQualitative("saved_toast", { wafId: control.wafId }));
    } catch (error) {
      const message = error instanceof Error ? error.message : tQualitative("save_failed");
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }, [answer, notes, control.wafId, onSave, tQualitative]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-muted-foreground">{control.wafId}</span>
            <Badge variant="outline" className="text-xs">
              {tFullPillar(control.pillar)}
            </Badge>
            {response ? (
              <Badge variant="default" className="text-xs">
                {tQualitative("answered")}
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-xs">
                {tQualitative("pending_response")}
              </Badge>
            )}
          </div>
          <CardTitle className="text-base">{ct.bestPractice}</CardTitle>
          <CardDescription className="text-xs">{ct.principle}</CardDescription>
          <CrossRefBadges wafId={control.wafId} pillar={control.pillar} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {control.details && (
          <p className="text-xs text-muted-foreground whitespace-pre-wrap">{control.details}</p>
        )}
        <ToggleGroup
          type="single"
          value={answer}
          onValueChange={(v: string) => v && setAnswer(v as WafQualitativeAnswer)}
          className="justify-start"
        >
          {(["yes", "partial", "no", "not_applicable"] as WafQualitativeAnswer[]).map((opt) => (
            <ToggleGroupItem key={opt} value={opt} className="px-3 text-xs">
              {optionLabel(opt)}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={tQualitative("notes_placeholder")}
          className="min-h-[60px] text-xs"
        />
        <div className="flex items-center justify-end gap-2">
          {response && (
            <span className="text-xs text-muted-foreground">
              {tQualitative("last_updated", { date: l10n.dateTime(response.updatedAt) })}
            </span>
          )}
          <Button size="sm" onClick={handleSave} disabled={!dirty || saving || !answer}>
            {saving && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
            {tQualitative("save")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
