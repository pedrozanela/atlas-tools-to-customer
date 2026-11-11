/**
 * Lakeview (`.lvdash.json`) source for the WAF Assessment dashboard.
 *
 * The dashboard was hand-tuned in the Databricks Lakeview editor (Genie code)
 * and exported as `template.lvdash.json`. This module just serves that JSON
 * as the `serialized_dashboard` payload. Lakeview executes the embedded SQL
 * itself, so system-table references are redirected here to the
 * admin-selected workspace views (no-op when no scope is configured).
 */
import { PILLAR_LABEL, WAF_PILLARS_WITH_QUERIES } from "../types";
import template from "./template.lvdash.json";
import { scopeSystemTables } from "@/lib/dbx/system-scope";

export const WAF_DASHBOARD_DISPLAY_NAME = "Forge WAF Assessment";

export async function buildWafDashboardJson(): Promise<string> {
  const scoped = {
    ...template,
    datasets: template.datasets.map((dataset) => ({
      ...dataset,
      queryLines: dataset.queryLines.map((line) => scopeSystemTables(line)),
    })),
  };
  return JSON.stringify(scoped);
}

export { PILLAR_LABEL, WAF_PILLARS_WITH_QUERIES };
