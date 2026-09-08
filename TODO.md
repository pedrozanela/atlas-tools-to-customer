# Atlas — Pending work

Tracker for items deferred during the consolidation / DAB deploy work
on branch `feat/consolidate-monorepo`. Each entry has a short rationale
and a pointer to where the fix lives.

## High priority (block features but not deploy)

### Forge — provision Lakebase + wire DB creds
- **Symptom:** `/forge/api/health` reports both database AND warehouse as
  "error", and logs show
  `List endpoints failed (404): Project with name 'projects/databricks-forge-<sp-id>' not found`
  every 5s (Pipeline scheduler tick).
- **Root cause:** Forge expects a Lakebase instance scoped to its SP plus
  an MLflow-style "project" container that holds its serving endpoints
  config. Neither is provisioned on adb-brazil.
- **Fix:** Provision a Lakebase instance for the Atlas app SP and wire
  `LAKEBASE_*` env vars in `app.yaml` (see `apps/forge/lib/prisma.ts`).
  The warehouse error will likely clear once the auth runtime initialises
  through Lakebase.
- **Workaround in place:** none — health endpoint returns 503 but the
  page still renders (most DB-heavy actions will surface 500 in the UI).

### Cross-platform native binaries (sharp, lz4)
- **Symptom:** Standalone bundles built locally on macOS only contain
  darwin-arm64 binaries for `@img/sharp` and `lz4`. Container is Linux
  x64, so those bindings can't load.
- **Workaround in place:** `scripts/prepare-standalone.mjs` strips
  `@img/` entirely (Next.js falls back to default image loader without
  sharp — verified, no functional loss). `lz4` is still macOS-only;
  `@databricks/sql` skips compression silently when it fails to load.
- **Fix:** Build the standalone in Docker on linux/amd64, or use
  `npm install --os=linux --cpu=x64 --include=optional` before
  `npm run build`. Tracked separately from this TODO.

### WAF — strip inherited forge components
- **Symptom:** `apps/waf/components/business-value/`, `assistant/`,
  `pipeline/` and others import `@/lib/lakebase/portfolio` and similar
  modules that were never ported when WAF was extracted from forge. ~82
  components total, 17 with broken imports.
- **Workaround in place:** `typescript.ignoreBuildErrors: true` in
  `apps/waf/next.config.ts`. Runtime is fine because these components
  are unreachable from the WAF basePath, but the type-check is dishonest.
- **Fix:** Delete the orphan components + the routes that reference
  them. Re-enable strict build.

### Forge — fix `@prisma/adapter-pg@7.5.0` constructor typing
- **Symptom:** `new PrismaPg(pool)` errors with `Type 'ClientBase' is
  not assignable to type 'void'` in `apps/forge/lib/prisma.ts:584`.
- **Workaround in place:** `typescript.ignoreBuildErrors: true` in
  `apps/forge/next.config.ts`.
- **Fix:** Rebase forge from `althrussell/databricks-forge` (the
  upstream likely fixed it) or pin adapter-pg + add a type assertion.

### Forge — `/api/system-load` 404 on Atlas shell
- **Symptom:** `SystemLoadBanner` in `apps/forge/components/system-load-banner.tsx`
  calls `fetch("/api/system-load")` with an absolute path. Behind the
  Atlas shell the path doesn't get the `/forge` prefix and falls onto
  apps/web, which 404s.
- **Fix:** Prefix the path with `process.env.NEXT_PUBLIC_BASE_PATH` (or
  use `usePathname()` math) — or just remove the banner.

### TAP — flip `APP_DEV_MOCK_DATABASE=false`
- **Symptom:** TAP submit is logged, never written to UC, until this
  flag flips.
- **Pre-reqs:**
  - App service principal has `CAN USE` on warehouse `622e7544924eb8c9`.
  - SP has `USE CATALOG` on `databricks_atlas`, `USE SCHEMA` on
    `databricks_atlas.tap`, and `CREATE TABLE` / `MODIFY` to let
    `ensureToolsTableSchema()` boot the table.
- **Fix:** Update `app.yaml` (env) and redeploy. Verify with a sample
  submission + `SELECT * FROM databricks_atlas.tap.databricks_tap_tool_submissions`.

## Medium priority (UX / polish)

### TAP — wire `next-intl` (LanguageToggle is decorative)
- `apps/tap/components/ui/LanguageToggle.tsx` renders a disabled
  Globe icon. Adding next-intl means creating `apps/tap/messages/{en,pt-BR,es}.json`
  + `i18n/request.ts` mirroring apps/waf, and replacing hard-coded
  English strings in `app/page.tsx` and the section block.

### Apps/web — apply standardised header to landing
- Today the landing is chrome-less (logo lives in `page.tsx`). The
  module pages have the standardised header `[← Atlas] [icon] Title
  [Lang] [Theme]`. The shell could share the lang/theme controls so
  preferences carry between modules.

### Deploy size — `.next/` builds are big (~2 GB total)
- `apps/forge/.next/` ~783 MB; `apps/web/.next/` ~625 MB. `.databricksignore`
  already strips `.next/cache`, `.next/dev`, `.next/trace`,
  `.next/diagnostics`, `.next/types` — but production server bundles
  are still heavy.
- **Fix:** Switch the supervisor to launch `node .next/standalone/server.js`
  (Next standalone output is already on per next.config.ts) and ship
  only `.next/standalone/` + `.next/static/`. Shaves ~70% off the upload.

## Lower priority (roadmap)

### Phase 4 — `apps/maturity`
- Spec lives at <https://docs.google.com/document/d/1t13o4sMFH_hsHU2BrEmi-2X1jt3r-al2iTSFiT_D06M/edit>.
- Not started. Scaffold mirroring apps/waf when ready.

### Phase 5 — `apps/genie-workbench` (Inference)
- Vendor <https://github.com/databricks-solutions/databricks-genie-workbench>
  as a 5th module under the Inference section of the Atlas landing.
- Likely scaffold mirroring apps/waf: extract, add basePath `/genie`,
  add `ATLAS_GENIE_ORIGIN` to apps/web rewrites, supervisor on an available
  internal port, and prepare-standalone for the new app.
- Inspect upstream repo first — if it's not Next.js, we'll either port
  it or run it as-is alongside the supervisor.

### People & Training module
- Placeholder in the landing (`/people`) with no destination yet.

### Multi-customer deploy
- `app.yaml` hard-codes `APP_COMPANY_NAME=Databricks Brazil`. For
  Atlas-as-product, lift this into a per-deploy variable in
  `databricks.yml` and template `app.yaml`.

## Done (kept here for traceability)

- ✅ Vendor TAP from `cwrneiro/databricks_tap_tool`, then rewrite as Next.js
- ✅ Drop unused `packages/{db,shared,ui}` workspaces
- ✅ Memoise + batch `ensureCatalogSeeded` to unblock `/waf/api`
- ✅ Vitest suites for tap/waf/web (48 tests + 7 canvas-layout)
- ✅ Canvas-style TAP layout + standardised header + theme/language toggles
- ✅ Fix cross-zone navigation from the Atlas shell
- ✅ DAB for single-app deploy to adb-brazil
- ✅ Ship pre-built standalone bundles (workspaces install was OOMing the
  container; bypassed `npm install` entirely, ~35 MB upload vs 1.2 GB)
- ✅ Wire DATABRICKS_WAREHOUSE_ID + TAP `APP_DEV_MOCK_DATABASE=false` in
  `app.yaml`
- ✅ Strip `@img/sharp` darwin-arm64 from standalone (Linux fallback OK)
