#!/usr/bin/env node
/**
 * Finalises the Next.js standalone bundles for each app, then packs each
 * one into a single `.tar.gz` archive at the project root for upload.
 *
 * Why an archive? Databricks Workspace silently filters `node_modules`
 * directories on upload (hard-coded). Without `node_modules`, the
 * standalone server crashes with `Cannot find module 'next'`. Packing
 * into a tarball bypasses that filter (a `.tgz` file is just one file).
 * The supervisor extracts the archives at boot before launching.
 *
 * Per-app layout after `next build`:
 *   apps/<x>/.next/standalone/
 *     ├── apps/<x>/server.js   (entrypoint — run with CWD = this dir)
 *     ├── apps/<x>/.next/      (server build, MISSING static/)
 *     ├── apps/<x>/public/     (sometimes copied, sometimes not)
 *     └── node_modules/        (minimal runtime deps — gets filtered!)
 *
 * After this script:
 *   1. .next/static is copied into the standalone tree (otherwise chunks 404)
 *   2. Each standalone is tarred to `apps/<x>/standalone.tar.gz`
 */

import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";

const APPS = ["forge", "waf", "tap", "mas", "web"];

// Forge self-provisions its Lakebase project on first boot via this
// standalone script. Copy it to the project root so it's uploaded
// alongside the supervisor (the standalone tarball doesn't carry it,
// and the supervisor needs to run it BEFORE starting forge).
cpSync("apps/forge/scripts/provision-lakebase.mjs", "scripts/forge-provision-lakebase.mjs");
console.log("[prepare-standalone] copied forge provision script to scripts/");

for (const name of APPS) {
  const appDir = `apps/${name}`;
  const standaloneRoot = `${appDir}/.next/standalone`;
  const standaloneApp = `${standaloneRoot}/apps/${name}`;
  const archive = `${appDir}/standalone.tar.gz`;

  if (!existsSync(standaloneApp)) {
    console.error(
      `[prepare-standalone] ${name}: ${standaloneApp} missing — run "npm run build" first.`,
    );
    process.exit(1);
  }

  // Copy .next/static — required for chunks to load.
  const staticSrc = `${appDir}/.next/static`;
  const staticDst = `${standaloneApp}/.next/static`;
  if (existsSync(staticSrc)) {
    rmSync(staticDst, { recursive: true, force: true });
    mkdirSync(join(standaloneApp, ".next"), { recursive: true });
    cpSync(staticSrc, staticDst, { recursive: true });
    console.log(`[prepare-standalone] ${name}: copied .next/static`);
  } else {
    console.warn(`[prepare-standalone] ${name}: no .next/static (skipping)`);
  }

  // Always copy public/ (Next 15 auto-copies inconsistently — sometimes
  // only top-level files land, nested subdirs silently get dropped, as
  // seen with apps/tap/public/static/other_assets/creativity.png 404ing
  // in prod). cpSync with recursive merges over what's already there.
  const publicSrc = `${appDir}/public`;
  const publicDst = `${standaloneApp}/public`;
  if (existsSync(publicSrc)) {
    cpSync(publicSrc, publicDst, { recursive: true });
    console.log(`[prepare-standalone] ${name}: synced public/`);
  }

  // Strip @img (sharp + libvips) — when built on macOS, only the
  // darwin-arm64 binaries are bundled (~16 MB per app) and they don't
  // load on the Linux container. Next.js falls back to its default
  // image loader without sharp, so dropping these saves ~60 MB total
  // upload with no functional loss. Revisit when we move to a Linux
  // build host (Docker / GH Actions).
  const imgDir = `${standaloneRoot}/node_modules/@img`;
  if (existsSync(imgDir)) {
    rmSync(imgDir, { recursive: true, force: true });
    console.log(`[prepare-standalone] ${name}: stripped @img (macOS-only)`);
  }

  // Defensive: nuke any AppleDouble (`._*`) and .DS_Store files from the
  // standalone tree before packing. macOS BSD tar can leak them and they
  // turn into bogus directory entries on Linux (e.g. `._mysql.png` shows
  // up in the TAP icon route as ". Mysql"). We pass --no-mac-metadata
  // below but defence in depth.
  execFileSync(
    "sh",
    ["-c", `find ${standaloneRoot} \\( -name "._*" -o -name ".DS_Store" \\) -delete`],
    { stdio: "inherit" },
  );

  // Pack into tarball, then split into <10MB chunks. Databricks Workspace
  // enforces a 10485760-byte (10 MiB) per-file upload limit, so we name the
  // chunks standalone.tar.gz.part-aa, .ab, … and the supervisor concatenates
  // them at boot before extracting.
  rmSync(archive, { force: true });
  // Clean previous chunks for this app.
  execFileSync("sh", ["-c", `rm -f ${appDir}/standalone.tar.gz.part-*`], {
    stdio: "inherit",
  });
  // macOS bsdtar can include AppleDouble/xattr metadata unless explicitly
  // disabled. GNU tar on Linux does not support --no-mac-metadata.
  const tarArgs =
    process.platform === "darwin"
      ? ["--no-mac-metadata", "--no-xattrs", "--no-acls", "-czf", "../../standalone.tar.gz", "."]
      : ["-czf", "../../standalone.tar.gz", "."];
  execFileSync("tar", tarArgs, {
    cwd: standaloneRoot,
    stdio: "inherit",
    env: { ...process.env, COPYFILE_DISABLE: "1" },
  });
  execFileSync("split", ["-b", "9m", "standalone.tar.gz", "standalone.tar.gz.part-"], {
    cwd: appDir,
    stdio: "inherit",
  });
  rmSync(archive); // raw tarball not needed after splitting
  const parts = execFileSync("sh", ["-c", `ls ${appDir}/standalone.tar.gz.part-* | wc -l`])
    .toString()
    .trim();
  console.log(`[prepare-standalone] ${name}: packed → ${parts} chunks`);
}

console.log("[prepare-standalone] all archives ready.");
