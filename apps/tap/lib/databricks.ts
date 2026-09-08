import "server-only";

import { execFileSync } from "node:child_process";
import { DBSQLClient } from "@databricks/sql";
import { AppConfig, fullTableName } from "./config";
import { TOOL_CATEGORIES_MAPPING } from "./constants";
import { getServicePrincipalToken } from "./sp-token";

const _CORE_GENERATED_COLUMNS: Record<string, string> = {
  id: "BIGINT GENERATED ALWAYS AS IDENTITY",
  created_at: "TIMESTAMP GENERATED ALWAYS AS (now())",
};

const _CORE_DATA_COLUMNS: Record<string, string> = {
  company_name: "STRING",
  user_name: "STRING",
  company_industry: "STRING",
  cloud_provider: "Array<STRING>",
  // Star rating 1–5 per "Critérios Norteadores" item — serialised JSON
  // (Map<string,int>). Persisted as STRING so the schema migration is
  // backward-compatible (ALTER TABLE ADD COLUMN doesn't need a complex
  // type that pre-existing rows would have to default).
  criteria: "STRING",
};

function toolsColumns(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const col of Object.values(TOOL_CATEGORIES_MAPPING)) {
    out[col] = "Array<STRING>";
  }
  return out;
}

function generateCreateTableSql(table: string): string {
  const cols: string[] = [];
  for (const [name, type] of Object.entries(_CORE_GENERATED_COLUMNS))
    cols.push(`${name} ${type}`);
  for (const [name, type] of Object.entries(_CORE_DATA_COLUMNS))
    cols.push(`${name} ${type}`);
  for (const [name, type] of Object.entries(toolsColumns()).sort())
    cols.push(`${name} ${type}`);
  return `CREATE TABLE IF NOT EXISTS ${table} (\n  ${cols.join(",\n  ")}\n)`;
}

// Auth for the SQL warehouse call. In production (Databricks App) the
// app SP credentials are injected as DATABRICKS_CLIENT_ID/SECRET — we
// mint an M2M OAuth token from them. The forwarded user OAuth token
// can't be used here because it lacks the `sql` scope (403 on submit).
//
// User identity for the `user_name` column is captured separately at
// the route handler via x-forwarded-email, so this auth path only
// covers the warehouse connection.
async function getBearerToken(): Promise<string> {
  const host = AppConfig.DATABRICKS_HOST;

  if (process.env.DATABRICKS_CLIENT_ID && process.env.DATABRICKS_CLIENT_SECRET) {
    if (!host) {
      throw new Error(
        "DATABRICKS_HOST is unset but DATABRICKS_CLIENT_ID/SECRET are " +
          "present. Set DATABRICKS_HOST so the SP token can be minted.",
      );
    }
    const url = host.startsWith("http") ? host : `https://${host}`;
    return getServicePrincipalToken(url);
  }

  const pat = process.env.DATABRICKS_TOKEN ?? process.env.DATABRICKS_API_TOKEN;
  if (pat) return pat;

  // Fallback: databricks CLI OAuth U2M (local dev).
  if (host) {
    try {
      const out = execFileSync(
        "databricks",
        ["auth", "token", "--host", `https://${host}`],
        { stdio: ["ignore", "pipe", "ignore"], timeout: 5000 },
      ).toString();
      const parsed = JSON.parse(out) as { access_token?: string };
      if (parsed.access_token) return parsed.access_token;
    } catch {
      /* CLI not installed or session expired */
    }
  }

  throw new Error(
    "No Databricks credentials. Set DATABRICKS_TOKEN in .env.local or run " +
      "`databricks auth login --host <workspace-url>`.",
  );
}

// Session type is inferred from openSession() rather than imported by name —
// @databricks/sql exports DBSQLSession (no `I` prefix) and only as a type,
// so we capture it via Awaited<ReturnType<...>> to stay version-agnostic.
type Session = Awaited<ReturnType<InstanceType<typeof DBSQLClient>["openSession"]>>;

async function withSession<T>(
  fn: (session: Session) => Promise<T>,
): Promise<T> {
  const token = await getBearerToken();
  const client = new DBSQLClient();
  await client.connect({
    host: AppConfig.DATABRICKS_HOST!,
    path: AppConfig.DATABRICKS_WAREHOUSE_HTTP_PATH!,
    token,
  });
  const session = await client.openSession();
  try {
    return await fn(session);
  } finally {
    await session.close().catch(() => {});
    await client.close().catch(() => {});
  }
}

async function executeStatement(
  session: Session,
  sql: string,
  ordinalParameters?: unknown[],
): Promise<void> {
  const op = await session.executeStatement(sql, {
    runAsync: true,
    ordinalParameters: ordinalParameters as never,
  });
  try {
    await op.fetchAll();
  } finally {
    await op.close().catch(() => {});
  }
}

export async function ensureToolsTableSchema(): Promise<void> {
  const table = fullTableName();
  await withSession(async (session) => {
    await executeStatement(session, generateCreateTableSql(table));
    const op = await session.executeStatement(`DESCRIBE TABLE ${table}`, {
      runAsync: true,
    });
    let existing: Set<string>;
    try {
      const rows = (await op.fetchAll()) as Array<Record<string, unknown>>;
      existing = new Set(
        rows
          .map((r) => String(r.col_name ?? "").toLowerCase())
          .filter((n) => n && !n.startsWith("#")),
      );
    } finally {
      await op.close().catch(() => {});
    }
    const expected = { ..._CORE_DATA_COLUMNS, ...toolsColumns() };
    for (const [name, type] of Object.entries(expected)) {
      if (!existing.has(name.toLowerCase())) {
        await executeStatement(
          session,
          `ALTER TABLE ${table} ADD COLUMN ${name} ${type}`,
        );
      }
    }
  });
}

export interface SubmissionPayload {
  company_name: string;
  user_name: string;
  company_industry: string;
  cloud_provider: string[];
  tools: Record<string, string[]>;
  criteria: Record<string, number>;
}

export async function saveTools(payload: SubmissionPayload): Promise<boolean> {
  if (AppConfig.DEV_MOCK_DATABASE) {
    const masked =
      payload.user_name.length > 3
        ? payload.user_name.slice(0, 3) + "***"
        : "***";
    console.log(`[MOCK] saveTools(user=${masked}, company=${payload.company_name})`);
    return true;
  }

  const table = fullTableName();
  await ensureToolsTableSchema();

  // Project payload into the DB row shape.
  const scalars: Array<[string, string]> = [
    ["company_name", payload.company_name],
    ["user_name", payload.user_name],
    ["company_industry", payload.company_industry],
    // Criteria persisted as JSON string to keep the schema migration simple.
    ["criteria", JSON.stringify(payload.criteria ?? {})],
  ];
  const arrays: Array<[string, string[]]> = [
    ["cloud_provider", payload.cloud_provider],
  ];
  for (const [label, col] of Object.entries(TOOL_CATEGORIES_MAPPING)) {
    if (payload.tools[label]) arrays.push([col, payload.tools[label]]);
  }

  const cols: string[] = [];
  const placeholders: string[] = [];
  const params: string[] = [];
  for (const [name, value] of scalars) {
    cols.push(name);
    placeholders.push("?");
    params.push(value);
  }
  for (const [name, value] of arrays) {
    cols.push(name);
    // Databricks SQL has no native array binding; serialise to JSON and
    // re-hydrate server-side. Same trick the Python original uses.
    placeholders.push(`from_json(?, 'array<string>')`);
    params.push(JSON.stringify(value));
  }

  const sql = `INSERT INTO ${table} (${cols.join(", ")}) VALUES (${placeholders.join(", ")})`;
  await withSession((session) => executeStatement(session, sql, params));
  return true;
}

// ─── List & load previous submissions ────────────────────────────────────

export interface SubmissionSummary {
  id: string;
  company_name: string;
  company_industry: string;
  user_name: string;
  created_at: string;
}

export interface SubmissionDetail extends SubmissionSummary {
  cloud_provider: string[];
  tools: Record<string, string[]>;
  criteria: Record<string, number>;
}

async function fetchRows<T>(
  sql: string,
  ordinalParameters: unknown[] | undefined,
  map: (row: Record<string, unknown>) => T,
): Promise<T[]> {
  const token = await getBearerToken();
  const client = new DBSQLClient();
  await client.connect({
    host: AppConfig.DATABRICKS_HOST!,
    path: AppConfig.DATABRICKS_WAREHOUSE_HTTP_PATH!,
    token,
  });
  const session = await client.openSession();
  try {
    const op = await session.executeStatement(sql, {
      runAsync: true,
      ordinalParameters: ordinalParameters as never,
    });
    try {
      const rows = (await op.fetchAll()) as Array<Record<string, unknown>>;
      return rows.map(map);
    } finally {
      await op.close().catch(() => {});
    }
  } finally {
    await session.close().catch(() => {});
    await client.close().catch(() => {});
  }
}

/** Reverse map of TOOL_CATEGORIES_MAPPING: DB column → display label. */
const _COL_TO_LABEL: Record<string, string> = Object.fromEntries(
  Object.entries(TOOL_CATEGORIES_MAPPING).map(([label, col]) => [col, label]),
);

function parseCloudProvider(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch {
      /* fall through */
    }
  }
  return [];
}

function parseToolArray(raw: unknown): string[] {
  return parseCloudProvider(raw);
}

function parseCriteria(raw: unknown): Record<string, number> {
  if (typeof raw !== "string" || raw.trim() === "") return {};
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const out: Record<string, number> = {};
      for (const [k, v] of Object.entries(parsed)) {
        const n = Number(v);
        if (Number.isFinite(n) && n > 0) out[k] = n;
      }
      return out;
    }
  } catch {
    /* invalid JSON */
  }
  return {};
}

export async function listSubmissions(userEmail: string): Promise<SubmissionSummary[]> {
  if (AppConfig.DEV_MOCK_DATABASE) return [];
  const table = fullTableName();
  await ensureToolsTableSchema();
  const sql = `
    SELECT id, company_name, company_industry, user_name, created_at
    FROM ${table}
    WHERE user_name = ?
    ORDER BY created_at DESC
    LIMIT 200
  `;
  return fetchRows(sql, [userEmail], (row) => ({
    id: String(row.id ?? ""),
    company_name: String(row.company_name ?? ""),
    company_industry: String(row.company_industry ?? ""),
    user_name: String(row.user_name ?? ""),
    created_at: String(row.created_at ?? ""),
  }));
}

export async function getSubmission(
  id: string,
  userEmail: string,
): Promise<SubmissionDetail | null> {
  if (AppConfig.DEV_MOCK_DATABASE) return null;
  const table = fullTableName();
  await ensureToolsTableSchema();
  // Restrict by user_name so users can only read their own submissions.
  const sql = `SELECT * FROM ${table} WHERE id = ? AND user_name = ? LIMIT 1`;
  const rows = await fetchRows(sql, [id, userEmail], (row) => row);
  const row = rows[0];
  if (!row) return null;

  const tools: Record<string, string[]> = {};
  for (const [col, label] of Object.entries(_COL_TO_LABEL)) {
    const arr = parseToolArray(row[col]);
    if (arr.length > 0) tools[label] = arr;
  }

  return {
    id: String(row.id ?? ""),
    company_name: String(row.company_name ?? ""),
    company_industry: String(row.company_industry ?? ""),
    user_name: String(row.user_name ?? ""),
    created_at: String(row.created_at ?? ""),
    cloud_provider: parseCloudProvider(row.cloud_provider),
    tools,
    criteria: parseCriteria(row.criteria),
  };
}
