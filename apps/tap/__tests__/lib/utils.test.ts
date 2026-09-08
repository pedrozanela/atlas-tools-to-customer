import { describe, it, expect } from "vitest";
import { sanitizeCategory, cn } from "@/lib/utils";

// Frontend sanitizeCategory must agree with the server-side version
// (lib/config.ts) — drift breaks /api/config/tools/{category} routing.
describe("sanitizeCategory (frontend)", () => {
  it("handles the same edge cases as the server", () => {
    expect(sanitizeCategory("Data Visualization (BI)")).toBe(
      "Data Visualization BI",
    );
    expect(sanitizeCategory("Streaming / NRT")).toBe("Streaming NRT");
    expect(sanitizeCategory("Data Science / Lab")).toBe("Data Science Lab");
  });

  it("returns empty string for input that has no letters", () => {
    expect(sanitizeCategory("/ / /")).toBe("");
  });
});

describe("cn (class merger)", () => {
  it("merges truthy classes and dedupes tailwind conflicts", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
    expect(cn("text-foreground", false && "hidden", "block")).toBe(
      "text-foreground block",
    );
  });
});
