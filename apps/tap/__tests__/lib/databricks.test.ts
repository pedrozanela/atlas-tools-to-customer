import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const originalEnv = { ...process.env };

async function loadDatabricks(env: Record<string, string | undefined>) {
  vi.resetModules();
  // Mock next/headers so importing lib/databricks doesn't throw when running
  // outside a Next request context.
  vi.doMock("next/headers", () => ({
    headers: async () => ({ get: () => null }),
  }));
  // Mock @databricks/sql — we never want to actually connect from tests.
  vi.doMock("@databricks/sql", () => ({
    DBSQLClient: class {
      async connect() {}
      async openSession() {
        return {
          executeStatement: vi.fn().mockResolvedValue({
            fetchAll: vi.fn().mockResolvedValue([]),
            close: vi.fn(),
          }),
          close: vi.fn(),
        };
      }
      async close() {}
    },
  }));
  process.env = { ...originalEnv };
  for (const [k, v] of Object.entries(env)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  return await import("@/lib/databricks");
}

describe("saveTools — mock mode", () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
    process.env = { ...originalEnv };
    vi.doUnmock("@databricks/sql");
    vi.doUnmock("next/headers");
  });

  it("returns true without touching the SQL client when APP_DEV_MOCK_DATABASE=true", async () => {
    const { saveTools } = await loadDatabricks({
      APP_DEV_MOCK_DATABASE: "true",
    });
    const ok = await saveTools({
      company_name: "Acme",
      user_name: "alice@example.com",
      company_industry: "Tech",
      cloud_provider: ["AWS"],
      tools: { "Batch Sources": ["Salesforce"] },
      criteria: {},
    });
    expect(ok).toBe(true);
    expect(logSpy).toHaveBeenCalled();
  });

  it("masks the user_name in the mock log line", async () => {
    const { saveTools } = await loadDatabricks({
      APP_DEV_MOCK_DATABASE: "true",
    });
    await saveTools({
      company_name: "Acme",
      user_name: "alice@example.com",
      company_industry: "Tech",
      cloud_provider: [],
      tools: {},
      criteria: {},
    });
    const logged = logSpy.mock.calls
      .map((call: unknown[]) => call.join(" "))
      .join("\n");
    // alice@example.com -> ali*** (first 3 chars + ***); the full address
    // must not appear.
    expect(logged).toContain("ali***");
    expect(logged).not.toContain("alice@example.com");
  });

  it("masks short user_names entirely as '***'", async () => {
    const { saveTools } = await loadDatabricks({
      APP_DEV_MOCK_DATABASE: "true",
    });
    await saveTools({
      company_name: "Acme",
      user_name: "ab",
      company_industry: "Tech",
      cloud_provider: [],
      tools: {},
      criteria: {},
    });
    const logged = logSpy.mock.calls
      .map((call: unknown[]) => call.join(" "))
      .join("\n");
    expect(logged).toContain("user=***");
  });
});
