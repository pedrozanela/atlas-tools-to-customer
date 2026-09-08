import { describe, it, expect } from "vitest";
import { SECTIONS, getSection } from "@/lib/sections";

describe("SECTIONS data integrity", () => {
  it("has four focused top-level sections", () => {
    expect(SECTIONS).toHaveLength(4);
    expect(SECTIONS.map((s) => s.key)).toEqual([
      "discovery",
      "inference",
      "acceleration",
      "profilers",
    ]);
  });

  it("each section key is unique", () => {
    const keys = SECTIONS.map((s) => s.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("every item has a href and a key", () => {
    for (const section of SECTIONS) {
      for (const item of section.items) {
        expect(item.key).toBeTruthy();
        expect(item.href).toBeTruthy();
      }
    }
  });

  it("internal hrefs start with '/'; external items are marked", () => {
    for (const section of SECTIONS) {
      for (const item of section.items) {
        if (item.external) {
          expect(item.href).toMatch(/^https?:\/\//);
        } else {
          expect(item.href.startsWith("/")).toBe(true);
        }
      }
    }
  });

  it("item keys are unique across the whole catalog (no slug collisions)", () => {
    const all = SECTIONS.flatMap((s) => s.items.map((i) => i.key));
    expect(new Set(all).size).toBe(all.length);
  });

  it("links to all live Atlas modules", () => {
    const hrefs = SECTIONS.flatMap((s) => s.items.map((i) => i.href));
    expect(hrefs).toContain("/tap");
    expect(hrefs).toContain("/waf");
    expect(hrefs).toContain("/forge");
    expect(hrefs).toContain("/operating-model");
    expect(hrefs).toContain("/people");
  });

  it("serves People as a live cross-zone module and keeps only planned tools disabled", () => {
    const inference = getSection("inference");
    const profilers = getSection("profilers");
    const operatingModel = inference.items.find((item) => item.key === "operating_model");
    const people = inference.items.find((item) => item.key === "people");
    const migrationFactory = profilers.items.find(
      (item) => item.key === "microsoft_migration_factory",
    );

    expect(operatingModel?.href).toBe("/operating-model");
    expect(operatingModel?.crossZone).not.toBe(true);
    expect(operatingModel?.external).not.toBe(true);
    expect(people).toMatchObject({ href: "/people", crossZone: true });
    expect(people?.planned).not.toBe(true);
    expect(migrationFactory?.planned).toBe(true);
  });

  it("separates governance modules from AI and value acceleration", () => {
    expect(getSection("inference").items.map((item) => item.key)).toEqual([
      "operating_model",
      "waf",
      "people",
    ]);
    expect(getSection("acceleration").items.map((item) => item.key)).toEqual([
      "forge",
      "genie_workbench",
    ]);
  });

  it("every internal item that targets a module is marked crossZone", () => {
    // Modules / tools served by another standalone Next.js app via apps/web
    // rewrites. Anything in this list must be crossZone so the shell renders
    // a hard <a> (Link would client-route into a segment it doesn't own).
    const moduleRoots = ["/tap", "/waf", "/forge", "/maturity", "/tools/", "/people"];
    for (const section of SECTIONS) {
      for (const item of section.items) {
        if (item.external) continue;
        const isModule = moduleRoots.some((p) => item.href.startsWith(p));
        if (isModule) {
          expect(item.crossZone, `${item.key} should be crossZone`).toBe(true);
        }
      }
    }
  });
});

describe("getSection", () => {
  it("returns the section by key", () => {
    expect(getSection("discovery").items.some((i) => i.key === "tap")).toBe(true);
    expect(getSection("inference").items.some((i) => i.key === "waf")).toBe(true);
  });

  it("throws for an unknown key", () => {
    // @ts-expect-error — intentionally invalid key
    expect(() => getSection("nope")).toThrow(/Unknown section/);
  });
});
