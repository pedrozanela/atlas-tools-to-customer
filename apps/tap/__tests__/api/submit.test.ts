import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// We exercise the POST handler end-to-end with mock-mode on (so we don't
// touch Lakebase/UC). Verifies: identity comes from X-Forwarded-Email
// headers, falls back to LOCAL_DEV_USER, and rejects bad JSON.

const originalEnv = { ...process.env };

async function loadHandler(headers: Record<string, string>) {
  vi.resetModules();
  vi.doMock("next/headers", () => ({
    headers: async () => ({
      get: (name: string) => headers[name.toLowerCase()] ?? null,
    }),
  }));
  vi.doMock("@databricks/sql", () => ({
    DBSQLClient: class {
      async connect() {}
      async openSession() {
        return {
          executeStatement: async () => ({
            fetchAll: async () => [],
            close: async () => {},
          }),
          close: async () => {},
        };
      }
      async close() {}
    },
  }));
  return await import("@/app/api/submit/tools/route");
}

function makeReq(body: unknown): Request {
  return new Request("http://localhost/api/submit/tools", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("POST /api/submit/tools", () => {
  beforeEach(() => {
    process.env = {
      ...originalEnv,
      APP_DEV_MOCK_DATABASE: "true",
      APP_COMPANY_NAME: "Acme",
      APP_COMPANY_INDUSTRY: "Tech",
      LOCAL_DEV_USER: "dev@example.com",
    };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.doUnmock("next/headers");
    vi.doUnmock("@databricks/sql");
  });

  it("accepts a valid payload and returns {ok:true}", async () => {
    const { POST } = await loadHandler({});
    const res = await POST(
      makeReq({
        cloud_provider: ["AWS"],
        tools: { "Batch Sources": ["Salesforce"] },
      }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it("rejects malformed JSON with 400", async () => {
    const { POST } = await loadHandler({});
    const res = await POST(makeReq("not-json{"));
    expect(res.status).toBe(400);
  });

  it("returns 500 when company env is missing and not mocking", async () => {
    delete process.env.APP_DEV_MOCK_DATABASE;
    delete process.env.APP_COMPANY_NAME;
    const { POST } = await loadHandler({});
    const res = await POST(makeReq({ cloud_provider: [], tools: {} }));
    expect(res.status).toBe(500);
  });

  it("uses x-forwarded-email when present", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const { POST } = await loadHandler({
      "x-forwarded-email": "alice@example.com",
    });
    await POST(makeReq({ cloud_provider: [], tools: {} }));
    const logged = logSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    // Mock-mode prefixes the user_name with the first 3 chars + ***.
    expect(logged).toContain("ali***");
    logSpy.mockRestore();
  });

  it("falls back to LOCAL_DEV_USER when no X-Forwarded-* headers", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const { POST } = await loadHandler({});
    await POST(makeReq({ cloud_provider: [], tools: {} }));
    const logged = logSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(logged).toContain("dev***");
    logSpy.mockRestore();
  });
});
