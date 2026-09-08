import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";

type SchedulerModule = typeof import("@/lib/pipeline/scheduler");

type RunRow = {
  runId: string;
  ownerEmail: string | null;
  status: string;
  createdAt: Date;
};

type PipelineStart = (
  runId: string,
  opts: { ownerEmail: string; oboToken: string | null },
) => Promise<void>;

describe("pipeline scheduler OBO handoff", () => {
  let scheduler: SchedulerModule;
  let rows: RunRow[];
  let start: Mock<PipelineStart>;
  let findMany: ReturnType<typeof vi.fn>;
  let updateMany: ReturnType<typeof vi.fn>;
  let loggerCalls: Array<unknown>;

  beforeEach(async () => {
    vi.resetModules();
    rows = [];
    loggerCalls = [];

    findMany = vi.fn(
      async (args?: { where?: { status?: string; ownerEmail?: string | { not: null } } }) =>
        rows
          .filter(
            (row) =>
              row.status === (args?.where?.status ?? "queued") &&
              row.ownerEmail !== null &&
              (typeof args?.where?.ownerEmail !== "string" ||
                row.ownerEmail === args.where.ownerEmail),
          )
          .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
          .map(({ runId, ownerEmail }) => ({ runId, ownerEmail })),
    );
    updateMany = vi.fn(
      async (args: { where: { runId: string; status: string }; data: { status: string } }) => {
        const row = rows.find(
          (candidate) =>
            candidate.runId === args.where.runId && candidate.status === args.where.status,
        );
        if (!row) return { count: 0 };
        row.status = args.data.status;
        return { count: 1 };
      },
    );

    const fakePrisma = {
      forgeRun: {
        findMany,
        updateMany,
        count: vi.fn(
          async (args: { where: { ownerEmail: string; status: { in: string[] } | string } }) => {
            const statuses =
              typeof args.where.status === "string" ? [args.where.status] : args.where.status.in;
            return rows.filter(
              (row) => row.ownerEmail === args.where.ownerEmail && statuses.includes(row.status),
            ).length;
          },
        ),
        findUnique: vi.fn(),
      },
    };

    vi.doMock("@/lib/prisma", () => ({
      withPrisma: async <T>(work: (prisma: typeof fakePrisma) => Promise<T>) => work(fakePrisma),
    }));
    vi.doMock("@/lib/quotas", () => ({ getCap: () => 1 }));
    vi.doMock("@/lib/lakebase/activity-log", () => ({
      logActivity: vi.fn(async () => undefined),
    }));
    vi.doMock("@/lib/logger", () => ({
      logger: {
        debug: (...args: unknown[]) => loggerCalls.push(args),
        info: (...args: unknown[]) => loggerCalls.push(args),
        warn: (...args: unknown[]) => loggerCalls.push(args),
        error: (...args: unknown[]) => loggerCalls.push(args),
      },
    }));

    scheduler = await import("@/lib/pipeline/scheduler");
    start = vi.fn<PipelineStart>(async () => undefined);
    scheduler.registerPipelineStarter({ start });
  });

  afterEach(() => {
    scheduler.stopScheduler();
    vi.restoreAllMocks();
    vi.doUnmock("@/lib/prisma");
    vi.doUnmock("@/lib/quotas");
    vi.doUnmock("@/lib/lakebase/activity-log");
    vi.doUnmock("@/lib/logger");
  });

  it("promotes with the handed-off token and removes it after the claim", async () => {
    const token = "obo-secret-for-run-1";
    rows.push({
      runId: "run-1",
      ownerEmail: "alice@example.com",
      status: "queued",
      createdAt: new Date("2026-01-01T00:00:00Z"),
    });

    expect(scheduler.handoffQueuedRunOboToken("run-1", "alice@example.com", token)).toBe(true);
    scheduler.notifyScheduler();

    await vi.waitFor(() => expect(start).toHaveBeenCalledTimes(1));
    expect(start).toHaveBeenCalledWith("run-1", {
      ownerEmail: "alice@example.com",
      oboToken: token,
    });
    expect(rows[0]?.status).toBe("pending");
    expect(JSON.stringify(loggerCalls)).not.toContain(token);

    // Even if the same DB row appeared queued again, the consumed token is
    // gone and cannot be reused by a later scheduler tick.
    rows[0]!.status = "queued";
    scheduler.notifyScheduler();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(start).toHaveBeenCalledTimes(1);
  });

  it("does not claim a queued row when this instance has no OBO token", async () => {
    rows.push({
      runId: "run-after-restart",
      ownerEmail: "alice@example.com",
      status: "queued",
      createdAt: new Date("2026-01-01T00:00:00Z"),
    });

    expect(scheduler.handoffQueuedRunOboToken("run-after-restart", "alice@example.com", null)).toBe(
      false,
    );
    scheduler.notifyScheduler();
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(findMany).not.toHaveBeenCalled();
    expect(updateMany).not.toHaveBeenCalled();
    expect(start).not.toHaveBeenCalled();
    expect(rows[0]?.status).toBe("queued");
  });

  it("leaves the global FIFO head for the instance that owns its token", async () => {
    rows.push(
      {
        runId: "oldest-on-other-instance",
        ownerEmail: "alice@example.com",
        status: "queued",
        createdAt: new Date("2026-01-01T00:00:00Z"),
      },
      {
        runId: "newer-on-this-instance",
        ownerEmail: "alice@example.com",
        status: "queued",
        createdAt: new Date("2026-01-02T00:00:00Z"),
      },
    );
    scheduler.handoffQueuedRunOboToken(
      "newer-on-this-instance",
      "alice@example.com",
      "newer-token",
    );

    scheduler.notifyScheduler();
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(updateMany).not.toHaveBeenCalled();
    expect(start).not.toHaveBeenCalled();
    expect(rows.every((row) => row.status === "queued")).toBe(true);
  });

  it("cleans handoffs whose run is no longer queued", async () => {
    scheduler.handoffQueuedRunOboToken("cancelled-run", "alice@example.com", "one-use-token");
    scheduler.notifyScheduler();
    await vi.waitFor(() => expect(findMany).toHaveBeenCalledTimes(1));

    rows.push({
      runId: "cancelled-run",
      ownerEmail: "alice@example.com",
      status: "queued",
      createdAt: new Date("2026-01-01T00:00:00Z"),
    });
    scheduler.notifyScheduler();
    await new Promise((resolve) => setTimeout(resolve, 20));

    // A fresh DB row with the same id cannot reuse the stale credential.
    expect(findMany).toHaveBeenCalledTimes(1);
    expect(start).not.toHaveBeenCalled();
  });

  it("expires a handoff when authenticated polling stops", async () => {
    const now = vi.spyOn(Date, "now").mockReturnValue(1_000);
    rows.push({
      runId: "expired-run",
      ownerEmail: "alice@example.com",
      status: "queued",
      createdAt: new Date("2026-01-01T00:00:00Z"),
    });
    scheduler.handoffQueuedRunOboToken("expired-run", "alice@example.com", "expired-token");
    now.mockReturnValue(1_000 + scheduler.QUEUED_RUN_OBO_TTL_MS + 1);

    scheduler.notifyScheduler();
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(findMany).not.toHaveBeenCalled();
    expect(updateMany).not.toHaveBeenCalled();
    expect(start).not.toHaveBeenCalled();
    expect(rows[0]?.status).toBe("queued");
  });

  it("rebuilds an expired handoff from a fresh owner poll", async () => {
    const now = vi.spyOn(Date, "now").mockReturnValue(1_000);
    rows.push({
      runId: "refreshed-run",
      ownerEmail: "alice@example.com",
      status: "queued",
      createdAt: new Date("2026-01-01T00:00:00Z"),
    });
    scheduler.handoffQueuedRunOboToken("refreshed-run", "alice@example.com", "expired-token");
    now.mockReturnValue(1_000 + scheduler.QUEUED_RUN_OBO_TTL_MS + 1);

    await expect(
      scheduler.refreshQueuedRunOboTokensForOwner("ALICE@example.com", "fresh-token"),
    ).resolves.toBe(1);
    scheduler.notifyScheduler();

    await vi.waitFor(() => expect(start).toHaveBeenCalledTimes(1));
    expect(start).toHaveBeenCalledWith("refreshed-run", {
      ownerEmail: "alice@example.com",
      oboToken: "fresh-token",
    });
  });
});
