import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const operatingModelHtml = readFileSync(
  new URL("../public/operating-model-reference/index.html", import.meta.url),
  "utf8",
);

function sourceBetween(startMarker: string, endMarker: string) {
  const start = operatingModelHtml.indexOf(startMarker);
  const end = operatingModelHtml.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end < 0) {
    throw new Error(`Unable to locate Operating Model source block: ${startMarker}`);
  }
  return operatingModelHtml.slice(start, end);
}

const rolesSource = sourceBetween("const ROLES = {", "const LAYERS = [");
const layersSource = sourceBetween("const LAYERS = [", "/* Melhores práticas técnicas");
const principlesSource = sourceBetween("const PRINCIPLES = [", "/* ---------------- Render");
const buildingBlocksSource = sourceBetween("const BUILDING = [", "function buildWheel");

const roleKeys = [...rolesSource.matchAll(/^\s{2}([A-Z]+):\{/gm)].map((match) => match[1]);
const layerIds = [...layersSource.matchAll(/\{id:"([^"]+)"/g)].map((match) => match[1]);
const productLines = layersSource.match(/^\s+\{n:".*$/gm) ?? [];
const productNames = productLines.map((line) => line.match(/^\s+\{n:"([^"]+)"/)?.[1]);
const principleNames = [...principlesSource.matchAll(/\{h:"([^"]+)"/g)].map((match) => match[1]);
const buildingBlockNames = [...buildingBlocksSource.matchAll(/\{n:\d+, t:"([^"]+)"/g)].map(
  (match) => match[1],
);

describe("Platform Operating Model data", () => {
  it("contains the complete runtime inventory", () => {
    expect(roleKeys).toHaveLength(8);
    expect(layerIds).toHaveLength(7);
    expect(buildingBlockNames).toHaveLength(6);
    expect(principleNames).toHaveLength(6);
    expect(productNames).toHaveLength(46);
  });

  it("uses unique role, layer, and product identifiers", () => {
    expect(new Set(roleKeys).size).toBe(roleKeys.length);
    expect(new Set(layerIds).size).toBe(layerIds.length);
    expect(new Set(productNames).size).toBe(productNames.length);
  });

  it("assigns at least one valid role to every responsibility cell", () => {
    const validRoles = new Set(roleKeys);

    for (const productLine of productLines) {
      const assignments = [...productLine.matchAll(/\b(pol|mng|ops|use):\[([^\]]+)\]/g)];
      expect(assignments.map((match) => match[1])).toEqual(["pol", "mng", "ops", "use"]);
      for (const assignment of assignments) {
        const assignedRoles = [...assignment[2].matchAll(/"([A-Z]+)"/g)].map((match) => match[1]);
        expect(assignedRoles.length).toBeGreaterThan(0);
        expect(assignedRoles.every((role) => validRoles.has(role))).toBe(true);
      }
    }
  });

  it("uses secure URLs for external links", () => {
    expect(operatingModelHtml).not.toMatch(/href="http:\/\//);
  });

  it("preserves the original visual language and diagrams", () => {
    expect(operatingModelHtml).toContain("--bg:#f4f6f8");
    expect(operatingModelHtml).toContain("--ink:#16272e");
    expect(operatingModelHtml).toContain("--accent:#e23015");
    expect(operatingModelHtml).toContain("--hub:#0f4c5c");
    expect(operatingModelHtml.match(/<svg\b/g)?.length).toBeGreaterThanOrEqual(5);
    expect(operatingModelHtml).toContain('class="wheel"');
  });

  it("exposes every original section and the hybrid Atlas journey to the guide", () => {
    const expectedTargets = [
      ["plataforma", "operating-model-overview"],
      ["modelo", "operating-archetypes"],
      ["papeis", "operating-roles"],
      ["coe", "operating-building-blocks"],
      ["matriz", "operating-matrix"],
      ["atlas-journey", "operating-atlas-journey"],
    ];

    for (const [section, target] of expectedTargets) {
      expect(operatingModelHtml).toContain(`<section id="${section}" data-atlas-tour="${target}">`);
    }
    for (const route of ["/tap?view=list", "/maturity", "/waf", "/forge"]) {
      expect(operatingModelHtml).toContain(`href="${route}" target="_top"`);
    }
  });

  it("removes exported review data and renders the matrix only once", () => {
    expect(operatingModelHtml).not.toMatch(
      /\/api\/|comments\.(?:css|js)|cmt-|class="annot"|data-cid|governanca\.html/,
    );
    expect(operatingModelHtml).not.toContain('<tbody class="lgroup"');
    expect(operatingModelHtml).toContain("const tbodies = LAYERS.map");
    expect(operatingModelHtml).toContain("return group + rows;");
    expect(operatingModelHtml).toContain('insertAdjacentHTML("beforeend", tbodies)');
  });
});
