import "server-only";
import { Pool } from "pg";

/**
 * Lakebase connection for MAS assessments.
 *
 * Reuses the same atlas-admin native-password credentials that forge
 * uses — they're injected as env vars by the supervisor (see
 * scripts/start-databricks-app.mjs + app.yaml). All MAS data lives in
 * the `mas` Postgres schema on the `databricks-atlas` project.
 *
 * Connection lifecycle:
 *   - one Pool per process, lazy-initialised on first query
 *   - schema/table bootstrap is idempotent and runs on first request
 */

const SCHEMA_DDL = `
CREATE SCHEMA IF NOT EXISTS mas;

-- Legacy table for backward compatibility with old single-submission assessments
CREATE TABLE IF NOT EXISTS mas.assessments (
  id              UUID PRIMARY KEY,
  customer_name   TEXT NOT NULL,
  user_email      TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  answers         JSONB NOT NULL,
  notes           JSONB,
  scores          JSONB NOT NULL,
  overall_score   NUMERIC(4, 2) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_mas_assessments_customer
  ON mas.assessments (customer_name);

CREATE INDEX IF NOT EXISTS idx_mas_assessments_created_at
  ON mas.assessments (created_at DESC);

-- Section submissions with versioning (v2 schema)
-- Each section can have multiple versions (v1, v2, v3...)
-- Using DO block to handle existing table/type gracefully
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'mas' AND tablename = 'section_submissions_v2') THEN
    CREATE TABLE mas.section_submissions_v2 (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      section_key     TEXT NOT NULL,
      version         INTEGER NOT NULL DEFAULT 1,
      user_email      TEXT NOT NULL,
      user_name       TEXT,
      answers         JSONB NOT NULL,
      notes           TEXT,
      score           NUMERIC(4, 2) NOT NULL,
      tier            TEXT NOT NULL,
      tier_label      TEXT NOT NULL,
      submitted_at    TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  END IF;
END $$;

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_mas_sections_v2_key
  ON mas.section_submissions_v2 (section_key);

CREATE INDEX IF NOT EXISTS idx_mas_sections_v2_key_version
  ON mas.section_submissions_v2 (section_key, version DESC);

CREATE INDEX IF NOT EXISTS idx_mas_sections_v2_submitted
  ON mas.section_submissions_v2 (submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_mas_sections_v2_user
  ON mas.section_submissions_v2 (user_email);
`;

let _pool: Pool | null = null;
let _bootstrapped = false;

function buildPool(): Pool {
  const host = process.env.LAKEBASE_POOLER_HOST;
  const user = process.env.LAKEBASE_NATIVE_USER || "atlas-admin";
  const password = process.env.LAKEBASE_NATIVE_PASSWORD;
  const database =
    process.env.LAKEBASE_DATABASE || "databricks_postgres";

  if (!host || !password) {
    throw new Error(
      "MAS db not configured: LAKEBASE_POOLER_HOST and LAKEBASE_NATIVE_PASSWORD required",
    );
  }

  return new Pool({
    host,
    port: 5432,
    user,
    password,
    database,
    ssl: { rejectUnauthorized: false },
    max: 4,
  });
}

export async function withDb<T>(
  fn: (client: import("pg").PoolClient) => Promise<T>,
): Promise<T> {
  if (!_pool) _pool = buildPool();
  if (!_bootstrapped) {
    const client = await _pool.connect();
    try {
      await client.query(SCHEMA_DDL);
      _bootstrapped = true;
    } finally {
      client.release();
    }
  }
  const client = await _pool.connect();
  try {
    return await fn(client);
  } finally {
    client.release();
  }
}
