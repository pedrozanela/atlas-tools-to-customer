import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/dbx/client", () => ({
  getConfig: () => ({ host: "https://ws.example", warehouseId: "wh1" }),
  getHeaders: async () => ({ Authorization: "Bearer t", "Content-Type": "application/json" }),
}));
const fetchMock = vi.fn();
vi.mock("@/lib/dbx/fetch-with-timeout", () => ({
  fetchWithTimeout: (...args: unknown[]) => fetchMock(...args),
  TIMEOUTS: { SQL_SUBMIT: 1000, SQL_POLL: 1000 },
}));

import { executeSQL } from "@/lib/dbx/sql";
import { SCOPED_SYSTEM_TABLES, scopeSystemTables } from "@/lib/dbx/system-scope";
import { buildWafDashboardJson } from "@/lib/engines/waf-assessment/dashboard/builder";
import { buildWafGenieSpace } from "@/lib/engines/waf-assessment/genie/builder";

const SCOPE = "cust_cat.atlas_system";
const UNSCOPED_REF = /\bsystem\.(access|billing|compute|lakeflow|query)\.([a-z_]+)\b/gi;

function leftovers(text: string): string[] {
  return [...text.matchAll(UNSCOPED_REF)]
    .map((m) => m[0].toLowerCase())
    .filter((fqn) => SCOPED_SYSTEM_TABLES.has(fqn));
}

afterEach(() => {
  delete process.env.ATLAS_SYSTEM_SCOPE_SCHEMA;
  fetchMock.mockReset();
});

describe("Forge workspace scope", () => {
  it("executeSQL submits the scoped statement", async () => {
    process.env.ATLAS_SYSTEM_SCOPE_SCHEMA = SCOPE;
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        statement_id: "s1",
        status: { state: "SUCCEEDED" },
        manifest: { schema: { columns: [] } },
        result: { data_array: [] },
      }),
    });
    await executeSQL("SELECT statement_text FROM system.query.history LIMIT 1");
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.statement).toBe(
      "SELECT statement_text FROM `cust_cat`.`atlas_system`.`query_history` LIMIT 1",
    );
  });

  it("executeSQL is unchanged without a scope", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        statement_id: "s1",
        status: { state: "SUCCEEDED" },
        manifest: { schema: { columns: [] } },
        result: { data_array: [] },
      }),
    });
    await executeSQL("SELECT 1 FROM system.access.table_lineage LIMIT 1");
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.statement).toBe("SELECT 1 FROM system.access.table_lineage LIMIT 1");
  });

  it("leaves no unscoped system table in the Forge copy of the pillar queries", () => {
    process.env.ATLAS_SYSTEM_SCOPE_SCHEMA = SCOPE;
    const dir = path.resolve(__dirname, "../../lib/engines/waf-assessment/queries");
    const files = readdirSync(dir).filter((f) => f.endsWith(".sql"));
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      expect(leftovers(scopeSystemTables(readFileSync(path.join(dir, file), "utf-8"))), file).toEqual(
        [],
      );
    }
  });

  it("scopes every dataset of the published WAF dashboard", async () => {
    process.env.ATLAS_SYSTEM_SCOPE_SCHEMA = SCOPE;
    const dashboard = JSON.parse(await buildWafDashboardJson());
    // Every SQL Lakeview executes must be scoped. Markdown textboxes may still
    // name the source system tables (descriptive only, never executed).
    const executable = JSON.stringify({ ...dashboard, pages: undefined });
    expect(leftovers(executable)).toEqual([]);
    const pagesWithoutText = JSON.stringify(dashboard.pages, (key, value) =>
      key === "multilineTextboxSpec" ? undefined : value,
    );
    expect(leftovers(pagesWithoutText)).toEqual([]);
    expect(executable).toContain("`cust_cat`.`atlas_system`.`billing_usage`");
  });

  it("keeps the dashboard identical when no scope is configured", async () => {
    const template = readFileSync(
      path.resolve(__dirname, "../../lib/engines/waf-assessment/dashboard/template.lvdash.json"),
      "utf-8",
    );
    expect(JSON.parse(await buildWafDashboardJson())).toEqual(JSON.parse(template));
  });

  it("attaches only scoped views (or workspace-less tables) to the Forge WAF Genie", () => {
    process.env.ATLAS_SYSTEM_SCOPE_SCHEMA = SCOPE;
    expect(leftovers(JSON.stringify(buildWafGenieSpace()))).toEqual([]);
  });
});
