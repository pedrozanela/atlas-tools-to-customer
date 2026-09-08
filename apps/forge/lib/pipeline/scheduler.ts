/**
 * Pipeline run scheduler.
 *
 * When a user is at their per-user pipeline cap (`FORGE_MAX_ACTIVE_PIPELINE_RUNS_PER_USER`),
 * the execute route can persist the run with `status='queued'` and call
 * `notifyScheduler()`. The scheduler periodically (every 5s, plus on-demand)
 * scans for `queued` runs whose owners now have free capacity and promotes
 * the oldest one via an atomic update (claim-on-promotion to prevent races).
 *
 * The scheduler is process-local. With multiple App instances, each instance
 * runs its own tick. OBO credentials are deliberately kept in a process-local
 * handoff and never persisted. Consequently, only an instance that recently
 * received an authenticated request from the run owner may claim that run.
 * After a restart or an expired handoff, runs remain queued until an owner
 * request supplies fresh OBO context.
 */

import { withPrisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { logActivity } from "@/lib/lakebase/activity-log";
import { getCap } from "@/lib/quotas";

const log = logger;

let timer: ReturnType<typeof setInterval> | null = null;
const TICK_MS = 5000;
export const QUEUED_RUN_OBO_TTL_MS = 30_000;

interface PipelineStarter {
  start(runId: string, opts: { ownerEmail: string; oboToken: string | null }): Promise<void>;
}

let starter: PipelineStarter | null = null;

/**
 * Ephemeral OBO handoff for queued runs. Tokens must never be persisted or
 * included in logs. A Map also makes the multi-instance ownership explicit:
 * another App instance can see the queued DB row, but cannot promote it.
 */
interface QueuedRunOboHandoff {
  ownerEmail: string;
  oboToken: string;
  expiresAt: number;
}

const queuedRunOboTokens = new Map<string, QueuedRunOboHandoff>();

function normalizeOwner(ownerEmail: string): string {
  return ownerEmail.toLowerCase().trim();
}

function deleteExpiredHandoffs(now = Date.now()): void {
  for (const [runId, handoff] of queuedRunOboTokens) {
    if (handoff.expiresAt <= now) queuedRunOboTokens.delete(runId);
  }
}

/**
 * Hand OBO context from the execute request to this process' scheduler.
 *
 * Missing tokens intentionally remove any older handoff and return false. In
 * that case the DB row stays queued rather than being run as the app service
 * principal. The caller may safely retry later with a fresh authenticated
 * request.
 */
export function handoffQueuedRunOboToken(
  runId: string,
  ownerEmail: string,
  oboToken: string | null,
): boolean {
  queuedRunOboTokens.delete(runId);
  const owner = normalizeOwner(ownerEmail);
  if (!owner || !oboToken) return false;
  queuedRunOboTokens.set(runId, {
    ownerEmail: owner,
    oboToken,
    expiresAt: Date.now() + QUEUED_RUN_OBO_TTL_MS,
  });
  return true;
}

/**
 * Refresh all queued runs owned by the authenticated caller. This DB lookup
 * intentionally allows a fresh browser poll to rebuild handoffs after an App
 * restart; only the token stays process-local.
 */
export async function refreshQueuedRunOboTokensForOwner(
  ownerEmail: string,
  oboToken: string | null,
): Promise<number> {
  deleteExpiredHandoffs();
  const owner = normalizeOwner(ownerEmail);
  if (!owner || !oboToken) return 0;

  const queuedRuns = await withPrisma((prisma) =>
    prisma.forgeRun.findMany({
      where: { status: "queued", ownerEmail: owner },
      select: { runId: true },
    }),
  );
  const queuedIds = new Set(queuedRuns.map((run) => run.runId));
  for (const [runId, handoff] of queuedRunOboTokens) {
    if (handoff.ownerEmail === owner && !queuedIds.has(runId)) {
      queuedRunOboTokens.delete(runId);
    }
  }

  const expiresAt = Date.now() + QUEUED_RUN_OBO_TTL_MS;
  for (const { runId } of queuedRuns) {
    queuedRunOboTokens.set(runId, { ownerEmail: owner, oboToken, expiresAt });
  }
  return queuedRuns.length;
}

/** Remove sensitive queued-run context as soon as it is no longer needed. */
export function clearQueuedRunOboToken(runId: string): void {
  queuedRunOboTokens.delete(runId);
}

/**
 * Wire the pipeline starter. Called once at module init from
 * `lib/pipeline/engine.ts` so the scheduler can promote queued runs.
 */
export function registerPipelineStarter(s: PipelineStarter): void {
  starter = s;
}

export function startScheduler(): void {
  if (timer) return;
  timer = setInterval(() => {
    tick().catch((err) => {
      log.warn("Pipeline scheduler tick failed", {
        error: err instanceof Error ? err.message : String(err),
      });
    });
  }, TICK_MS);
  log.info("Pipeline scheduler started", { tickMs: TICK_MS });
}

export function stopScheduler(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  queuedRunOboTokens.clear();
}

/** Trigger an immediate tick (e.g. after a run completes, or after enqueue). */
export function notifyScheduler(): void {
  setTimeout(() => {
    tick().catch(() => {});
  }, 0);
}

async function tick(): Promise<void> {
  deleteExpiredHandoffs();
  if (!starter) return;
  // No token survived (for example after an App restart), so claiming any DB
  // row would force the pipeline down the service-principal/null-token path.
  if (queuedRunOboTokens.size === 0) return;
  const cap = getCap("pipeline");
  if (cap <= 0) return;

  const queuedByOwner = await withPrisma(async (prisma) => {
    return prisma.forgeRun.findMany({
      where: { status: "queued", ownerEmail: { not: null } },
      orderBy: { createdAt: "asc" },
      select: { runId: true, ownerEmail: true },
    });
  });
  const queuedRunIds = new Set(queuedByOwner.map((row) => row.runId));
  // Clean up contexts for runs cancelled, deleted, or claimed by a concurrent
  // tick. This bounds the lifetime of credentials even when no explicit
  // cancellation hook ran.
  for (const runId of queuedRunOboTokens.keys()) {
    if (!queuedRunIds.has(runId)) queuedRunOboTokens.delete(runId);
  }
  if (queuedByOwner.length === 0) return;

  const grouped = new Map<string, string[]>();
  for (const row of queuedByOwner) {
    if (!row.ownerEmail) continue;
    const arr = grouped.get(row.ownerEmail) ?? [];
    arr.push(row.runId);
    grouped.set(row.ownerEmail, arr);
  }

  for (const [owner, runIds] of grouped) {
    const active = await withPrisma(async (prisma) =>
      prisma.forgeRun.count({
        where: {
          ownerEmail: owner,
          status: { in: ["pending", "running"] },
        },
      }),
    );
    const free = Math.max(0, cap - active);
    if (free === 0) continue;

    const toPromote = runIds.slice(0, free);
    for (const runId of toPromote) {
      const handoff = queuedRunOboTokens.get(runId);
      // Preserve global FIFO ordering, but leave promotion to the App instance
      // that recently received this run owner's OBO token.
      if (!handoff || handoff.expiresAt <= Date.now()) {
        clearQueuedRunOboToken(runId);
        continue;
      }
      if (handoff.ownerEmail !== normalizeOwner(owner)) continue;
      const claimed = await claimQueuedRun(runId);
      if (!claimed) {
        clearQueuedRunOboToken(runId);
        continue;
      }
      // The starter promise retains the argument for only as long as the run
      // needs it; the scheduler itself must not keep another token reference.
      clearQueuedRunOboToken(runId);
      try {
        log.info("Promoting queued pipeline run", { runId, owner });
        starter.start(runId, { ownerEmail: owner, oboToken: handoff.oboToken }).catch((err) => {
          log.error("Promoted pipeline crashed", {
            runId,
            error: err instanceof Error ? err.message : String(err),
          });
        });
        logActivity("pipeline_promoted", {
          userId: owner,
          resourceId: runId,
        }).catch((activityError) => {
          // The run is already atomically claimed. Audit logging must not
          // strand it in pending or tempt us to retain/reuse the OBO token.
          log.warn("Failed to record pipeline promotion activity", {
            runId,
            error: activityError instanceof Error ? activityError.message : String(activityError),
          });
        });
      } catch (err) {
        log.error("Pipeline promotion failed", {
          runId,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }
}

/**
 * Atomically transition a `queued` run into `pending`. Only one caller wins
 * per run -- duplicate ticks no-op.
 */
async function claimQueuedRun(runId: string): Promise<boolean> {
  const result = await withPrisma(async (prisma) => {
    const updated = await prisma.forgeRun.updateMany({
      where: { runId, status: "queued" },
      data: { status: "pending" },
    });
    return updated.count;
  });
  return result === 1;
}

/**
 * Compute a queued run's position in the user's queue (1-based).
 */
export async function getQueuePosition(runId: string): Promise<number | null> {
  return withPrisma(async (prisma) => {
    const me = await prisma.forgeRun.findUnique({
      where: { runId },
      select: { ownerEmail: true, status: true, createdAt: true },
    });
    if (!me || me.status !== "queued" || !me.ownerEmail) return null;
    const ahead = await prisma.forgeRun.count({
      where: {
        ownerEmail: me.ownerEmail,
        status: "queued",
        createdAt: { lt: me.createdAt },
      },
    });
    return ahead + 1;
  });
}
