export interface AppConfigResponse {
  tool_categories: Record<string, string>;
  cloud_providers: string[];
  cloud_providers_standard: string[];
  is_development: boolean;
  /** Tenant identity stamped onto the AS-IS canvas + persisted with the
   *  submission. company_name comes from APP_COMPANY_NAME (server env);
   *  user_name comes from x-forwarded-email (Databricks Apps proxy) and
   *  falls back to the local-dev identity. */
  company_name: string;
  user_name: string;
}

export interface SubmitToolsRequest {
  cloud_provider: string[];
  tools: Record<string, string[]>;
  /** Star rating 1–5 per "Critérios Norteadores" item key. Omitted items
   *  are treated as unrated/neutral. See lib/criteria.ts for the catalog. */
  criteria?: Record<string, number>;
}

export interface SubmitToolsResponse {
  ok: boolean;
}

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

export interface ListSubmissionsResponse {
  ok: boolean;
  submissions: SubmissionSummary[];
}

export interface GetSubmissionResponse {
  ok: boolean;
  submission?: SubmissionDetail;
  error?: string;
}
