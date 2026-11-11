import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  SCOPED_SYSTEM_TABLES,
  parseScopeSchema,
  scopeSystemTableNames,
  scopeSystemTables,
  workspaceScopeLabel,
} from "@/lib/dbx/system-scope";
import { buildWafGenieSpace } from "@/lib/engines/waf-assessment/genie/builder";
import { buildRecommendationPrompt } from "@/lib/engines/waf-assessment/genie/recommendations";

const SCOPE = "cust_cat.atlas_system";
const UNSCOPED_REF = /\bsystem\.(access|billing|compute|lakeflow|query)\.([a-z_]+)\b/gi;

/** Allowlisted system tables still referenced after scoping (should be none). */
function leftovers(text: string): string[] {
  return [...text.matchAll(UNSCOPED_REF)]
    .map((m) => m[0].toLowerCase())
    .filter((fqn) => SCOPED_SYSTEM_TABLES.has(fqn));
}

afterEach(() => {
  delete process.env.ATLAS_SYSTEM_SCOPE_SCHEMA;
  delete process.env.ATLAS_WORKSPACE_SCOPE;
});

describe("scopeSystemTables", () => {
  it("is a no-op without a configured scope", () => {
    const sql = "SELECT * FROM system.billing.usage";
    expect(scopeSystemTables(sql)).toBe(sql);
    expect(scopeSystemTableNames(sql)).toBe(sql);
  });

  it("redirects every workspace-attributed table to its scoped view", () => {
    process.env.ATLAS_SYSTEM_SCOPE_SCHEMA = SCOPE;
    for (const fqn of SCOPED_SYSTEM_TABLES) {
      const view = fqn.split(".").slice(1).join("_");
      expect(scopeSystemTables(`SELECT 1 FROM ${fqn} t`)).toBe(
        `SELECT 1 FROM \`cust_cat\`.\`atlas_system\`.\`${view}\` t`,
      );
      expect(scopeSystemTableNames(fqn)).toBe(`cust_cat.atlas_system.${view}`);
    }
  });

  it("leaves metastore-scoped and workspace-less tables untouched", () => {
    process.env.ATLAS_SYSTEM_SCOPE_SCHEMA = SCOPE;
    const sql =
      "SELECT * FROM system.information_schema.tables JOIN system.billing.list_prices p " +
      "JOIN system.access.workspaces_latest w";
    expect(scopeSystemTables(sql)).toBe(sql);
  });

  it("is case-insensitive and idempotent", () => {
    process.env.ATLAS_SYSTEM_SCOPE_SCHEMA = SCOPE;
    const once = scopeSystemTables("select * from SYSTEM.Query.History");
    expect(once).toBe("select * from `cust_cat`.`atlas_system`.`query_history`");
    expect(scopeSystemTables(once)).toBe(once);
    expect(scopeSystemTableNames("cust_cat.atlas_system.billing_usage")).toBe(
      "cust_cat.atlas_system.billing_usage",
    );
  });

  it("refuses a malformed scope schema instead of reading system.* unscoped", () => {
    expect(() => parseScopeSchema("cat")).toThrow(/catalog>\.<schema/);
    expect(() => parseScopeSchema("cat.sch; DROP TABLE x")).toThrow();
    process.env.ATLAS_SYSTEM_SCOPE_SCHEMA = "not valid";
    expect(() => scopeSystemTables("SELECT 1 FROM system.billing.usage")).toThrow();
  });

  it("exposes the label only when one is configured", () => {
    expect(workspaceScopeLabel()).toBeNull();
    process.env.ATLAS_WORKSPACE_SCOPE = "1 workspace(s): prod (123)";
    expect(workspaceScopeLabel()).toBe("1 workspace(s): prod (123)");
  });
});

describe("workspace scope coverage", () => {
  it("leaves no unscoped system table in any pillar query", () => {
    process.env.ATLAS_SYSTEM_SCOPE_SCHEMA = SCOPE;
    const dir = path.resolve(__dirname, "../../lib/engines/waf-assessment/queries");
    const files = readdirSync(dir).filter((f) => f.endsWith(".sql"));
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      const scoped = scopeSystemTables(readFileSync(path.join(dir, file), "utf-8"));
      expect(leftovers(scoped), file).toEqual([]);
    }
  });

  it("attaches only scoped views (or workspace-less tables) to the Genie Agent", () => {
    process.env.ATLAS_SYSTEM_SCOPE_SCHEMA = SCOPE;
    const serialized = JSON.stringify(buildWafGenieSpace("pt-BR"));
    expect(leftovers(serialized)).toEqual([]);
    const ids = buildWafGenieSpace().data_sources.tables.map((t) => t.identifier);
    for (const id of ids) {
      expect(
        id.startsWith(`${SCOPE}.`) ||
          id.startsWith("system.information_schema.") ||
          id === "system.billing.list_prices",
        id,
      ).toBe(true);
    }
  });

  it("points recommendation prompts at the scoped views and states the scope", () => {
    process.env.ATLAS_SYSTEM_SCOPE_SCHEMA = SCOPE;
    process.env.ATLAS_WORKSPACE_SCOPE = "2 workspace(s): prod (1), ml (2)";
    const prompt = buildRecommendationPrompt({
      wafId: "CO-01-03",
      pillar: "cost_optimisation",
      principle: "p",
      bestPractice: "b",
      scorePercentage: 10,
      thresholdPercentage: 80,
      details: "Evidence comes from system.billing.usage and system.compute.clusters.",
      recommendationIfNotMet: "Check system.query.history.",
      metricDefinition: "share of DBUs in system.billing.usage",
      fixActionParamsJson: null,
      locale: "en",
    });
    expect(leftovers(prompt)).toEqual([]);
    expect(prompt).toContain("2 workspace(s): prod (1), ml (2)");
  });
});
