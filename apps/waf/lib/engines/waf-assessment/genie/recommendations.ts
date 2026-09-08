import {
  GenieAgentApiError,
  recoverGenieAgentAnalysis,
  runGenieAgentAnalysis,
  type GenieAgentEvidence,
  type GenieAgentResult,
} from "@/lib/dbx/genie-agent";
import { getCrossReference } from "@/lib/engines/waf-assessment/cross-references";
import type {
  WafGenieRecommendation,
  WafPillar,
  WafRecommendationBatch,
  WafRecommendationBatchStatus,
  WafRecommendationEvidence,
  WafRecommendationSetupStatus,
  WafRecommendationStatus,
} from "@/lib/engines/waf-assessment/types";
import { ensureMigrated } from "@/lib/lakebase/schema";
import { logger } from "@/lib/logger";
import { withPrisma } from "@/lib/prisma";

const DATABRICKS_WAF_DOCS =
  "https://docs.databricks.com/aws/en/lakehouse-architecture/well-architected";
const DEFAULT_CONCURRENCY = 2;
const MAX_CONCURRENCY = 4;
const RECOVERY_GRACE_MS = 60_000;
const AGENT_RESPONSE_TIMEOUT_MS = 5_460_000;
const workers = new Map<string, Promise<void>>();
const batchOboTokens = new Map<string, string>();
let activeAgentAnalyses = 0;
const agentPermitWaiters: Array<() => void> = [];

type ControlPromptInput = {
  wafId: string;
  pillar: WafPillar;
  principle: string;
  bestPractice: string;
  details: string | null;
  metricDefinition: string | null;
  recommendationIfNotMet: string | null;
  fixActionParamsJson: string | null;
  scorePercentage: number;
  thresholdPercentage: number;
  locale: string;
};

function truncate(value: string | null, max: number): string {
  if (!value) return "Not provided.";
  return value.length <= max ? value : `${value.slice(0, max)}…`;
}

function parseFixActionDoc(raw: string | null): string | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as { href?: unknown };
    return typeof value.href === "string" && value.href.startsWith("https://") ? value.href : null;
  } catch {
    return null;
  }
}

export function documentationUrlsForControl(input: {
  wafId: string;
  pillar: WafPillar;
  fixActionParamsJson: string | null;
}): string[] {
  const crossReference = getCrossReference(input.wafId, input.pillar);
  const urls = new Set<string>([
    DATABRICKS_WAF_DOCS,
    crossReference.awsHref,
    crossReference.azureHref,
  ]);
  const actionDoc = parseFixActionDoc(input.fixActionParamsJson);
  if (actionDoc) urls.add(actionDoc);
  return [...urls];
}

const RESPONSE_LANGUAGES: Record<string, string> = {
  en: "English",
  "pt-BR": "Brazilian Portuguese",
  es: "Spanish",
};

/**
 * The catalog excerpts are the documentation context supplied to the Agent.
 * URLs are references for the user; Agent mode does not browse arbitrary web
 * pages. Workspace findings must be backed by at least one SQL execution.
 */
export function buildRecommendationPrompt(input: ControlPromptInput): string {
  const docs = documentationUrlsForControl(input);
  const language = RESPONSE_LANGUAGES[input.locale] ?? "English";
  return `Analyze exactly one Databricks Well-Architected Framework control.

Control: ${input.wafId}
Pillar: ${input.pillar}
Principle: ${input.principle}
Best practice: ${input.bestPractice}
Assessment result: ${input.scorePercentage}% (required threshold: ${input.thresholdPercentage}%)

Curated WAF documentation excerpt:
${truncate(input.details, 6_000)}

Curated remediation guidance:
${truncate(input.recommendationIfNotMet, 3_000)}

Metric definition used by the deterministic assessment:
${truncate(input.metricDefinition, 2_000)}

Documentation references (reference only; do not claim that you browsed them):
${docs.map((url) => `- ${url}`).join("\n")}

Mandatory execution contract:
1. This request is only for control ${input.wafId}; do not analyze any other control.
2. Execute at least one SQL query with execute_sql against the Agent's attached system tables to validate the current workspace condition. You may execute more queries when needed.
3. If no table directly proves the control, execute the closest inventory or coverage query and state the evidence limitation explicitly.
4. Combine the curated documentation excerpt with the SQL evidence. Never claim an external URL was fetched.
5. Do not expose secrets, tokens, credentials, or unnecessary personal data. Prefer aggregate evidence; include resource identifiers only when they are required for remediation.
6. Return concise Markdown with these sections: Finding, Workspace evidence, Recommendations, Priority and next steps.
7. Respond in ${language}. Keep Databricks object names, SQL identifiers, and WAF control IDs unchanged.`;
}

function parseStringArray(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === "string")
      : [];
  } catch {
    return [];
  }
}

function parseEvidence(raw: string | null): WafRecommendationEvidence[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as WafRecommendationEvidence[]) : [];
  } catch {
    return [];
  }
}

function batchStatus(
  counts: {
    total: number;
    pending: number;
    running: number;
    completed: number;
    failed: number;
  },
  setupStatus: WafRecommendationSetupStatus,
): WafRecommendationBatchStatus {
  if (counts.total === 0) {
    if (setupStatus === "failed") return "failed";
    if (setupStatus === "running") return "pending";
    return "not_started";
  }
  if (counts.running > 0) return "running";
  if (counts.pending > 0) return "pending";
  if (counts.completed === counts.total) return "completed";
  if (counts.failed === counts.total) return "failed";
  return "partial";
}

export async function setRecommendationSetupStatus(
  assessmentId: string,
  status: WafRecommendationSetupStatus,
  error: string | null = null,
): Promise<void> {
  await withPrisma((prisma) =>
    prisma.wafAssessment.update({
      where: { assessmentId },
      data: {
        recommendationSetupStatus: status,
        recommendationSetupError: error?.slice(0, 8_000) ?? null,
      },
    }),
  );
}

function validRecommendationStatus(value: string): WafRecommendationStatus {
  return value === "running" || value === "completed" || value === "failed" ? value : "pending";
}

function toRecommendation(row: {
  id: string;
  assessmentId: string;
  wafId: string;
  agentId: string;
  status: string;
  conversationId: string | null;
  responseId: string | null;
  reportMarkdown: string | null;
  citationsJson: string | null;
  documentationJson: string | null;
  evidenceJson: string | null;
  queryCount: number;
  errorCode: string | null;
  errorMessage: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
  control: {
    bestPractice: string;
    principle: string;
    pillar: string;
  };
}): WafGenieRecommendation {
  return {
    id: row.id,
    assessmentId: row.assessmentId,
    wafId: row.wafId,
    agentId: row.agentId,
    status: validRecommendationStatus(row.status),
    conversationId: row.conversationId,
    responseId: row.responseId,
    reportMarkdown: row.reportMarkdown,
    citations: parseStringArray(row.citationsJson),
    documentationUrls: parseStringArray(row.documentationJson),
    evidence: parseEvidence(row.evidenceJson),
    queryCount: row.queryCount,
    errorCode: row.errorCode,
    errorMessage: row.errorMessage,
    startedAt: row.startedAt?.toISOString() ?? null,
    completedAt: row.completedAt?.toISOString() ?? null,
    bestPractice: row.control.bestPractice,
    principle: row.control.principle,
    pillar: row.control.pillar as WafPillar,
  };
}

export async function seedRecommendationBatch(input: {
  assessmentId: string;
  agentId: string;
  locale: string;
}): Promise<number> {
  await ensureMigrated();
  const notMet = await withPrisma((prisma) =>
    prisma.wafControlResult.findMany({
      where: { assessmentId: input.assessmentId, thresholdMet: false },
      include: { control: true },
      orderBy: { wafId: "asc" },
    }),
  );

  await withPrisma((prisma) =>
    prisma.$transaction(
      notMet.map((result) => {
        const pillar = result.pillar as WafPillar;
        const promptText = buildRecommendationPrompt({
          wafId: result.wafId,
          pillar,
          principle: result.control.principle,
          bestPractice: result.control.bestPractice,
          details: result.control.details,
          metricDefinition: result.control.metricDefinition,
          recommendationIfNotMet: result.control.recommendationIfNotMet,
          fixActionParamsJson: result.control.fixActionParamsJson,
          scorePercentage: result.scorePercentage,
          thresholdPercentage: result.thresholdPercentage,
          locale: input.locale,
        });
        const documentationJson = JSON.stringify(
          documentationUrlsForControl({
            wafId: result.wafId,
            pillar,
            fixActionParamsJson: result.control.fixActionParamsJson,
          }),
        );
        return prisma.wafGenieRecommendation.upsert({
          where: {
            assessmentId_wafId: {
              assessmentId: input.assessmentId,
              wafId: result.wafId,
            },
          },
          create: {
            assessmentId: input.assessmentId,
            wafId: result.wafId,
            agentId: input.agentId,
            locale: input.locale,
            promptText,
            documentationJson,
          },
          update: {},
        });
      }),
    ),
  );

  return notMet.length;
}

async function claimPending(id: string): Promise<boolean> {
  const result = await withPrisma((prisma) =>
    prisma.wafGenieRecommendation.updateMany({
      where: { id, status: "pending" },
      data: {
        status: "running",
        startedAt: new Date(),
        errorCode: null,
        errorMessage: null,
      },
    }),
  );
  return result.count === 1;
}

function errorDetails(error: unknown): { code: string | null; message: string } {
  if (error instanceof GenieAgentApiError) {
    return { code: error.code, message: error.message };
  }
  return {
    code: null,
    message: error instanceof Error ? error.message : String(error),
  };
}

function normalizeEvidence(evidence: GenieAgentEvidence[]): WafRecommendationEvidence[] {
  return evidence.map((item) => ({
    callId: item.callId,
    title: item.title,
    sql: item.sql,
    output: item.output,
    columns: item.columns,
    previewRows: item.previewRows,
    totalRowCount: item.totalRowCount,
  }));
}

type RecommendationWorkItem = {
  id: string;
  agentId: string;
  promptText: string;
  wafId: string;
  status: string;
  conversationId: string | null;
  responseId: string | null;
};

async function persistCompletedRecommendation(
  row: Pick<RecommendationWorkItem, "id">,
  result: GenieAgentResult,
): Promise<void> {
  if (result.status === "failed") {
    throw new GenieAgentApiError(
      result.error?.message ?? "Genie Agent analysis failed",
      null,
      result.error?.code ?? null,
    );
  }
  if (result.queryCount < 1) {
    throw new GenieAgentApiError(
      "Genie Agent completed without executing the required SQL query",
      null,
      "no_sql_evidence",
    );
  }
  if (!result.reportMarkdown) {
    throw new GenieAgentApiError(
      "Genie Agent completed without a recommendation report",
      null,
      "empty_report",
    );
  }

  await withPrisma((prisma) =>
    prisma.wafGenieRecommendation.updateMany({
      // A successful terminal result may replace a transient recovery failure,
      // but a late failure must never overwrite a completed recommendation.
      where: { id: row.id, status: { in: ["running", "failed"] } },
      data: {
        status: "completed",
        responseId: result.responseId,
        conversationId: result.conversationId,
        reportMarkdown: result.reportMarkdown,
        citationsJson: JSON.stringify(result.citations),
        evidenceJson: JSON.stringify(normalizeEvidence(result.evidence)),
        queryCount: result.queryCount,
        errorCode: null,
        errorMessage: null,
        completedAt: new Date(),
      },
    }),
  );
}

async function persistFailedRecommendation(
  row: Pick<RecommendationWorkItem, "id" | "wafId">,
  error: unknown,
): Promise<void> {
  const details = errorDetails(error);
  logger.error("WAF Genie Agent recommendation failed", {
    recommendationId: row.id,
    wafId: row.wafId,
    errorCode: details.code,
    error: details.message,
  });
  await withPrisma((prisma) =>
    prisma.wafGenieRecommendation.updateMany({
      where: { id: row.id, status: "running" },
      data: {
        status: "failed",
        errorCode: details.code,
        errorMessage: details.message.slice(0, 8_000),
        completedAt: new Date(),
      },
    }),
  );
}

function needsFreshOboToken(error: unknown): boolean {
  return (
    error instanceof GenieAgentApiError &&
    (error.status === 401 || error.code === "obo_token_unavailable")
  );
}

async function deferUntilFreshOboToken(
  row: Pick<RecommendationWorkItem, "id" | "wafId">,
  error: unknown,
  resetToPending: boolean,
): Promise<void> {
  logger.warn("WAF Genie Agent paused until a fresh OBO token is available", {
    recommendationId: row.id,
    wafId: row.wafId,
  });
  if (!resetToPending) return;
  await withPrisma((prisma) =>
    prisma.wafGenieRecommendation.updateMany({
      where: { id: row.id, status: "running", conversationId: null },
      data: {
        status: "pending",
        startedAt: null,
        errorCode: "obo_token_refresh_required",
        errorMessage: error instanceof Error ? error.message.slice(0, 8_000) : String(error),
      },
    }),
  );
}

async function processPendingRecommendation(
  row: {
    id: string;
    agentId: string;
    promptText: string;
    wafId: string;
  },
  getOboToken: () => string,
): Promise<void> {
  await withAgentPermit(async () => {
    // Claim only after a global permit is available, so queued rows remain
    // pending rather than looking like abandoned in-flight requests.
    if (!(await claimPending(row.id))) return;

    try {
      const result = await runGenieAgentAnalysis({
        agentId: row.agentId,
        prompt: row.promptText,
        getOboToken,
        onCreated: async ({ responseId, conversationId }) => {
          await withPrisma((prisma) =>
            prisma.wafGenieRecommendation.update({
              where: { id: row.id },
              data: { responseId, conversationId },
            }),
          );
        },
      });
      await persistCompletedRecommendation(row, result);
    } catch (error) {
      if (needsFreshOboToken(error)) {
        await deferUntilFreshOboToken(row, error, true);
      } else {
        await persistFailedRecommendation(row, error);
      }
    }
  });
}

async function processRunningRecommendation(
  row: RecommendationWorkItem & { conversationId: string },
  getOboToken: () => string,
): Promise<void> {
  await withAgentPermit(async () => {
    try {
      // Recovery is GET-only. A running row is never submitted a second time,
      // preserving exactly one POST /responses for this control analysis.
      const result = await recoverGenieAgentAnalysis({
        agentId: row.agentId,
        conversationId: row.conversationId,
        responseId: row.responseId,
        getOboToken,
      });
      await persistCompletedRecommendation(row, result);
    } catch (error) {
      if (needsFreshOboToken(error)) {
        await deferUntilFreshOboToken(row, error, false);
      } else {
        await persistFailedRecommendation(row, error);
      }
    }
  });
}

function configuredConcurrency(): number {
  const parsed = Number.parseInt(process.env.WAF_GENIE_AGENT_CONCURRENCY ?? "", 10);
  if (!Number.isFinite(parsed)) return DEFAULT_CONCURRENCY;
  return Math.max(1, Math.min(MAX_CONCURRENCY, parsed));
}

async function withAgentPermit<T>(work: () => Promise<T>): Promise<T> {
  if (activeAgentAnalyses >= configuredConcurrency()) {
    await new Promise<void>((resolve) => {
      agentPermitWaiters.push(resolve);
    });
  } else {
    activeAgentAnalyses += 1;
  }
  try {
    return await work();
  } finally {
    const next = agentPermitWaiters.shift();
    if (next) {
      // Transfer this permit directly to the next waiter. Keeping the active
      // count unchanged avoids a microtask race that could exceed the limit.
      next();
    } else {
      activeAgentAnalyses -= 1;
    }
  }
}

async function processRecommendationBatch(
  assessmentId: string,
  getOboToken: () => string,
): Promise<void> {
  const now = Date.now();
  const recoveryBefore = new Date(now - RECOVERY_GRACE_MS);
  const abandonedBefore = new Date(now - AGENT_RESPONSE_TIMEOUT_MS);

  await withPrisma((prisma) =>
    prisma.wafGenieRecommendation.updateMany({
      where: {
        assessmentId,
        status: "running",
        conversationId: null,
        startedAt: { lt: abandonedBefore },
      },
      data: {
        status: "failed",
        errorCode: "worker_lost_before_conversation",
        errorMessage:
          "The App worker stopped before Genie returned a conversation ID. " +
          "The request was not repeated to avoid a duplicate analysis.",
        completedAt: new Date(),
      },
    }),
  );

  const pendingOrRecoverable = await withPrisma((prisma) =>
    prisma.wafGenieRecommendation.findMany({
      where: {
        assessmentId,
        OR: [
          { status: "pending" },
          {
            status: "running",
            conversationId: { not: null },
            updatedAt: { lt: recoveryBefore },
          },
        ],
      },
      select: {
        id: true,
        agentId: true,
        promptText: true,
        wafId: true,
        status: true,
        conversationId: true,
        responseId: true,
      },
      orderBy: { wafId: "asc" },
    }),
  );
  const queue = [...pendingOrRecoverable];
  const concurrency = Math.min(configuredConcurrency(), queue.length);
  if (concurrency === 0) return;

  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      while (queue.length > 0) {
        const row = queue.shift();
        if (!row) continue;
        if (row.status === "pending") {
          await processPendingRecommendation(row, getOboToken);
        } else if (row.conversationId) {
          await processRunningRecommendation(
            {
              ...row,
              conversationId: row.conversationId,
            },
            getOboToken,
          );
        }
      }
    }),
  );
}

/**
 * Start the durable batch without holding the assessment HTTP request open.
 * The module-level lock prevents duplicate workers in the same App process;
 * each row is also claimed atomically in Lakebase.
 */
export function startRecommendationGeneration(assessmentId: string, oboToken: string): void {
  const token = oboToken.trim();
  if (!token) {
    throw new GenieAgentApiError(
      "Databricks OBO token is required to run WAF recommendations",
      401,
      "obo_token_unavailable",
    );
  }
  batchOboTokens.set(assessmentId, token);
  if (workers.has(assessmentId)) return;
  const worker = processRecommendationBatch(
    assessmentId,
    () => batchOboTokens.get(assessmentId) ?? "",
  )
    .catch((error) => {
      logger.error("WAF Genie Agent batch failed", {
        assessmentId,
        error: error instanceof Error ? error.message : String(error),
      });
    })
    .finally(() => {
      workers.delete(assessmentId);
      batchOboTokens.delete(assessmentId);
    });
  workers.set(assessmentId, worker);
}

export async function listRecommendationBatch(
  assessmentId: string,
): Promise<WafRecommendationBatch> {
  await ensureMigrated();
  const [assessment, rows] = await withPrisma((prisma) =>
    Promise.all([
      prisma.wafAssessment.findUnique({
        where: { assessmentId },
        select: {
          recommendationSetupStatus: true,
          recommendationSetupError: true,
        },
      }),
      prisma.wafGenieRecommendation.findMany({
        where: { assessmentId },
        include: {
          control: {
            select: { bestPractice: true, principle: true, pillar: true },
          },
        },
        orderBy: { wafId: "asc" },
      }),
    ]),
  );
  const items = rows.map(toRecommendation);
  const setupStatus =
    assessment?.recommendationSetupStatus === "running" ||
    assessment?.recommendationSetupStatus === "completed" ||
    assessment?.recommendationSetupStatus === "failed"
      ? assessment.recommendationSetupStatus
      : "not_started";
  const counts = {
    total: items.length,
    pending: items.filter((item) => item.status === "pending").length,
    running: items.filter((item) => item.status === "running").length,
    completed: items.filter((item) => item.status === "completed").length,
    failed: items.filter((item) => item.status === "failed").length,
  };
  return {
    assessmentId,
    status: batchStatus(counts, setupStatus),
    setupStatus,
    setupError: assessment?.recommendationSetupError ?? null,
    ...counts,
    items,
  };
}
