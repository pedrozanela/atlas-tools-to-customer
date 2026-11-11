/**
 * Workspace scoping for every system-table read the app makes.
 *
 * The deploy notebook creates one view per workspace-attributed system table
 * in ATLAS_SYSTEM_SCOPE_SCHEMA (`<catalog>.<schema>`), each filtered to the
 * workspaces the admin selected (or unfiltered when no selection was made).
 * Redirecting `system.<schema>.<table>` to `<catalog>.<schema>.<schema>_<table>`
 * keeps the app, its Genie Agents and its dashboards inside that selection.
 *
 * Unset ATLAS_SYSTEM_SCOPE_SCHEMA keeps the original `system.*` reads (CLI
 * deploys that never created the views). system.information_schema.* and
 * system.billing.list_prices have no workspace_id and are left untouched.
 *
 * Keep in sync with apps/waf/lib/dbx/system-scope.ts and with
 * SCOPED_SYSTEM_TABLES in notebooks/deploy_atlas.py.
 */

export const SCOPED_SYSTEM_TABLES: ReadonlySet<string> = new Set([
  "system.access.audit",
  "system.access.table_lineage",
  "system.billing.usage",
  "system.compute.clusters",
  "system.compute.node_timeline",
  "system.compute.warehouse_events",
  "system.compute.warehouses",
  "system.lakeflow.job_run_timeline",
  "system.lakeflow.jobs",
  "system.lakeflow.pipelines",
  "system.query.history",
]);

const SYSTEM_TABLE_REF = /\bsystem\.(access|billing|compute|lakeflow|query)\.([a-z_]+)\b/gi;
const SCOPE_SCHEMA = /^([A-Za-z0-9_-]+)\.([A-Za-z0-9_]+)$/;

interface ScopeSchema {
  catalog: string;
  schema: string;
}

/**
 * Parse ATLAS_SYSTEM_SCOPE_SCHEMA. A malformed value throws instead of
 * silently falling back to account-wide `system.*` reads.
 */
export function parseScopeSchema(raw: string | undefined | null): ScopeSchema | null {
  const value = raw?.trim();
  if (!value) return null;
  const match = SCOPE_SCHEMA.exec(value);
  if (!match) {
    throw new Error(
      `ATLAS_SYSTEM_SCOPE_SCHEMA must be "<catalog>.<schema>"; got ${JSON.stringify(value)}`,
    );
  }
  return { catalog: match[1], schema: match[2] };
}

function configuredScopeSchema(): ScopeSchema | null {
  return parseScopeSchema(process.env.ATLAS_SYSTEM_SCOPE_SCHEMA);
}

function viewName(fqn: string): string {
  const [, schema, table] = fqn.split(".");
  return `${schema}_${table}`;
}

/** Rewrite system-table references in SQL text to the scoped views. */
export function scopeSystemTables(sql: string, scope = configuredScopeSchema()): string {
  if (!scope) return sql;
  return sql.replace(SYSTEM_TABLE_REF, (match) => {
    const fqn = match.toLowerCase();
    if (!SCOPED_SYSTEM_TABLES.has(fqn)) return match;
    return `\`${scope.catalog}\`.\`${scope.schema}\`.\`${viewName(fqn)}\``;
  });
}

/**
 * Same mapping for prose and table identifiers (Genie data sources and
 * instructions), which use plain dotted names instead of quoted identifiers.
 */
export function scopeSystemTableNames(text: string, scope = configuredScopeSchema()): string {
  if (!scope) return text;
  return text.replace(SYSTEM_TABLE_REF, (match) => {
    const fqn = match.toLowerCase();
    if (!SCOPED_SYSTEM_TABLES.has(fqn)) return match;
    return `${scope.catalog}.${scope.schema}.${viewName(fqn)}`;
  });
}

/**
 * Human-readable description of the workspace selection, set by the deploy
 * notebook. Null when the app reads every workspace.
 */
export function workspaceScopeLabel(): string | null {
  const label = process.env.ATLAS_WORKSPACE_SCOPE?.trim();
  return label ? label : null;
}
