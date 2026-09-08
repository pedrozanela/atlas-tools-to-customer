import { describe, expect, it } from "vitest";
import { atlasNextConfig, getPeopleRewrites } from "../next.config";

describe("People & Training cross-zone rewrites", () => {
  it("preserves trailing slashes owned by the FastAPI zone", () => {
    expect(atlasNextConfig.skipTrailingSlashRedirect).toBe(true);
  });

  it("preserves the /people prefix for the SPA, API, and assets", () => {
    expect(getPeopleRewrites("http://localhost:3005")).toEqual([
      {
        source: "/people",
        destination: "http://localhost:3005/people",
      },
      {
        source: "/people/:path*",
        destination: "http://localhost:3005/people/:path*",
      },
    ]);
  });

  it("uses a segment-bounded source instead of intercepting people-like shell routes", () => {
    const sources = getPeopleRewrites().map((rewrite) => rewrite.source);
    expect(sources).toEqual(["/people", "/people/:path*"]);
    expect(sources).not.toContain("/people*");
  });
});
