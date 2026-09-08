# Upstream provenance

This directory vendors the **Databricks Certifica** application for Atlas' People module.

- Repository: <https://github.com/RodrigoLima82/databricks-certifica-app>
- Vendored commit: `a9bc5e73b9e261b442cafc4e18f054c6907983fd`
- Public Atlas mount: `/people`
- Vendored on: 2026-08-25

The upstream frontend, backend, seed, tests, documentation, and static assets are preserved below. Atlas-specific changes are intentionally limited to this directory:

1. Vite, React Router, API calls, PWA assets, and FastAPI are mounted below `/people`.
2. A visible link returns to the Atlas shell and `atlas_guide=1` hands off to the native Certifica tour.
3. Same-origin product JWTs use `X-App-Auth`; `Authorization` remains reserved for the Databricks Apps gateway.
4. Optional Databricks-header SSO can bootstrap an internal JWT without accepting identity from query/body data.
5. Lakebase uses a configured native `PGPASSWORD` when present; otherwise it mints an Autoscaling OAuth credential through `w.postgres`.
6. The package at this directory is the npm workspace entry used by the Atlas root build/test commands.

When updating the vendor snapshot, record the new upstream commit here and re-apply/review these integration changes explicitly.

## Atlas runtime contract

- Working directory: `apps/people/backend`
- Command: `python -m uvicorn app.main:app --host 127.0.0.1 --port 3005`
- Readiness: `GET /people/api/health`
- Frontend/API: `/people/*` and `/people/api/*`
- Required production security: `APP_ENV=production` and a non-default `CERTIFICA_JWT_SECRET` (or `JWT_SECRET`)
- Lakebase native role: `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `PGPASSWORD`, `PGSSLMODE`, `PGSCHEMA`
- Lakebase OAuth (when `PGPASSWORD` is absent): the same `PG*` values plus `LAKEBASE_ENDPOINT_NAME` and Databricks SDK credentials
- Optional SSO: `CERTIFICA_DATABRICKS_SSO_ENABLED=true` (or `DATABRICKS_SSO_ENABLED`) plus `DEFAULT_TENANT_SLUG`
- Model serving: `SERVING_ENDPOINT_NAME` or the upstream-compatible `LLM_ENDPOINT`

Production startup deliberately fails if the database is unavailable, the idempotent seed fails, the JWT secret is unsafe, or SSO/seed prerequisites are missing.
