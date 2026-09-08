import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  update: vi.fn(async () => undefined),
}));

vi.mock("@/lib/prisma", () => ({
  withPrisma: async <T>(
    work: (prisma: { forgeRun: { update: typeof mocks.update } }) => Promise<T>,
  ) => work({ forgeRun: { update: mocks.update } }),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { updateRunStatus } from "@/lib/lakebase/runs";

describe("updateRunStatus", () => {
  beforeEach(() => {
    mocks.update.mockClear();
  });

  it("clears terminal error and completion fields when a run becomes active again", async () => {
    await updateRunStatus("run-1", "running", null, 42, undefined, "Resuming pipeline...");

    expect(mocks.update).toHaveBeenCalledWith({
      where: { runId: "run-1" },
      data: {
        status: "running",
        currentStep: null,
        progressPct: 42,
        statusMessage: "Resuming pipeline...",
        errorMessage: null,
        completedAt: null,
      },
    });
  });
});
