#!/usr/bin/env node
/**
 * Supervisor for the Atlas Databricks App.
 *
 * Databricks Apps exposes ONE port publicly ($DATABRICKS_APP_PORT, default
 * 8000). Atlas runs four internal Next.js apps plus the Certifica FastAPI
 * service, so the shell (apps/web) listens on the public port and proxies
 * their paths to internal loopback ports.
 *
 * We ship each Next.js zone as a pre-built `standalone.tar.gz` (built
 * locally by `scripts/prepare-standalone.mjs`). Databricks Workspace
 * silently filters `node_modules` directories on upload, so the bundles
 * MUST be archived — we extract them to /tmp at boot and launch the
 * standalone servers from there. Certifica runs directly from its Python
 * source tree using the root requirements.txt.
 *
 * If any child dies, we kill all and exit non-zero so the platform restarts
 * the app.
 */

import { spawn, execFileSync } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import { existsSync, mkdirSync, copyFileSync } from "node:fs";
import http from "node:http";
import path from "node:path";

const PUBLIC_PORT = process.env.DATABRICKS_APP_PORT || "8000";

const FORGE_PORT = "3001";
const WAF_PORT = "3002";
const TAP_PORT = "3003";
const MAS_PORT = "3004";
const PEOPLE_PORT = "3005";
const MOMA_PORT = "3006";

// Where to extract the pre-built standalone bundles. /tmp is writable
// inside the Databricks Apps container.
const EXTRACT_ROOT = process.env.ATLAS_EXTRACT_ROOT || "/tmp/atlas-standalone";

const SHARED_ENV = {
  ...process.env,
  NODE_ENV: "production",
  ATLAS_FORGE_ORIGIN: `http://127.0.0.1:${FORGE_PORT}`,
  ATLAS_WAF_ORIGIN: `http://127.0.0.1:${WAF_PORT}`,
  ATLAS_TAP_ORIGIN: `http://127.0.0.1:${TAP_PORT}`,
  ATLAS_MATURITY_ORIGIN: `http://127.0.0.1:${MAS_PORT}`,
  ATLAS_PEOPLE_ORIGIN: `http://127.0.0.1:${PEOPLE_PORT}`,
};

const children = [];
let shuttingDown = false;

function extractArchive(name) {
  // Tarballs are split into <10 MiB chunks (Databricks Workspace per-file
  // limit) named standalone.tar.gz.part-aa, .ab, … — concatenate them to a
  // temp file, extract, then delete the temp.
  const appDir = path.resolve(`apps/${name}`);
  const dest = path.join(EXTRACT_ROOT, name);
  const merged = path.join(EXTRACT_ROOT, `${name}.tar.gz`);

  mkdirSync(dest, { recursive: true });
  console.log(`[supervisor] reassembling + extracting ${name} → ${dest}`);
  execFileSync("sh", ["-c", `cat ${appDir}/standalone.tar.gz.part-* > ${merged}`], {
    stdio: "inherit",
  });
  execFileSync("tar", ["-xzf", merged, "-C", dest], { stdio: "inherit" });
  execFileSync("rm", ["-f", merged]);
}

function startStandalone(name, port, { public: isPublic = false } = {}) {
  const cwd = path.join(EXTRACT_ROOT, name, "apps", name);
  // Use the absolute path of the running node — `node` is not on PATH
  // inside the Databricks App container, only the entrypoint inherits it
  // implicitly. spawn() with bare "node" → ENOENT.
  const child = spawn(process.execPath, ["server.js"], {
    cwd,
    env: {
      ...SHARED_ENV,
      PORT: port,
      // Internal apps bind to loopback only; the shell binds to 0.0.0.0
      // so the platform health check on $DATABRICKS_APP_PORT succeeds.
      HOSTNAME: isPublic ? "0.0.0.0" : "127.0.0.1",
    },
    stdio: ["ignore", "inherit", "inherit"],
  });
  child.on("exit", (code, signal) => {
    console.error(`[${name}] exited (code=${code}, signal=${signal})`);
    if (!shuttingDown) shutdown(1);
  });
  children.push({ name, child });
  console.log(`[supervisor] launched ${name} on :${port} (pid ${child.pid})`);
}

function startPeople(port) {
  const cwd = path.resolve("apps/people/backend");
  // Databricks installs requirements.txt into a venv beside source_code, but
  // does not expose that venv through the system Python. Resolve the console
  // script directly; this is also how native Python Apps are started.
  const uvicornCandidates = [
    process.env.ATLAS_PEOPLE_UVICORN,
    process.env.VIRTUAL_ENV && path.join(process.env.VIRTUAL_ENV, "bin", "uvicorn"),
    path.resolve("..", ".venv", "bin", "uvicorn"),
    path.resolve(".venv", "bin", "uvicorn"),
    path.join(cwd, ".venv", "bin", "uvicorn"),
  ].filter(Boolean);
  const uvicorn = uvicornCandidates.find((candidate) => existsSync(candidate)) || "uvicorn";

  // In Databricks, fail closed instead of letting Certifica fall back to its
  // local development secrets. Local developers can still run the backend
  // directly with apps/people/backend/.env.
  if (process.env.DATABRICKS_APP_NAME) {
    const required = [
      "CERTIFICA_PGPASSWORD",
      "CERTIFICA_JWT_SECRET",
      "CERTIFICA_SEED_ADMIN_PASSWORD",
      "LLM_ENDPOINT",
    ];
    const missing = required.filter((name) => !process.env[name]);
    if (missing.length > 0) {
      throw new Error(`missing required Certifica environment: ${missing.join(", ")}`);
    }
  }

  const child = spawn(
    uvicorn,
    ["app.main:app", "--host", "127.0.0.1", "--port", port],
    {
      cwd,
      env: {
        ...SHARED_ENV,
        APP_ENV: process.env.APP_ENV || "production",
        API_HOST: "127.0.0.1",
        API_PORT: port,
        MOCK_MODE: process.env.CERTIFICA_MOCK_MODE || "false",
        PGHOST: process.env.CERTIFICA_PGHOST || process.env.PGHOST,
        PGPORT: process.env.CERTIFICA_PGPORT || process.env.PGPORT || "5432",
        PGDATABASE:
          process.env.CERTIFICA_PGDATABASE || process.env.PGDATABASE || "databricks_postgres",
        PGUSER: process.env.CERTIFICA_PGUSER || process.env.PGUSER,
        PGPASSWORD: process.env.CERTIFICA_PGPASSWORD || process.env.PGPASSWORD,
        PGSSLMODE: process.env.CERTIFICA_PGSSLMODE || process.env.PGSSLMODE || "require",
        PGSCHEMA: process.env.CERTIFICA_PGSCHEMA || "certifica",
        LAKEBASE_ENDPOINT_NAME:
          process.env.LAKEBASE_ENDPOINT_NAME || process.env.LAKEBASE_ENDPOINT,
        JWT_SECRET: process.env.CERTIFICA_JWT_SECRET || process.env.JWT_SECRET,
        SEED_ADMIN_PASSWORD:
          process.env.CERTIFICA_SEED_ADMIN_PASSWORD || process.env.SEED_ADMIN_PASSWORD,
        DATABRICKS_SSO_ENABLED:
          process.env.CERTIFICA_DATABRICKS_SSO_ENABLED ||
          process.env.DATABRICKS_SSO_ENABLED ||
          "false",
      },
      stdio: ["ignore", "inherit", "inherit"],
    },
  );
  child.on("exit", (code, signal) => {
    console.error(`[people] exited (code=${code}, signal=${signal})`);
    if (!shuttingDown) shutdown(1);
  });
  child.on("error", (error) => {
    console.error(`[people] failed to launch with ${uvicorn}:`, error);
    if (!shuttingDown) shutdown(1);
  });
  children.push({ name: "people", child });
  console.log(
    `[supervisor] launched people with ${uvicorn} on :${port} (pid ${child.pid})`,
  );
}

function startMoma(port) {
  // MOMA - Maturity & Operating Model Assessment: FastAPI + SPA (Python), basePath /moma.
  // Mesmo padrao do People: resolve uvicorn do venv instalado pelo Databricks.
  const cwd = path.resolve("apps/moma/backend");
  const uvicornCandidates = [
    process.env.ATLAS_MOMA_UVICORN,
    process.env.VIRTUAL_ENV && path.join(process.env.VIRTUAL_ENV, "bin", "uvicorn"),
    path.resolve("..", ".venv", "bin", "uvicorn"),
    path.resolve(".venv", "bin", "uvicorn"),
    path.join(cwd, ".venv", "bin", "uvicorn"),
  ].filter(Boolean);
  const uvicorn = uvicornCandidates.find((candidate) => existsSync(candidate)) || "uvicorn";
  const child = spawn(uvicorn, ["app:app", "--host", "127.0.0.1", "--port", port], {
    cwd,
    env: {
      ...SHARED_ENV,
      APP_BASE_PATH: "/moma",
      // MOMA has its own UC catalog (independent of the app-level UC_CATALOG,
      // which TAP uses). Falls back to the shared catalog, then a safe default.
      UC_CATALOG: process.env.MOMA_UC_CATALOG || process.env.UC_CATALOG || "databricks_atlas",
      UC_SCHEMA: process.env.MOMA_UC_SCHEMA || "moma",
      DATABRICKS_WAREHOUSE_ID: process.env.DATABRICKS_WAREHOUSE_ID || "",
      APP_MODE: process.env.MOMA_APP_MODE || "internal",
    },
    stdio: ["ignore", "inherit", "inherit"],
  });
  child.on("exit", (code, signal) => {
    console.error(`[moma] exited (code=${code}, signal=${signal})`);
    if (!shuttingDown) shutdown(1);
  });
  child.on("error", (error) => {
    console.error(`[moma] failed to launch with ${uvicorn}:`, error);
    if (!shuttingDown) shutdown(1);
  });
  children.push({ name: "moma", child });
  console.log(`[supervisor] launched moma with ${uvicorn} on :${port} (pid ${child.pid})`);
}

function shutdown(exitCode) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[supervisor] shutting down (exit=${exitCode})`);
  for (const { name, child } of children) {
    if (!child.killed) {
      console.log(`[supervisor] killing ${name} (pid ${child.pid})`);
      try {
        child.kill("SIGTERM");
      } catch {
        /* ignore */
      }
    }
  }
  // Databricks allows 15 seconds between SIGTERM and SIGKILL. Give every
  // child a short graceful window, then make sure the supervisor exits.
  setTimeout(() => process.exit(exitCode), 10_000);
}
process.on("SIGTERM", () => shutdown(0));
process.on("SIGINT", () => shutdown(0));

async function waitForHttp(name, port, requestPath = "/", timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const ok = await new Promise((resolve) => {
      const req = http.get(
        { host: "127.0.0.1", port, path: requestPath, timeout: 2000 },
        (res) => {
          res.resume();
          const status = res.statusCode ?? 500;
          resolve(status >= 200 && status < 400);
        },
      );
      req.on("error", () => resolve(false));
      req.on("timeout", () => {
        req.destroy();
        resolve(false);
      });
    });
    if (ok) {
      console.log(`[supervisor] ${name} ready at ${requestPath}`);
      return;
    }
    await sleep(1000);
  }
  throw new Error(`${name} did not become ready on :${port}${requestPath}`);
}

(async () => {
  // Extract the four Next.js modules plus the public shell before launching.
  mkdirSync(EXTRACT_ROOT, { recursive: true });
  for (const name of ["forge", "waf", "tap", "mas", "web"]) {
    extractArchive(name);
  }

  // Forge needs LAKEBASE_POOLER_HOST + LAKEBASE_ENDPOINT_NAME at startup.
  // Both are set via the rendered app.yaml endpoint variables. The supervisor used to call
  // forge-provision-lakebase.mjs to auto-discover them, but that script
  // also tries to mint OAuth Postgres credentials and fails because the
  // app SP isn't bound to a Postgres role. Native-password auth doesn't
  // need that flow.
  console.log("[supervisor] Lakebase endpoint env (native_password)", {
    poolerHost: process.env.LAKEBASE_POOLER_HOST,
    endpointName: process.env.LAKEBASE_ENDPOINT_NAME,
    nativeUser: process.env.LAKEBASE_NATIVE_USER,
    nativePasswordSet: !!process.env.LAKEBASE_NATIVE_PASSWORD,
  });

  startStandalone("forge", FORGE_PORT);
  startStandalone("waf", WAF_PORT);
  startStandalone("tap", TAP_PORT);
  startStandalone("mas", MAS_PORT);
  startPeople(PEOPLE_PORT);
  startMoma(MOMA_PORT);

  // Begin the slower People readiness check immediately, but do not keep the
  // Atlas shell offline while Lakebase wakes and the idempotent seed runs.
  const peopleReady = waitForHttp(
    "people",
    PEOPLE_PORT,
    "/people/api/health",
    300_000,
  );

  await Promise.all([
    waitForHttp("forge", FORGE_PORT, "/forge"),
    waitForHttp("waf", WAF_PORT, "/waf"),
    waitForHttp("tap", TAP_PORT, "/tap"),
    waitForHttp("mas", MAS_PORT, "/maturity"),
    waitForHttp("moma", MOMA_PORT, "/moma"),
  ]);

  startStandalone("web", PUBLIC_PORT, { public: true });
  // First boot can take up to five minutes; a real People failure still
  // fails the supervisor after the shell has become available.
  await peopleReady;
})().catch((error) => {
  console.error("[supervisor] startup failed", error);
  shutdown(1);
});
