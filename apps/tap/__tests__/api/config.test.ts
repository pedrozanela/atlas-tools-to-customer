import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

describe("GET /api/config", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    vi.doMock("next/headers", () => ({
      headers: async () => ({ get: () => null }),
    }));
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.doUnmock("next/headers");
  });

  it("returns the full TOOL_CATEGORIES_MAPPING + cloud providers", async () => {
    process.env.APP_DEV_MOCK_DATABASE = "true";
    const { GET } = await import("@/app/api/config/route");
    const res = await GET();
    const body = await res.json();

    expect(body.tool_categories).toBeTypeOf("object");
    expect(Object.keys(body.tool_categories)).toHaveLength(18);
    expect(body.cloud_providers).toEqual([
      "AWS",
      "Azure",
      "GCP",
      "Oracle",
      "Other",
    ]);
    expect(body.cloud_providers_standard).toEqual([
      "AWS",
      "Azure",
      "GCP",
      "Oracle",
    ]);
    expect(body.is_development).toBe(true);
  });

  it("is_development=false when APP_DEV_MOCK_DATABASE not set", async () => {
    delete process.env.APP_DEV_MOCK_DATABASE;
    const { GET } = await import("@/app/api/config/route");
    const res = await GET();
    const body = await res.json();
    expect(body.is_development).toBe(false);
  });
});
