import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";

// The auth chain used to try the Databricks CLI (`databricks auth token`)
// before the service-principal exchange. The Databricks Apps runtime injects
// DATABRICKS_HOST, so that CLI branch looked viable in production and shelled
// out to a binary the container doesn't ship. Result: a 5s exec timeout and a
// misleading "run `databricks auth login`" warning on every cold start, before
// falling through to the SP that was available all along.
//
// These tests pin the order so the CLI stays a local-dev-only last resort.

const ORIGINAL_ENV = { ...process.env };

/** Loads client.ts with `child_process.execSync` spied on. */
async function loadClient() {
  vi.resetModules();
  const execSync = vi.fn(() => {
    throw new Error("databricks: command not found");
  });
  vi.doMock("child_process", () => ({ execSync, default: { execSync } }));
  // No request context in these tests, so the OBO header is never present.
  vi.doMock("next/headers", () => ({
    headers: async () => {
      throw new Error("outside request context");
    },
  }));
  const mod = await import("@/lib/dbx/client");
  return { mod, execSync };
}

beforeEach(() => {
  for (const key of [
    "DATABRICKS_TOKEN",
    "DATABRICKS_API_TOKEN",
    "DATABRICKS_CLIENT_ID",
    "DATABRICKS_CLIENT_SECRET",
    "DATABRICKS_CLI_PROFILE",
  ]) {
    delete process.env[key];
  }
  // Mirrors the Apps runtime, which always injects these.
  process.env.DATABRICKS_HOST = "https://example.cloud.databricks.com";
  process.env.DATABRICKS_WAREHOUSE_ID = "wh-1";
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("getBearerToken auth order", () => {
  it("uses the service principal without shelling out to the CLI", async () => {
    process.env.DATABRICKS_CLIENT_ID = "client-abc";
    process.env.DATABRICKS_CLIENT_SECRET = "secret-xyz";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({ access_token: "sp-token", expires_in: 3600 }),
        text: async () => "",
      })),
    );

    const { mod, execSync } = await loadClient();

    await expect(mod.getBearerToken()).resolves.toBe("sp-token");
    // The regression this guards: DATABRICKS_HOST is set, so the old order
    // would have exec'd the CLI first even though the SP was usable.
    expect(execSync).not.toHaveBeenCalled();
  });

  it("prefers an explicit PAT over both the SP and the CLI", async () => {
    process.env.DATABRICKS_TOKEN = "pat-token";
    process.env.DATABRICKS_CLIENT_ID = "client-abc";
    process.env.DATABRICKS_CLIENT_SECRET = "secret-xyz";

    const { mod, execSync } = await loadClient();

    await expect(mod.getBearerToken()).resolves.toBe("pat-token");
    expect(execSync).not.toHaveBeenCalled();
  });

  it("still falls back to the CLI for local dev when no SP is configured", async () => {
    vi.resetModules();
    const execSync = vi.fn(() => JSON.stringify({ access_token: "cli-token" }));
    vi.doMock("child_process", () => ({ execSync, default: { execSync } }));
    vi.doMock("next/headers", () => ({
      headers: async () => {
        throw new Error("outside request context");
      },
    }));
    const mod = await import("@/lib/dbx/client");

    await expect(mod.getBearerToken()).resolves.toBe("cli-token");
    expect(execSync).toHaveBeenCalledOnce();
  });

  it("reports missing credentials when neither the SP nor the CLI works", async () => {
    const { mod } = await loadClient();

    await expect(mod.getBearerToken()).rejects.toThrow(/No authentication credentials found/);
  });
});

describe("getAppHeaders auth order", () => {
  it("uses the service principal without shelling out to the CLI", async () => {
    process.env.DATABRICKS_CLIENT_ID = "client-abc";
    process.env.DATABRICKS_CLIENT_SECRET = "secret-xyz";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({ access_token: "sp-token", expires_in: 3600 }),
        text: async () => "",
      })),
    );

    const { mod, execSync } = await loadClient();

    // getAppHeaders deliberately skips the user's forwarded token, so it hit
    // the same ordering problem the CLI-first chain had.
    await expect(mod.getAppHeaders()).resolves.toMatchObject({
      Authorization: "Bearer sp-token",
    });
    expect(execSync).not.toHaveBeenCalled();
  });
});
