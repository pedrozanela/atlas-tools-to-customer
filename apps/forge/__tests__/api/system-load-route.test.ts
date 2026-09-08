import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const snapshot = {
  active: { pipelineRuns: 1, scans: 0, genieDeploys: 0, demoEngines: 0, queued: 1 },
  llm: {
    totalInflight: 0,
    totalQueued: 0,
    perEndpoint: [],
    yourInflight: 0,
    yourQueued: 0,
  },
};

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  getSystemLoad: vi.fn(),
  refreshQueuedRunOboTokensForOwner: vi.fn(),
  notifyScheduler: vi.fn(),
}));

vi.mock("@/lib/auth/route-user", () => ({
  requireUser: mocks.requireUser,
  ForgeAuthError: class ForgeAuthError extends Error {
    status = 401;
  },
}));
vi.mock("@/lib/dbx/system-load", () => ({ getSystemLoad: mocks.getSystemLoad }));
vi.mock("@/lib/pipeline/scheduler", () => ({
  refreshQueuedRunOboTokensForOwner: mocks.refreshQueuedRunOboTokensForOwner,
  notifyScheduler: mocks.notifyScheduler,
}));

import { GET } from "@/app/api/system-load/route";

describe("GET /api/system-load queued-run OBO refresh", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSystemLoad.mockResolvedValue(snapshot);
  });

  it("refreshes the authenticated owner's queued runs and wakes the scheduler", async () => {
    mocks.requireUser.mockResolvedValue({
      email: "alice@example.com",
      oboToken: "fresh-poll-token",
    });
    mocks.refreshQueuedRunOboTokensForOwner.mockResolvedValue(1);

    const response = await GET(new NextRequest("http://localhost/api/system-load"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(snapshot);
    expect(mocks.refreshQueuedRunOboTokensForOwner).toHaveBeenCalledWith(
      "alice@example.com",
      "fresh-poll-token",
    );
    expect(mocks.notifyScheduler).toHaveBeenCalledTimes(1);
  });

  it("does not wake the scheduler when no fresh OBO handoff was created", async () => {
    mocks.requireUser.mockResolvedValue({ email: "alice@example.com", oboToken: null });
    mocks.refreshQueuedRunOboTokensForOwner.mockResolvedValue(0);

    const response = await GET(new NextRequest("http://localhost/api/system-load"));

    expect(response.status).toBe(200);
    expect(mocks.refreshQueuedRunOboTokensForOwner).toHaveBeenCalledWith("alice@example.com", null);
    expect(mocks.notifyScheduler).not.toHaveBeenCalled();
  });
});
