// Visual mapping of the 18 backend categories onto a 7-column × N-row canvas.
// Each section declares the column and row it lives in, so cells align
// horizontally across columns. The `category` value MUST match a key in
// TOOL_CATEGORIES_MAPPING — that key is what the form posts and what
// /api/config/tools/[category] looks up for the tool icon list.

export type CanvasSection = {
  col: number; // 1..7
  row: number; // 1..N
  category: string; // matches TOOL_CATEGORIES_MAPPING key
};

export const COLUMN_TITLES = [
  "Data Sources",
  "Ingestion",
  "Catalog & Governance",
  "Storage",
  "Warehouse",
  "Data Lab / ML",
  "Consumption",
];

export const CANVAS_SECTIONS: CanvasSection[] = [
  // Col 1 — Data Sources
  { col: 1, row: 1, category: "Batch Sources" },
  { col: 1, row: 2, category: "Streaming Sources" },
  // Col 2 — Ingestion
  { col: 2, row: 1, category: "Batch Ingestion" },
  { col: 2, row: 2, category: "Streaming / NRT" },
  { col: 2, row: 3, category: "Orchestration" },
  // Col 3 — Catalog & Governance
  { col: 3, row: 1, category: "Data Catalog" },
  { col: 3, row: 2, category: "Governance" },
  { col: 3, row: 3, category: "Data Quality" },
  // Col 4 — Storage
  { col: 4, row: 1, category: "Data Lake" },
  { col: 4, row: 2, category: "Big Data" },
  { col: 4, row: 3, category: "Cloud Storage Format" },
  // Col 5 — Warehouse
  { col: 5, row: 1, category: "Data Warehouse" },
  { col: 5, row: 2, category: "Transactional Layer" },
  { col: 5, row: 3, category: "Query Tools & Data Sharing" },
  // Col 6 — Data Lab / ML
  { col: 6, row: 1, category: "Data Science / Lab" },
  { col: 6, row: 2, category: "MLOps / Serving" },
  // Col 7 — Consumption
  { col: 7, row: 1, category: "Data Visualization (BI)" },
  { col: 7, row: 2, category: "Agent Tools" },
];

export const MAX_ROW = Math.max(...CANVAS_SECTIONS.map((s) => s.row));
