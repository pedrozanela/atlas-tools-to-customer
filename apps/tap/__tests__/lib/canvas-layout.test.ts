import { describe, it, expect } from "vitest";
import {
  CANVAS_SECTIONS,
  COLUMN_TITLES,
  MAX_ROW,
} from "@/lib/canvas-layout";
import { TOOL_CATEGORIES_MAPPING } from "@/lib/constants";

// canvas-layout.ts is the visual mapping of the 18 backend categories onto
// the 7-column blueprint grid. Drift between this file and constants.ts
// would either drop categories from the form (broken UX) or render
// section blocks for categories the API can't resolve (404s).

describe("canvas-layout", () => {
  it("declares exactly 7 column titles", () => {
    expect(COLUMN_TITLES).toHaveLength(7);
  });

  it("covers every category in TOOL_CATEGORIES_MAPPING — no orphan categories", () => {
    const sectionCats = new Set(CANVAS_SECTIONS.map((s) => s.category));
    const backendCats = Object.keys(TOOL_CATEGORIES_MAPPING);
    expect(sectionCats.size).toBe(backendCats.length);
    for (const cat of backendCats) {
      expect(sectionCats.has(cat)).toBe(true);
    }
  });

  it("does not reference any category not declared in TOOL_CATEGORIES_MAPPING", () => {
    const backendCats = new Set(Object.keys(TOOL_CATEGORIES_MAPPING));
    for (const s of CANVAS_SECTIONS) {
      expect(backendCats.has(s.category)).toBe(true);
    }
  });

  it("columns are in range 1..7", () => {
    for (const s of CANVAS_SECTIONS) {
      expect(s.col).toBeGreaterThanOrEqual(1);
      expect(s.col).toBeLessThanOrEqual(7);
    }
  });

  it("(col,row) pairs are unique — no two sections share a cell", () => {
    const cells = CANVAS_SECTIONS.map((s) => `${s.col}-${s.row}`);
    expect(new Set(cells).size).toBe(cells.length);
  });

  it("MAX_ROW is the largest row value", () => {
    const computed = Math.max(...CANVAS_SECTIONS.map((s) => s.row));
    expect(MAX_ROW).toBe(computed);
    expect(MAX_ROW).toBeGreaterThanOrEqual(1);
  });

  it("rows are contiguous within each column (no row gaps)", () => {
    const byCol = new Map<number, number[]>();
    for (const s of CANVAS_SECTIONS) {
      if (!byCol.has(s.col)) byCol.set(s.col, []);
      byCol.get(s.col)!.push(s.row);
    }
    for (const [col, rows] of byCol) {
      const sorted = [...rows].sort((a, b) => a - b);
      for (let i = 0; i < sorted.length; i++) {
        expect(sorted[i], `column ${col} should have row ${i + 1}`).toBe(i + 1);
      }
    }
  });
});
