// Env-var holder. Read once at module load. Mirrors core/config.py.
export const AppConfig = {
  DEV_MOCK_DATABASE:
    (process.env.APP_DEV_MOCK_DATABASE ?? "false").toLowerCase() === "true",

  DATABRICKS_HOST: process.env.DATABRICKS_HOST,
  DATABRICKS_WAREHOUSE_HTTP_PATH: process.env.DATABRICKS_WAREHOUSE_HTTP_PATH,

  UC_CATALOG: process.env.UC_CATALOG,
  UC_SCHEMA: process.env.UC_SCHEMA,
  UC_TABLE: process.env.UC_TABLE ?? "databricks_tap_tool_submissions",

  APP_COMPANY_NAME: process.env.APP_COMPANY_NAME,
  APP_COMPANY_INDUSTRY: process.env.APP_COMPANY_INDUSTRY,

  LOCAL_DEV_USER: process.env.LOCAL_DEV_USER ?? "local-dev@example.com",
};

export function isDatabaseConfigured(): boolean {
  return Boolean(
    AppConfig.DATABRICKS_HOST &&
      AppConfig.DATABRICKS_WAREHOUSE_HTTP_PATH &&
      AppConfig.UC_CATALOG &&
      AppConfig.UC_SCHEMA,
  );
}

export function isCompanyConfigured(): boolean {
  return Boolean(AppConfig.APP_COMPANY_NAME && AppConfig.APP_COMPANY_INDUSTRY);
}

export function fullTableName(): string {
  return `${AppConfig.UC_CATALOG}.${AppConfig.UC_SCHEMA}.${AppConfig.UC_TABLE}`;
}

// Strip everything except ASCII letters per whitespace-separated token.
// Mirrors core/config.py:62 sanitize_category so that "Data Visualization (BI)"
// -> "Data Visualization BI" matches the static icon folder names.
export function sanitizeCategory(category: string): string {
  return category
    .split(/\s+/)
    .map((piece) => piece.replace(/[^a-zA-Z]/g, ""))
    .filter((piece) => piece.length > 0)
    .join(" ");
}
