"use client";

import * as XLSX from "xlsx";
import { CRITERIA_CATEGORIES } from "./criteria";

export interface ExcelExportPayload {
  companyName: string;
  userName: string;
  cloudProviders: string[];
  tools: Record<string, string[]>;
  criteria: Record<string, number>;
}

/**
 * Builds an .xlsx workbook with three sheets (Summary, AS-IS Architecture,
 * Guiding Criteria) and triggers a download in the browser. Used by the
 * "Excel" button in SubmittedSummary so the architect can pull the data
 * into their own analyses without copy-pasting from the PDF.
 */
export function downloadExcel(payload: ExcelExportPayload): void {
  const wb = XLSX.utils.book_new();

  // ── Sheet 1: Summary ─────────────────────────────────────────────────
  const summary: Array<[string, string]> = [
    ["Company", payload.companyName || "—"],
    ["Author", payload.userName || "—"],
    ["Cloud providers", payload.cloudProviders.join(", ") || "—"],
    ["Generated at", new Date().toISOString().replace("T", " ").slice(0, 19)],
  ];
  const summarySheet = XLSX.utils.aoa_to_sheet([
    ["Field", "Value"],
    ...summary,
  ]);
  summarySheet["!cols"] = [{ wch: 22 }, { wch: 60 }];
  XLSX.utils.book_append_sheet(wb, summarySheet, "Summary");

  // ── Sheet 2: AS-IS Architecture (one row per tool) ───────────────────
  const archRows: Array<[string, string]> = [];
  for (const [category, toolList] of Object.entries(payload.tools)) {
    for (const tool of toolList) {
      archRows.push([category, tool]);
    }
  }
  if (archRows.length === 0) archRows.push(["—", "(no tools mapped)"]);
  const archSheet = XLSX.utils.aoa_to_sheet([
    ["Category", "Tool"],
    ...archRows,
  ]);
  archSheet["!cols"] = [{ wch: 30 }, { wch: 38 }];
  XLSX.utils.book_append_sheet(wb, archSheet, "AS-IS Architecture");

  // ── Sheet 3: Guiding Criteria ────────────────────────────────────────
  const criteriaRows: Array<[string, string, number | string]> = [];
  for (const cat of CRITERIA_CATEGORIES) {
    for (const item of cat.items) {
      const score = payload.criteria[item.key] ?? 0;
      if (score > 0) {
        criteriaRows.push([cat.title, item.label, score]);
      }
    }
  }
  if (criteriaRows.length === 0) {
    criteriaRows.push(["—", "(no drivers rated)", ""]);
  }
  const criteriaSheet = XLSX.utils.aoa_to_sheet([
    ["Category", "Driver", "Rating (1–5)"],
    ...criteriaRows,
  ]);
  criteriaSheet["!cols"] = [{ wch: 26 }, { wch: 50 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, criteriaSheet, "Guiding Criteria");

  const safeCompany = (payload.companyName || "tap")
    .replace(/[^a-zA-Z0-9-_ ]/g, "")
    .replace(/\s+/g, "_")
    .toLowerCase();
  const dateStr = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `atlas-tap-${safeCompany}-${dateStr}.xlsx`);
}
