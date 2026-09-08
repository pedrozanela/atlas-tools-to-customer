import { describe, expect, it } from "vitest";
import { forgeApiUrl } from "@/lib/forge-fetch";

describe("forgeApiUrl", () => {
  it("prefixes root-relative API requests with the Forge base path", () => {
    expect(forgeApiUrl("/api/metadata?type=catalogs#sources")).toBe(
      "/forge/api/metadata?type=catalogs#sources",
    );
  });

  it("does not rewrite non-API or network URLs", () => {
    expect(forgeApiUrl("/forge/api/metadata")).toBe("/forge/api/metadata");
    expect(forgeApiUrl("/forgeish/api/metadata")).toBe("/forgeish/api/metadata");
    expect(forgeApiUrl("https://example.invalid/api/metadata")).toBe(
      "https://example.invalid/api/metadata",
    );
    expect(forgeApiUrl("//example.invalid/api/metadata")).toBe("//example.invalid/api/metadata");
  });
});
