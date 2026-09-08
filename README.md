<div align="center">

# Atlas

**Customer mapping suite for Databricks Field Engineering**

Discovery → Governance → Value Acceleration → Profilers, in one app.

[Quickstart](#quickstart) · [Architecture](#architecture) · [Deploy](#deploy) · [Modules](#modules) · [Contributing](#contributing)

</div>

---

## What is Atlas?

Atlas is a single Databricks App that walks a customer through four
focused areas of pre-sales discovery, then hands the artefacts back to the
Databricks architect of record.

| Area                        | What the customer does                                             | What they take away                     |
| --------------------------- | ------------------------------------------------------------------ | --------------------------------------- |
| **Discovery**               | Maps their current stack and rates data/AI maturity                | TAP canvas · MAS scorecard              |
| **Governance & Readiness**  | Defines the operating model and validates platform guardrails      | Operating model + RACI · WAF report     |
| **AI & Value Acceleration** | Turns governed context and metadata into prioritized opportunities | Forge use-cases · Genie recommendations |
| **Profilers & Tools**       | Assesses and accelerates technical migration paths                 | Lakebridge · migration factory tooling  |

Everything runs inside the customer's own workspace — Atlas is a
self-contained app, not a SaaS.

## Quickstart

```bash
git clone https://github.com/Databricks-BR/databricks-atlas-tools.git atlas
cd atlas
npm install

# Configure each module (env templates under each app/)
cp apps/forge/.env.local.example apps/forge/.env.local
cp apps/waf/.env.local.example   apps/waf/.env.local
cp apps/tap/.env.example         apps/tap/.env
cp apps/mas/.env.local.example   apps/mas/.env.local
cp apps/web/.env.local.example   apps/web/.env.local
cp apps/people/backend/.env.example apps/people/backend/.env

# People/Certifica also needs its local Python API on :8005
python3 -m venv apps/people/backend/.venv
apps/people/backend/.venv/bin/pip install -r apps/people/backend/requirements.txt

# Sync Lakebase schemas (forge ~60 tables, waf 5, mas auto-bootstraps)
npm run db:sync

# In another terminal, start the People API
(cd apps/people/backend && .venv/bin/python -m uvicorn app.main:app --reload --port 8005)

# Run the shell + every frontend module in parallel
npm run dev
```

Open <http://localhost:3000>.

> Tip: `npm run dev` starts the Atlas shell on `:3000`, the Next.js modules
> on `:3001-3004`, and the People Vite frontend on `:3006`. The shell proxies
> `/forge`, `/waf`, `/tap`, `/maturity`, and `/people`; Vite proxies
> `/people/api` to the FastAPI process on `:8005`.

### Guided tour

The **Guia Atlas** button is available in the shell and in every internal
module. It offers one end-to-end overview plus detailed journeys for TAP,
Maturity Assessment, Operating Model, WAF, Forge, and People/Certifica. The
current step is preserved while the tour crosses module zones; Certifica then
continues with its native product guide. Use `Shift+G` to open the journey
selector and the arrow keys to move between steps.

## Architecture

Atlas is a **multi-runtime, multi-zone** setup: a thin Next.js shell at `/`
proxies the standalone Next.js modules and the People FastAPI/Vite module via
[basePath rewrites](https://nextjs.org/docs/app/api-reference/config/next-config-js/rewrites).
Modules share a single Lakebase Autoscaling project (schema per module); TAP
and MOMA write to Unity Catalog (TAP to a UC table, MOMA to the `moma` schema).

```
atlas/
├── apps/
│   ├── web/       Shell — landing, drill-down, and Operating Model (/operating-model)
│   ├── forge/     AI use-case discovery   (basePath=/forge,    schema=forge)
│   ├── waf/       Well-Architected assessment (basePath=/waf,  schema=waf)
│   ├── tap/       Architecture-mapping form   (basePath=/tap,  UC table)
│   ├── mas/       Maturity Assessment        (basePath=/maturity, schema=mas)
│   ├── people/    Certifica learning platform (basePath=/people, schema=certifica)
│   └── moma/      Maturity & Operating Model Assessment (basePath=/moma, UC schema=moma)
├── packages/
│   ├── i18n/      Shared next-intl config + per-module message loader
│   └── tour/      Cross-zone guided journeys and spotlight UI
├── resources/     Databricks Asset Bundle (DAB) resources
├── scripts/       Build · deploy · runtime supervisor
└── docs/          Architecture notes, per-module docs, ADRs
```

```
                          ┌─────────────────────────┐
                  ┌──────▶│  /forge  (port 3001)    │──┐
                  │       └─────────────────────────┘  │
                  │       ┌─────────────────────────┐  │
                  │ ─────▶│  /waf    (port 3002)    │──┤      ┌────────────┐
                  │       └─────────────────────────┘  ├─────▶│  Lakebase  │
   shell  ───────┤        ┌─────────────────────────┐  │      │ (schemas)  │
   (/)            │ ─────▶│  /maturity (3004)       │──┤      └────────────┘
                  │       └─────────────────────────┘  │
                  │       ┌─────────────────────────┐  │
                  │ ─────▶│  /people (port 3005)    │──┘
                  │       └─────────────────────────┘
                  │       ┌─────────────────────────┐         ┌────────────┐
                  │ ─────▶│  /tap    (port 3003)    │────────▶│            │
                  │       └─────────────────────────┘         │ Unity Cat  │
                  │       ┌─────────────────────────┐         │            │
                  └──────▶│  /moma   (port 3006)    │────────▶└────────────┘
                          └─────────────────────────┘
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full picture.

## Modules

| Module                                | Path         | Status              | Customer artefact   |
| ------------------------------------- | ------------ | ------------------- | ------------------- |
| Shell                                 | `apps/web`   | Stable              | —                   |
| **Platform Operating Model**          | `apps/web`   | Stable              | Reference + RACI    |
| **TAP** — AS-IS architecture canvas   | `apps/tap`   | Stable              | PDF (post-submit)   |
| **MAS** — Maturity Assessment         | `apps/mas`   | Stable              | PDF (results page)  |
| **WAF** — Well-Architected Assessment | `apps/waf`   | Stable              | CSV + PDF           |
| **Forge** — AI use-case discovery     | `apps/forge` | Stable              | Per-feature exports |
| Genie Workbench                       | —            | Planned (card-only) | —                   |
| Lakebridge                            | external     | Link only           | —                   |
| Microsoft Migration Factory           | —            | Planned (card-only) | —                   |
| **Certifica** — People & Training      | `apps/people` | Integrated          | Progress + reports  |
| **MOMA** — Maturity & Operating Model Assessment | `apps/moma` | Integrated | Prioritized recommendations (in-app) |

## Deploy

Atlas ships as **one Databricks App** that boots a Node.js supervisor which
extracts pre-built standalone Next.js bundles to `/tmp`, starts the People
FastAPI service, and proxies every module through the shell. No full monorepo
`npm install` runs inside the container; the Next.js zones ship pre-built and
Databricks installs only the People Python requirements.

### Notebook deploy (recommended)

1. Create or open this repository as a Databricks Git folder in the
   customer workspace.
2. Open [`notebooks/deploy_atlas.py`](notebooks/deploy_atlas.py).
3. Fill the widgets at the top:
   `app_name`, `company_name`, `company_industry`,
   `warehouse_id`, `lakebase_project_id`, `lakebase_min_cu`,
   `lakebase_max_cu`, `lakebase_scale_to_zero_seconds`, `uc_catalog`,
   `uc_schema`, `uc_table`, the `certifica_*` settings,
   `prebuilt_artifact_url`, `run_app`, and `smoke_test`.
4. Run all cells.

The notebook is designed to run on **Databricks serverless notebook
compute**. It uses the current notebook user's workspace token and the
Workspace, Apps, Lakebase, Secrets, and SQL APIs directly; it does not install
or invoke the Databricks CLI or Bundles. It copies the Git folder to
`/local_disk0/atlas-deploy-*`, creates or verifies the TAP Unity Catalog
destination, creates or verifies the Lakebase project, configures the
`atlas-admin` native Lakebase role, reuses or creates the password in
`atlas-app/lakebase-atlas-admin-password`, publishes an immutable App source
release under the user's Workspace folder, grants the App service principal
`CAN_READ` on that exact release directory, reconciles the Databricks App,
provisions the Certifica JWT/seed secrets and model-serving resource, grants
TAP Unity Catalog privileges to the app service principal, deploys and starts
the app, and smoke-tests:

```text
/
/forge
/waf
/tap
/maturity
/people
/people/api/health
/moma
```

The deploying user must be allowed to manage Databricks Apps, SQL
warehouses, secrets, Lakebase, and the target Unity Catalog objects.

The deploy writes and prints a destroy manifest at:

```text
/Users/<deploying-user>/.atlas/configs/<app-name>.destroy.json
```

The manifest contains resource identifiers only—never the Lakebase password.
It is written before resource creation begins and reconciled with the final App
release and deployment IDs, so a partial deploy can still be cleaned up.

The Lakebase widgets default to one shared Autoscaling project running
between `0.5` and `1` CU, with scale-to-zero after 300 seconds of
inactivity. The notebook applies these settings both when it creates the
project and when it reuses an existing project.

Atlas deploys from a prebuilt artifact because notebook serverless is a runtime
prerequisite, not a build environment. Build the full artifact in CI or on an
engineering machine, then point `prebuilt_artifact_url` at that artifact. This
widget accepts either an accessible HTTPS URL or a local workspace path such as
a Unity Catalog volume path
(`/Volumes/<catalog>/<schema>/<volume>/atlas-prebuilt.zip`). The notebook does
not build Atlas locally.

The prebuilt artifact must contain the deploy root (`databricks.yml`,
`app.yaml`, `resources/`, `scripts/start-databricks-app.mjs`) and the generated
chunks under `apps/*/standalone.tar.gz.part-*`. Only the rendered `app.yaml`,
minimal `package.json`, Python requirements, supervisor, standalone chunks,
`apps/people/backend/{app,seed,static}`, and `apps/moma/backend/{app.py,server,
frontend/dist}` are published as App source; the other Lakebase schema SQL
remains local to the notebook bootstrap.

Preferred build path: run the **Build Atlas prebuilt artifact** GitHub
Action. Provide a `release_tag` such as `atlas-prebuilt-2026-06-25`,
then copy the release asset URL for `atlas-prebuilt.zip` into the
notebook's `prebuilt_artifact_url` widget.

Manual build path outside the customer workspace:

```bash
npm install
npm run prepare:deploy
zip -r atlas-prebuilt.zip . \
  -x ".git/*" "node_modules/*" "apps/*/node_modules/*" \
     ".turbo/*" "apps/*/.turbo/*" "apps/*/.next/*"
```

Do not use `git archive` for the artifact, because the standalone chunks
are gitignored. If you upload the full prebuilt repo folder instead of using
`prebuilt_artifact_url`, the notebook will deploy from that folder. The URL
path is preferred when the customer has access only to the notebook.

### WAF Genie Agent recommendations

Running the WAF assessment automatically creates or reconciles the shared
`Forge WAF Genie` Agent. Every control with status **Not Met** is then submitted
as its own independent Agent mode API request and its own conversation. Requests
run asynchronously with one process-wide concurrency limit (default `2`,
configurable with `WAF_GENIE_AGENT_CONCURRENCY`, maximum `4`) and are persisted
in Lakebase, so the assessment response is not held open while all analyses
finish. A process restart recovers an accepted request through its existing
conversation with `GET`; it never submits that control a second time.

The Recommendations button polls the persisted batch and opens a dialog with
the report, SQL evidence, documentation references, data citations, and
per-control errors. Agent mode can execute multiple SQL statements inside one
control request; Atlas requires at least one SQL execution before marking that
recommendation complete.

The workspace must have
[**Agent Mode APIs for Genie Agents**](https://docs.databricks.com/aws/en/genie-agents/api)
enabled under Previews. This API is currently Beta. WAF uses Databricks Apps
user authorization (OBO) with the `sql`, `genie`, and `files` scopes. The admin
who deployed Atlas must open the App once and approve those scopes; that user
then owns the automatically created Agent, runs the assessment SQL, and executes
all Agent mode requests with their existing warehouse and `system.*` privileges.
The forwarded token is held only in memory and is never written to Lakebase or
logs.

OBO is intentionally limited to the `/waf` zone. The Atlas shell removes the
forwarded access-token header before proxying any other zone, so those modules
keep their existing App service-principal authorization. The
serverless deploy notebook also replaces the App's direct ACL with a single
`CAN MANAGE` entry for the admin who ran the deploy. Atlas therefore assumes
that deploy and use are performed by that Databricks admin; it does not expose
the App to general workspace users. If Agent mode is unavailable, the
deterministic WAF assessment still completes and the UI persists the automation
failure separately.

The control catalog supplies the curated Databricks WAF guidance directly in
each prompt. Documentation URLs are displayed as references; Agent mode does
not browse arbitrary external URLs. Attach a supported Unity Catalog Volume to
the Agent separately if full document retrieval is required.

### CLI deploy (fallback)

For local engineering deploys, authenticate with the Databricks CLI,
add or update a customer target in `databricks.yml`, then run:

```bash
npm install
npm run prepare:deploy
node scripts/deploy.mjs customer-prod run --profile customer-prod
```

The script renders `app.yaml`, deploys the bundle, discovers the app
service principal, and applies the TAP Unity Catalog grants. The notebook
is preferred for customer workspaces because it performs the prerequisite
setup in one run from inside Databricks.

### Notebook destroy

Open [`notebooks/destroy_atlas.py`](notebooks/destroy_atlas.py) on serverless
notebook compute. It loads the JSON manifest emitted by the deploy; leave
`destroy_config_path` blank to use the current user's default Atlas path.

The destroy defaults to `dry_run=true`. Review the printed plan first. For a
real teardown, set `dry_run=false` and type `DESTROY <app-name>` exactly. It
first stops the App, then removes at most one WAF Genie Agent matching the exact
Atlas ownership marker, followed by the App, Atlas UC table, Atlas secret,
immutable Workspace releases, and Lakebase project. If the Genie API is
disabled, destroy fails and preserves the manifest for a safe retry. The Atlas
schema and catalog are dropped only when empty using `RESTRICT`, so unrelated
objects are preserved. Lakebase uses recoverable soft delete by default; set
`purge_lakebase=true` only for immediate permanent deletion. A soft-deleted
Lakebase project ID cannot be reused until its purge time; purge it permanently
or choose a different `lakebase_project_id` before an immediate redeploy.

## Customer deliverables

Each customer-facing module persists data **and** exposes a one-click
export so the customer can forward results to their architect:

| Module | Storage                                                | Export                                    |
| ------ | ------------------------------------------------------ | ----------------------------------------- |
| TAP    | `databricks_atlas.tap.databricks_tap_tool_submissions` | "Baixar PDF" on the post-submit summary   |
| WAF    | Lakebase `waf` schema                                  | "Export CSV" / "Export PDF" in the header |
| MAS    | Lakebase `mas.assessments`                             | "Baixar PDF" on the results page          |
| People | Lakebase `certifica` schema                            | History plus admin CSV/PDF reports          |

PDFs are produced via the browser print dialog against a print-only
stylesheet — no extra dependencies, works offline.

## Scripts

| Command                                                      | What it does                                                   |
| ------------------------------------------------------------ | -------------------------------------------------------------- |
| `npm run dev`                                                | Start the shell + every module in parallel                     |
| `npm run build`                                              | Build all modules (Next.js standalone)                         |
| `npm run db:sync`                                            | `prisma generate && db push` across modules                    |
| `npm run deploy:check`                                       | `databricks bundle validate`                                   |
| `npm run prepare:deploy`                                     | Build all modules + pack standalone bundles                    |
| `notebooks/deploy_atlas.py`                                  | One-run Databricks notebook deploy for customer workspaces     |
| `node scripts/deploy.mjs <target> [run] --profile <profile>` | Render `app.yaml` for the target, deploy, and optionally start |
| `npm run deploy:logs`                                        | Tail live app logs                                             |
| `npm test`                                                   | Run vitest across all workspaces                               |

## Project layout

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — multi-zone routing
  and Lakebase schema-per-module details
- [`docs/modules/`](docs/modules) — per-module deep-dives
- [`docs/decisions/`](docs/decisions) — architecture decision records

## Contributing

```bash
git checkout -b feat/my-change
npm run build && npm test
git commit -m "feat(scope): summary"
git push -u origin feat/my-change
gh pr create
```

Atlas builds on every PR. Strict TypeScript is enforced — there are
no `ignoreBuildErrors` escape hatches.

## License

See [LICENSE](LICENSE) and [NOTICE](NOTICE).
