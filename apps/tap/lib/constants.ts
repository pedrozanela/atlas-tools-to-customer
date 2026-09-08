// Single source of truth for tool categories: display label -> DB column name.
// Ported from cwrneiro/databricks_tap_tool core/constants.py.
export const TOOL_CATEGORIES_MAPPING: Record<string, string> = {
  "Batch Sources": "batch_sources",
  "Streaming Sources": "streaming_sources",
  "Batch Ingestion": "batch_ingestion",
  "Data Catalog": "data_catalog",
  "Data Lake": "data_lake",
  "Data Science / Lab": "data_science_lab",
  "Data Visualization (BI)": "data_visualization_bi",
  "Streaming / NRT": "streaming_nrt",
  Governance: "governance",
  "Big Data": "big_data",
  "MLOps / Serving": "mlops_serving",
  "Agent Tools": "agent_tools",
  "Cloud Storage Format": "cloud_storage_format",
  Orchestration: "orchestration",
  "Data Quality": "data_quality",
  "Data Warehouse": "data_warehouse",
  "Query Tools & Data Sharing": "query_tools_data_sharing",
  "Transactional Layer": "transactional_layer",
};

export const CLOUD_PROVIDERS = ["AWS", "Azure", "GCP", "Oracle", "Other"];
export const CLOUD_PROVIDERS_STANDARD = ["AWS", "Azure", "GCP", "Oracle"];
