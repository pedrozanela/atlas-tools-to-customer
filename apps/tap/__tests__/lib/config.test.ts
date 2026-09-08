import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Reload the module per-test so AppConfig (read at import time from
// process.env) reflects the test's env mutations.
async function loadConfig(env: Record<string, string | undefined>) {
  vi.resetModules();
  const original = { ...process.env };
  for (const [k, v] of Object.entries(env)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  try {
    return await import("@/lib/config");
  } finally {
    process.env = original;
  }
}

describe("sanitizeCategory", () => {
  // sanitizeCategory is pure and doesn't read env, import once.
  let sanitizeCategory: typeof import("@/lib/config").sanitizeCategory;
  beforeEach(async () => {
    ({ sanitizeCategory } = await import("@/lib/config"));
  });

  it("strips non-letter characters per whitespace-separated token", () => {
    expect(sanitizeCategory("Data Visualization (BI)")).toBe(
      "Data Visualization BI",
    );
    expect(sanitizeCategory("MLOps / Serving")).toBe("MLOps Serving");
    expect(sanitizeCategory("Query Tools & Data Sharing")).toBe(
      "Query Tools Data Sharing",
    );
  });

  it("drops empty tokens (e.g. lone punctuation)", () => {
    expect(sanitizeCategory("Data / / Lab")).toBe("Data Lab");
  });

  it("is idempotent on already-sanitized input", () => {
    expect(sanitizeCategory("Batch Sources")).toBe("Batch Sources");
  });
});

describe("AppConfig env defaults", () => {
  const originalEnv = { ...process.env };
  afterEach(() => {
    process.env = originalEnv;
  });

  it("DEV_MOCK_DATABASE is true when env is 'true' (case-insensitive)", async () => {
    const { AppConfig } = await loadConfig({
      APP_DEV_MOCK_DATABASE: "TRUE",
    });
    expect(AppConfig.DEV_MOCK_DATABASE).toBe(true);
  });

  it("DEV_MOCK_DATABASE defaults to false when unset", async () => {
    const { AppConfig } = await loadConfig({
      APP_DEV_MOCK_DATABASE: undefined,
    });
    expect(AppConfig.DEV_MOCK_DATABASE).toBe(false);
  });

  it("UC_TABLE has a default", async () => {
    const { AppConfig } = await loadConfig({ UC_TABLE: undefined });
    expect(AppConfig.UC_TABLE).toBe("databricks_tap_tool_submissions");
  });

  it("LOCAL_DEV_USER has a default", async () => {
    const { AppConfig } = await loadConfig({ LOCAL_DEV_USER: undefined });
    expect(AppConfig.LOCAL_DEV_USER).toBe("local-dev@example.com");
  });
});

describe("isDatabaseConfigured / isCompanyConfigured / fullTableName", () => {
  afterEach(() => {
    vi.resetModules();
  });

  it("isDatabaseConfigured true when all 4 vars present", async () => {
    const { isDatabaseConfigured } = await loadConfig({
      DATABRICKS_HOST: "x.azuredatabricks.net",
      DATABRICKS_WAREHOUSE_HTTP_PATH: "/sql/1.0/warehouses/abc",
      UC_CATALOG: "databricks_atlas",
      UC_SCHEMA: "tap",
    });
    expect(isDatabaseConfigured()).toBe(true);
  });

  it("isDatabaseConfigured false when any var missing", async () => {
    const { isDatabaseConfigured } = await loadConfig({
      DATABRICKS_HOST: "x.azuredatabricks.net",
      DATABRICKS_WAREHOUSE_HTTP_PATH: undefined,
      UC_CATALOG: "databricks_atlas",
      UC_SCHEMA: "tap",
    });
    expect(isDatabaseConfigured()).toBe(false);
  });

  it("isCompanyConfigured requires both APP_COMPANY_* vars", async () => {
    const { isCompanyConfigured } = await loadConfig({
      APP_COMPANY_NAME: "Acme",
      APP_COMPANY_INDUSTRY: undefined,
    });
    expect(isCompanyConfigured()).toBe(false);
  });

  it("fullTableName composes catalog.schema.table", async () => {
    const { fullTableName } = await loadConfig({
      UC_CATALOG: "databricks_atlas",
      UC_SCHEMA: "tap",
      UC_TABLE: "submissions",
    });
    expect(fullTableName()).toBe("databricks_atlas.tap.submissions");
  });
});
