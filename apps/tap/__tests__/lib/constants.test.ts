import { describe, it, expect } from "vitest";
import {
  TOOL_CATEGORIES_MAPPING,
  CLOUD_PROVIDERS,
  CLOUD_PROVIDERS_STANDARD,
} from "@/lib/constants";

// Reserved column names that must NOT collide with any tool column.
// Mirrors the derived set in lib/databricks.ts.
const RESERVED = [
  "id",
  "created_at",
  "company_name",
  "user_name",
  "company_industry",
  "cloud_provider",
];

describe("TOOL_CATEGORIES_MAPPING", () => {
  const labels = Object.keys(TOOL_CATEGORIES_MAPPING);
  const cols = Object.values(TOOL_CATEGORIES_MAPPING);

  it("has 18 categories (the form's canonical count)", () => {
    expect(labels).toHaveLength(18);
  });

  it("DB column names are unique", () => {
    expect(new Set(cols).size).toBe(cols.length);
  });

  it("display labels are unique", () => {
    expect(new Set(labels).size).toBe(labels.length);
  });

  it("DB column names are lowercase snake_case", () => {
    for (const col of cols) {
      expect(col).toMatch(/^[a-z][a-z0-9_]*$/);
    }
  });

  it("no DB column collides with a reserved/core column", () => {
    for (const col of cols) {
      expect(RESERVED).not.toContain(col);
    }
  });

  it("includes the well-known canonical categories", () => {
    expect(labels).toContain("Batch Sources");
    expect(labels).toContain("Data Lake");
    expect(labels).toContain("MLOps / Serving");
    expect(TOOL_CATEGORIES_MAPPING["Batch Sources"]).toBe("batch_sources");
  });
});

describe("CLOUD_PROVIDERS", () => {
  it("contains the four standard providers plus Other", () => {
    expect(CLOUD_PROVIDERS).toEqual(["AWS", "Azure", "GCP", "Oracle", "Other"]);
  });

  it("CLOUD_PROVIDERS_STANDARD is a strict subset (no 'Other')", () => {
    expect(CLOUD_PROVIDERS_STANDARD).toEqual(["AWS", "Azure", "GCP", "Oracle"]);
    for (const p of CLOUD_PROVIDERS_STANDARD) {
      expect(CLOUD_PROVIDERS).toContain(p);
    }
  });
});
