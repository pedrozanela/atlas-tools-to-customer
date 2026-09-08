# MOMA — Maturity & Operating Model Assessment

Atlas **Discovery** module that assesses data maturity **and** the target operating
model (Data Mesh as one lens) and produces prioritized, Databricks-oriented
recommendations. It **coexists** with MAS (`/maturity`) — it does not replace it yet.

## How it plugs into Atlas
- **Zone / basePath:** `/moma` — shell rewrites in `apps/web/next.config.ts` (`MOMA_ORIGIN`, default `:3006`).
- **Runtime:** FastAPI + static SPA (Python), launched by the supervisor
  `scripts/start-databricks-app.mjs` (`startMoma`, port `3006`) — same pattern as `apps/people`.
- **Card:** `apps/web/lib/sections.ts` (`discovery` → `moma`); labels in `messages/{en,es,pt-BR}/platform.json`.
- **Base path:** the app is base-path aware via `APP_BASE_PATH=/moma` (injects `<base>` +
  `window.__BASE__`; SPA assets are relative). With the env unset it runs standalone at `/`.

## Data
- **Unity Catalog only:** `databricks_atlas.moma` (Delta), via the shared Atlas SQL warehouse.
- Does **not** use Lakebase and does **not** touch `tap` or any other module's schema.
- `store.init_db()` bootstraps tables and is tolerant (logs and continues if grants aren't ready).

## Backend layout (`backend/`)
`app.py` (FastAPI, `uvicorn app:app`) · `server/` (domain, routes, store) ·
`frontend/dist/` (SPA) · `simulations/` (seeds) · `requirements.txt`.

## Deploy (isolated dev app)
Target `cosin-dev` → app `atlas-cosin` (`databricks.yml`). Build off-platform
(`npm run prepare:deploy`) then deploy. After deploy: create `databricks_atlas.moma`
and grant the app service principal `USE CATALOG/SCHEMA, CREATE TABLE, SELECT, MODIFY`,
then run the seeds. Promote to the official `atlas` app via PR + prebuilt artifact.
