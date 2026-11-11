import { beforeEach, describe, expect, it, vi } from "vitest";

const genie = vi.hoisted(() => ({
  spaces: [] as Array<{ space_id: string; title: string; description: string; parent_path: string }>,
  createGenieSpace: vi.fn(),
  updateGenieSpace: vi.fn(),
}));

vi.mock("@/lib/dbx/genie", () => ({
  DEFAULT_GENIE_PARENT_PATH: "/Shared/Forge Genie Spaces/",
  listGenieSpaces: async () => ({ spaces: genie.spaces.map(({ space_id, title }) => ({ space_id, title })) }),
  getGenieSpace: async (id: string) => genie.spaces.find((s) => s.space_id === id)!,
  createGenieSpace: genie.createGenieSpace,
  updateGenieSpace: genie.updateGenieSpace,
}));
vi.mock("@/lib/dbx/client", () => ({
  getConfig: () => ({ host: "https://ws.example", warehouseId: "wh1" }),
}));
vi.mock("@/lib/lakebase/activity-log", () => ({ logActivity: async () => undefined }));
vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { ensureWafGenieSpace } from "@/lib/engines/waf-assessment/genie/provision";
import { getWafGenieDescription } from "@/lib/engines/waf-assessment/genie/builder";

const user = { userEmail: "admin@cliente.com", oboToken: "obo" };

beforeEach(() => {
  process.env.ATLAS_APP_NAME = "atlas";
  genie.spaces = [];
  genie.createGenieSpace.mockReset().mockResolvedValue({ space_id: "a".repeat(32) });
  genie.updateGenieSpace.mockReset().mockImplementation(async (id: string) => ({ space_id: id }));
});

describe("WAF Genie Agent identity", () => {
  it("creates the Agent when none exists for this app", async () => {
    expect((await ensureWafGenieSpace(user)).action).toBe("created");
  });

  it("reuses an existing Agent with a collision-suffixed title without renaming it", async () => {
    genie.spaces = [
      {
        space_id: "b".repeat(32),
        title: "Forge WAF Genie 2026-11-10 17:51:22",
        description: getWafGenieDescription(),
        parent_path: "/Shared",
      },
    ];
    const result = await ensureWafGenieSpace(user);
    expect(result).toMatchObject({ action: "updated", spaceId: "b".repeat(32) });
    expect(genie.createGenieSpace).not.toHaveBeenCalled();
    expect(genie.updateGenieSpace.mock.calls[0][1]).not.toHaveProperty("title");
  });

  it("ignores Agents with a similar but different title", async () => {
    genie.spaces = [
      {
        space_id: "c".repeat(32),
        title: "Forge WAF Genie copy",
        description: getWafGenieDescription(),
        parent_path: "/Shared",
      },
    ];
    expect((await ensureWafGenieSpace(user)).action).toBe("created");
  });
});
