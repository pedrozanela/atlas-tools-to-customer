#!/usr/bin/env node
/**
 * Deploy wrapper for the Atlas Databricks App.
 *
 * Atlas builds its Next.js zones locally and ships PRE-BUILT standalone
 * bundles. The Databricks App container still detects Node.js by the
 * presence of package.json at root and runs `npm install`. To make that
 * npm install a no-op (instead of recursively installing every workspace
 * which OOMs the container), while still allowing Python packages from
 * requirements.txt for People/Certifica, we:
 *
 *   1. Snapshot the real root package.json to package.json.bak
 *   2. Write a minimal deps-free package.json in its place
 *   3. Resolve ${var.foo} placeholders in app.yaml against bundle vars
 *      so per-customer overrides in databricks.yml take effect without
 *      hand-editing app.yaml
 *   4. Force a full bundle sync so gitignored pre-built chunks are refreshed,
 *      then run `databricks bundle deploy` with the rendered versions
 *   5. Discover the app SP application_id (newly minted on first deploy)
 *      and GRANT USE CATALOG / USE SCHEMA / CREATE TABLE / MODIFY on the
 *      TAP catalog so the TAP backend can write. uc_securable in DABs
 *      can't express these privileges, so we do it via the Statement
 *      Execution API as the deployer.
 *   6. Restore both files from their backups
 *
 * We use try/finally so an interrupted deploy still restores originals.
 *
 * Usage:
 *   node scripts/deploy.mjs <target> --profile <profile>
 *   node scripts/deploy.mjs <target> run --profile <profile>  # also start the app compute
 */

import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { requireSecretKeys } from "./deploy-secret-preflight.mjs";

const [, , target, ...rest] = process.argv;
const profileFlagIndex = rest.indexOf("--profile");
const profile = profileFlagIndex >= 0 ? rest[profileFlagIndex + 1] : undefined;
if (!target || !profile) {
  console.error("usage: node scripts/deploy.mjs <target> [run] --profile <profile>");
  process.exit(2);
}
for (const [label, value] of [
  ["target", target],
  ["profile", profile],
]) {
  if (!/^[a-zA-Z0-9._-]+$/.test(value)) {
    console.error(`[deploy] invalid ${label}: ${value}`);
    process.exit(2);
  }
}
const shouldRun = rest.includes("run");
const profileArg = `--profile ${profile}`;

const PKG = "package.json";
const APP = "app.yaml";
// Keep safety copies outside the bundle source tree. A backup beside app.yaml
// is otherwise uploaded and becomes part of every immutable App snapshot.
const BACKUP_DIR = join(".git", "atlas-deploy");
const PKG_BAK = join(BACKUP_DIR, "package.json.bak");
const APP_BAK = join(BACKUP_DIR, "app.yaml.bak");

mkdirSync(BACKUP_DIR, { recursive: true });

for (const bak of [PKG_BAK, APP_BAK]) {
  if (existsSync(bak)) {
    console.error(
      `[deploy] ${bak} already exists — refusing to overwrite. ` +
        "A previous deploy may have crashed mid-flight; inspect it and " +
        "either restore manually or delete it before retrying.",
    );
    process.exit(1);
  }
}

const pkgOriginal = readFileSync(PKG, "utf-8");
const appTemplate = readFileSync(APP, "utf-8");
const minimalPkg = {
  name: "atlas",
  private: true,
  version: "0.1.0",
  description: "Atlas — pre-built Next.js bundles plus Certifica Python runtime.",
  engines: { node: ">=20" },
  scripts: {
    start: "node scripts/start-databricks-app.mjs",
  },
};

let restored = false;
function restore() {
  if (restored) return;
  restored = true;
  if (existsSync(PKG_BAK)) {
    writeFileSync(PKG, pkgOriginal);
    execSync(`rm -f ${PKG_BAK}`);
    console.log("[deploy] restored real package.json");
  }
  if (existsSync(APP_BAK)) {
    writeFileSync(APP, appTemplate);
    execSync(`rm -f ${APP_BAK}`);
    console.log("[deploy] restored app.yaml template");
  }
  rmSync(BACKUP_DIR, { recursive: true, force: true });
}

for (const sig of ["SIGINT", "SIGTERM", "SIGHUP"]) {
  process.on(sig, () => {
    console.log(`\n[deploy] received ${sig} — restoring files`);
    restore();
    process.exit(130);
  });
}
process.on("uncaughtException", (err) => {
  console.error("[deploy] uncaught:", err);
  restore();
  process.exit(1);
});

function run(cmd) {
  console.log(`[deploy] $ ${cmd}`);
  execSync(cmd, { stdio: "inherit" });
}

function resolveBundleVars(targetName) {
  const raw = execSync(`databricks bundle validate --strict -t ${targetName} ${profileArg} --output json`, {
    stdio: ["ignore", "pipe", "inherit"],
  }).toString();
  const parsed = JSON.parse(raw);
  const vars = parsed.variables ?? {};
  const resolved = {};
  for (const [name, meta] of Object.entries(vars)) {
    resolved[name] = meta.value ?? meta.default ?? "";
  }
  return resolved;
}

function getAppSpId(appName, targetName) {
  // `databricks apps get <name>` returns the app metadata as JSON. The
  // SP minted for the app surfaces as `service_principal_client_id`
  // (application UUID) in the response. Returns null if the app hasn't
  // been created yet (first-time deploys hit this once).
  try {
    const raw = execSync(`databricks apps get ${appName} ${profileArg} --output json`, {
      stdio: ["ignore", "pipe", "pipe"],
    }).toString();
    const meta = JSON.parse(raw);
    return meta.service_principal_client_id ?? null;
  } catch {
    return null;
  }
}

function grantUcPrivileges(vars, spId, targetName) {
  const { warehouse_id, uc_catalog, uc_schema } = vars;
  if (!warehouse_id || !uc_catalog || !uc_schema) {
    console.log("[deploy] skipping UC grant — warehouse_id / uc_catalog / uc_schema not all set");
    return;
  }
  // Submit each GRANT as a synchronous statement. Quote the SP UUID
  // with backticks: principal names with hyphens (UUIDs) need that
  // quoting in Spark SQL.
  const statements = [
    `GRANT USE CATALOG ON CATALOG \`${uc_catalog}\` TO \`${spId}\``,
    `GRANT USE SCHEMA ON SCHEMA \`${uc_catalog}\`.\`${uc_schema}\` TO \`${spId}\``,
    `GRANT CREATE TABLE, MODIFY ON SCHEMA \`${uc_catalog}\`.\`${uc_schema}\` TO \`${spId}\``,
  ];
  for (const sql of statements) {
    const payload = JSON.stringify({
      warehouse_id,
      statement: sql,
      wait_timeout: "30s",
    });
    console.log(`[deploy] $ GRANT (UC): ${sql}`);
    try {
      execSync(
        `databricks api post /api/2.0/sql/statements ${profileArg} --json '${payload.replace(/'/g, "'\\''")}'`,
        { stdio: ["ignore", "pipe", "inherit"] },
      );
    } catch (err) {
      // Surface but don't fail the deploy — the customer admin can
      // re-run the same SQL by hand if the deployer lacks
      // MANAGE_PRIVILEGES on the catalog.
      console.warn(
        `[deploy] WARN: GRANT failed (${err.message?.split("\n")[0] ?? "unknown"}). ` +
          `If TAP submits 403 with INSUFFICIENT_PERMISSIONS, run the GRANT manually as a UC admin.`,
      );
    }
  }
}

function renderTemplate(template, vars) {
  const missing = new Set();
  const rendered = template.replace(/\$\{var\.([a-zA-Z0-9_]+)\}/g, (_, name) => {
    if (!(name in vars)) {
      missing.add(name);
      return "";
    }
    return String(vars[name]);
  });
  if (missing.size > 0) {
    throw new Error(
      `[deploy] app.yaml references undefined bundle variables: ${[...missing].join(", ")}. ` +
        "Declare them under `variables:` in databricks.yml.",
    );
  }
  return rendered;
}

try {
  renameSync(PKG, PKG_BAK);
  writeFileSync(PKG, JSON.stringify(minimalPkg, null, 2) + "\n");
  console.log("[deploy] swapped package.json to deps-free minimal version");

  const vars = resolveBundleVars(target);
  const secretPreflight = requireSecretKeys({
    profile,
    requirements: [
      {
        scope: "atlas-app",
        key: "lakebase-atlas-admin-password",
      },
      {
        scope: vars.certifica_secret_scope,
        key: vars.certifica_jwt_secret_key,
      },
      {
        scope: vars.certifica_secret_scope,
        key: vars.certifica_seed_admin_password_key,
      },
    ],
  });
  console.log(
    `[deploy] verified required Atlas secret metadata ` +
      `(${secretPreflight.keysChecked} keys across ${secretPreflight.scopesChecked} scope)`,
  );
  const renderedApp = renderTemplate(appTemplate, vars);
  renameSync(APP, APP_BAK);
  writeFileSync(APP, renderedApp);
  console.log(
    `[deploy] rendered app.yaml with bundle vars for target=${target} ` +
      `(company_name="${vars.company_name}", warehouse_id="${vars.warehouse_id}")`,
  );

  // Generated standalone chunks are intentionally gitignored. The CLI can
  // otherwise reuse stale remote chunks during an incremental deploy even
  // though sync.include lists them, so refresh the source tree explicitly.
  run(`databricks bundle sync --full -t ${target} ${profileArg}`);
  run(`databricks bundle deploy -t ${target} ${profileArg}`);

  // Resolve the app name from bundle (mirrors `name: ${var.app_name}`
  // in resources/atlas.app.yml). The grants must run AFTER bundle
  // deploy because the app SP is minted on first create.
  const appName = vars.app_name;
  const spId = getAppSpId(appName, target);
  if (spId) {
    console.log(`[deploy] app SP application_id=${spId}`);
    grantUcPrivileges(vars, spId, target);
  } else {
    console.warn(
      `[deploy] could not resolve app SP for "${appName}" — skipping UC grants. ` +
        "Re-run `node scripts/deploy.mjs <target> --profile <profile>` after the app is created.",
    );
  }

  if (shouldRun) {
    run(`databricks bundle run atlas -t ${target} ${profileArg}`);
  }
} finally {
  restore();
}
