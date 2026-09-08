import { describe, expect, it } from "vitest";
import { headersForAtlasZone, shouldForwardWafOboToken } from "../proxy";

describe("Atlas OBO routing boundary", () => {
  it.each([
    "/waf",
    "/waf/",
    "/waf/api/assessment/run",
    "/forge",
    "/forge/api/pipelines",
  ])("forwards the user token to OBO path %s", (pathname) => {
    expect(shouldForwardWafOboToken(pathname)).toBe(true);
  });

  it.each(["/", "/tap", "/maturity", "/people", "/people/api/health", "/wafish", "/forgery"])(
    "does not forward the user token to non-OBO path %s",
    (pathname) => {
      expect(shouldForwardWafOboToken(pathname)).toBe(false);
    },
  );

  it("preserves the forwarded token for OBO zones and strips it elsewhere", () => {
    const source = new Headers({
      "x-forwarded-access-token": "secret-user-token",
      "x-forwarded-email": "admin@example.com",
    });

    const wafHeaders = headersForAtlasZone("/waf/api/assessment/run", source);
    expect(wafHeaders.get("x-forwarded-access-token")).toBe("secret-user-token");

    const forgeHeaders = headersForAtlasZone("/forge/api/pipelines", source);
    expect(forgeHeaders.get("x-forwarded-access-token")).toBe("secret-user-token");
    expect(forgeHeaders.get("x-forwarded-email")).toBe("admin@example.com");

    const tapHeaders = headersForAtlasZone("/tap/api/submit", source);
    expect(tapHeaders.has("x-forwarded-access-token")).toBe(false);
    expect(tapHeaders.get("x-forwarded-email")).toBe("admin@example.com");

    const peopleHeaders = headersForAtlasZone("/people/api/certifications", source);
    expect(peopleHeaders.has("x-forwarded-access-token")).toBe(false);
    expect(peopleHeaders.get("x-forwarded-email")).toBe("admin@example.com");
  });
});
