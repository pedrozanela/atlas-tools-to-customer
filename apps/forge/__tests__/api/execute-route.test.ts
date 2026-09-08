import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const RUN_ID = "00000000-0000-4000-8000-000000000001";
const OBO_TOKEN = "request-scoped-obo-token";

const mocks = vi.hoisted(() => ({
  ensureMigrated: vi.fn(async () => undefined),
  failOrphanedRunningRun: vi.fn(async () => false),
  loadRunOrRespond: vi.fn(),
  checkQuota: vi.fn(async () => ({
    allowed: false,
    cap: 1,
    active: 1,
    shouldQueue: true,
  })),
  updateRunStatus: vi.fn(async () => undefined),
  logActivity: vi.fn(async () => undefined),
  handoffQueuedRunOboToken: vi.fn(() => true),
  notifyScheduler: vi.fn(),
  getQueuePosition: vi.fn(async () => 1),
}));

vi.mock("@/lib/logger", () => ({
  apiLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));
vi.mock("@/lib/error-utils", () => ({ safeErrorMessage: (error: unknown) => String(error) }));
vi.mock("@/lib/lakebase/runs", () => ({
  failOrphanedRunningRun: mocks.failOrphanedRunningRun,
  updateRunStatus: mocks.updateRunStatus,
}));
vi.mock("@/lib/pipeline/engine", () => ({
  startPipeline: vi.fn(),
  resumePipeline: vi.fn(),
  getActivePipelineRunIds: () => [],
}));
vi.mock("@/lib/lakebase/schema", () => ({ ensureMigrated: mocks.ensureMigrated }));
vi.mock("@/lib/validation", () => ({ isValidUUID: () => true }));
vi.mock("@/lib/auth/route-guards", () => ({ loadRunOrRespond: mocks.loadRunOrRespond }));
vi.mock("@/lib/quotas", () => ({ checkQuota: mocks.checkQuota }));
vi.mock("@/lib/lakebase/usage", () => ({ recordUsage: { pipelineRun: vi.fn() } }));
vi.mock("@/lib/lakebase/activity-log", () => ({ logActivity: mocks.logActivity }));
vi.mock("@/lib/pipeline/scheduler", () => ({
  handoffQueuedRunOboToken: mocks.handoffQueuedRunOboToken,
  notifyScheduler: mocks.notifyScheduler,
  getQueuePosition: mocks.getQueuePosition,
}));

import { POST } from "@/app/api/runs/[runId]/execute/route";

describe("POST /api/runs/[runId]/execute queue handoff", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    { label: "new execution", status: "pending", query: "" },
    { label: "resume", status: "failed", query: "?resume=true" },
  ])(
    "hands the request OBO token to the scheduler for a queued $label",
    async ({ status, query }) => {
      mocks.loadRunOrRespond.mockResolvedValue({
        ok: true,
        value: { run: { status } },
        user: { email: "alice@example.com", oboToken: OBO_TOKEN },
        permission: "owner",
      });
      const request = new NextRequest(`http://localhost/api/runs/${RUN_ID}/execute${query}`, {
        method: "POST",
      });

      const response = await POST(request, { params: Promise.resolve({ runId: RUN_ID }) });

      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({ status: "queued", runId: RUN_ID });
      expect(mocks.handoffQueuedRunOboToken).toHaveBeenCalledWith(
        RUN_ID,
        "alice@example.com",
        OBO_TOKEN,
      );
      expect(mocks.notifyScheduler).toHaveBeenCalledTimes(1);
      expect(mocks.handoffQueuedRunOboToken.mock.invocationCallOrder[0]).toBeLessThan(
        mocks.notifyScheduler.mock.invocationCallOrder[0]!,
      );
    },
  );
});
