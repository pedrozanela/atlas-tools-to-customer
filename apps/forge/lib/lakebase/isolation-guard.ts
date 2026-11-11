/**
 * Startup guard: reports root tables that contain rows with
 * `owner_email IS NULL`.
 *
 * Every owner-scoped read filters by `ownerEmail` (see
 * lib/config/isolation-flag.ts), so a row without an owner is invisible to
 * all users -- never leaked. Inside Atlas the Forge zone runs under a shared
 * supervisor that stops every module when one exits, so this guard repairs
 * what it can and logs the rest instead of failing the boot: one orphaned
 * row used to take the whole suite down on its next restart.
 *
 * Repair: comment jobs created by the pipeline before their owner was
 * recorded inherit it from the run (or scan) they belong to.
 *
 * Tables checked: root models whose reads are filtered by `ownerEmail`.
 * Children inherit visibility through their parent FK. Space health scores,
 * benchmark runs and Metadata Genie spaces are not checked: their writers
 * never record an owner and their reads are keyed by space/id, not owner.
 */

import type { PrismaClient } from "@/lib/generated/prisma/client";
import { withPrisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

interface RootTableCheck {
  label: string;
  count: () => Promise<number>;
}

/** Give owner-less comment jobs the owner of their run or scan. */
async function backfillCommentJobOwners(prisma: PrismaClient): Promise<number> {
  const orphans = await prisma.forgeCommentJob.findMany({
    where: { ownerEmail: null, OR: [{ runId: { not: null } }, { scanId: { not: null } }] },
    select: { id: true, runId: true, scanId: true },
  });
  if (orphans.length === 0) return 0;

  const runIds = [...new Set(orphans.map((o) => o.runId).filter((id): id is string => !!id))];
  const scanIds = [...new Set(orphans.map((o) => o.scanId).filter((id): id is string => !!id))];
  const [runs, scans] = await Promise.all([
    runIds.length
      ? prisma.forgeRun.findMany({
          where: { runId: { in: runIds }, ownerEmail: { not: null } },
          select: { runId: true, ownerEmail: true },
        })
      : [],
    scanIds.length
      ? prisma.forgeEnvironmentScan.findMany({
          where: { scanId: { in: scanIds }, ownerEmail: { not: null } },
          select: { scanId: true, ownerEmail: true },
        })
      : [],
  ]);
  const runOwner = new Map(runs.map((r) => [r.runId, r.ownerEmail as string]));
  const scanOwner = new Map(scans.map((s) => [s.scanId, s.ownerEmail as string]));

  let repaired = 0;
  for (const job of orphans) {
    const owner =
      (job.runId && runOwner.get(job.runId)) || (job.scanId && scanOwner.get(job.scanId));
    if (!owner) continue;
    await prisma.forgeCommentJob.update({ where: { id: job.id }, data: { ownerEmail: owner } });
    repaired += 1;
  }
  return repaired;
}

export async function assertOwnerEmailIntegrity(): Promise<void> {
  const counts = await withPrisma(async (prisma) => {
    try {
      const repaired = await backfillCommentJobOwners(prisma);
      if (repaired > 0) {
        logger.warn("[isolation-guard] Back-filled owner_email on comment jobs", { repaired });
      }
    } catch (err) {
      // Table may not exist yet on a fresh deploy -- the count below reports it.
      logger.debug("[isolation-guard] Comment job owner back-fill skipped", {
        error: err instanceof Error ? err.message : String(err),
      });
    }

    const checks: RootTableCheck[] = [
      { label: "ForgeRun", count: () => prisma.forgeRun.count({ where: { ownerEmail: null } }) },
      {
        label: "ForgeEnvironmentScan",
        count: () => prisma.forgeEnvironmentScan.count({ where: { ownerEmail: null } }),
      },
      {
        label: "ForgeGenieSpace",
        count: () => prisma.forgeGenieSpace.count({ where: { ownerEmail: null } }),
      },
      {
        label: "ForgeDemoSession",
        count: () => prisma.forgeDemoSession.count({ where: { ownerEmail: null } }),
      },
      {
        label: "ForgeCommentJob",
        count: () => prisma.forgeCommentJob.count({ where: { ownerEmail: null } }),
      },
      {
        label: "ForgeConnection",
        count: () => prisma.forgeConnection.count({ where: { ownerEmail: null } }),
      },
      {
        label: "ForgeFabricScan",
        count: () => prisma.forgeFabricScan.count({ where: { ownerEmail: null } }),
      },
      {
        label: "ForgeFabricMigration",
        count: () => prisma.forgeFabricMigration.count({ where: { ownerEmail: null } }),
      },
      {
        label: "ForgeStrategyDocument",
        count: () => prisma.forgeStrategyDocument.count({ where: { ownerEmail: null } }),
      },
      {
        label: "ForgeDocument",
        count: () => prisma.forgeDocument.count({ where: { ownerEmail: null } }),
      },
    ];

    const results: Array<{ label: string; count: number }> = [];
    for (const check of checks) {
      try {
        const c = await check.count();
        if (c > 0) results.push({ label: check.label, count: c });
      } catch (err) {
        // Table may not exist yet on a fresh deploy -- skip silently.
        logger.debug("[isolation-guard] Skipping table (does not exist yet)", {
          label: check.label,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
    return results;
  });

  if (counts.length === 0) {
    logger.info("[isolation-guard] All root tables have ownerEmail populated.");
    return;
  }

  const summary = counts.map((c) => `  - ${c.label}: ${c.count} rows`).join("\n");
  logger.error(
    `[isolation-guard] Rows with NULL owner_email found:\n${summary}\n\n` +
      `They stay invisible to every user (owner filters always apply). Back-fill ` +
      `owner_email to make them visible again. Boot continues.`,
  );
}
