import { describe, it, expect } from "vitest";
import { GET } from "@/app/api/config/tools/[category]/route";

// These tests hit the real filesystem under public/static/data_tools/, which
// is part of the repo (164 PNG icons). No mocks needed.

async function callGet(category: string) {
  const params = Promise.resolve({ category });
  const res = await GET(new Request("http://localhost/_"), { params });
  return res.json();
}

describe("GET /api/config/tools/[category]", () => {
  it("returns the title-cased tool list for a known category", async () => {
    const body = await callGet("Batch Sources");
    expect(body.category).toBe("Batch Sources");
    // The folder contains: mysql, oracle, postgres, salesforce, sap, sql_server.
    expect(body.tools).toContain("Salesforce");
    expect(body.tools).toContain("Sql Server");
    expect(body.tools).toContain("Mysql");
    // Sorted alphabetically.
    expect([...body.tools].sort()).toEqual(body.tools);
  });

  it("title-cases underscored filenames (e.g. sql_server.png -> Sql Server)", async () => {
    const body = await callGet("Batch Sources");
    // The folder has both `mysql.png` and `sql_server.png`; the title-cased
    // form of the latter must be present verbatim.
    expect(body.tools).toContain("Sql Server");
    expect(body.tools).toContain("Mysql");
  });

  it("returns an empty list for an unknown category folder", async () => {
    const body = await callGet("Does Not Exist");
    expect(body.tools).toEqual([]);
  });

  it("URL-decodes the path segment before sanitising", async () => {
    // Frontend URL-encodes "Batch Sources" -> "Batch%20Sources".
    const body = await callGet("Batch%20Sources");
    expect(body.tools.length).toBeGreaterThan(0);
  });
});
