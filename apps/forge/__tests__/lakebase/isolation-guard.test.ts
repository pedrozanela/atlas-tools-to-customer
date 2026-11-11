import { beforeEach, describe, expect, it, vi } from "vitest";

const logger = vi.hoisted(() => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
}));
vi.mock("@/lib/logger", () => ({ logger }));

type Row = Record<string, string | null>;
const db = vi.hoisted(() => ({
  commentJobs: [] as Array<Record<string, string | null>>,
  runs: [] as Array<Record<string, string | null>>,
  scans: [] as Array<Record<string, string | null>>,
  nullCounts: {} as Record<string, number>,
}));

function countModel(label: string) {
  return { count: async () => db.nullCounts[label] ?? 0 };
}

const prisma = {
  forgeCommentJob: {
    findMany: async () =>
      db.commentJobs.filter((j) => j.ownerEmail === null && (j.runId || j.scanId)),
    update: async ({ where, data }: { where: { id: string }; data: Row }) => {
      const job = db.commentJobs.find((j) => j.id === where.id)!;
      Object.assign(job, data);
      return job;
    },
    count: async () => db.commentJobs.filter((j) => j.ownerEmail === null).length,
  },
  forgeRun: {
    findMany: async ({ where }: { where: { runId: { in: string[] } } }) =>
      db.runs.filter((r) => where.runId.in.includes(r.runId!) && r.ownerEmail),
    count: async () => db.nullCounts.ForgeRun ?? 0,
  },
  forgeEnvironmentScan: {
    findMany: async ({ where }: { where: { scanId: { in: string[] } } }) =>
      db.scans.filter((s) => where.scanId.in.includes(s.scanId!) && s.ownerEmail),
    count: async () => db.nullCounts.ForgeEnvironmentScan ?? 0,
  },
  forgeGenieSpace: countModel("ForgeGenieSpace"),
  forgeDemoSession: countModel("ForgeDemoSession"),
  forgeConnection: countModel("ForgeConnection"),
  forgeFabricScan: countModel("ForgeFabricScan"),
  forgeFabricMigration: countModel("ForgeFabricMigration"),
  forgeStrategyDocument: countModel("ForgeStrategyDocument"),
  forgeDocument: countModel("ForgeDocument"),
};
vi.mock("@/lib/prisma", () => ({
  withPrisma: async (fn: (p: unknown) => Promise<unknown>) => fn(prisma),
}));

import { assertOwnerEmailIntegrity } from "@/lib/lakebase/isolation-guard";

beforeEach(() => {
  db.commentJobs = [];
  db.runs = [];
  db.scans = [];
  db.nullCounts = {};
  Object.values(logger).forEach((fn) => fn.mockReset());
});

describe("assertOwnerEmailIntegrity", () => {
  it("back-fills pipeline comment jobs from their run or scan owner", async () => {
    db.runs = [{ runId: "r1", ownerEmail: "ana@x.com" }];
    db.scans = [{ scanId: "s1", ownerEmail: "bia@x.com" }];
    db.commentJobs = [
      { id: "j1", runId: "r1", scanId: null, ownerEmail: null },
      { id: "j2", runId: null, scanId: "s1", ownerEmail: null },
    ];
    await expect(assertOwnerEmailIntegrity()).resolves.toBeUndefined();
    expect(db.commentJobs.map((j) => j.ownerEmail)).toEqual(["ana@x.com", "bia@x.com"]);
    expect(logger.error).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalled();
  });

  it("logs unrecoverable orphans instead of failing the boot", async () => {
    db.commentJobs = [{ id: "j1", runId: "gone", scanId: null, ownerEmail: null }];
    db.nullCounts = { ForgeRun: 2 };
    await expect(assertOwnerEmailIntegrity()).resolves.toBeUndefined();
    const message = logger.error.mock.calls[0][0] as string;
    expect(message).toContain("ForgeRun: 2 rows");
    expect(message).toContain("ForgeCommentJob: 1 rows");
    expect(message).toContain("Boot continues");
  });

  it("ignores tables whose reads are not owner-scoped", async () => {
    db.nullCounts = {
      ForgeSpaceHealthScore: 5,
      ForgeSpaceBenchmarkRun: 5,
      ForgeMetadataGenieSpace: 5,
    };
    await assertOwnerEmailIntegrity();
    expect(logger.error).not.toHaveBeenCalled();
  });
});
