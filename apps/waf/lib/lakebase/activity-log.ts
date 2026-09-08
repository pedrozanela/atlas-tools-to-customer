/**
 * Activity log stubs for apps/waf.
 *
 * The original forge module logged to a `forge_activity_logs` table that
 * doesn't exist in the WAF schema. For now, entries go to the standard
 * logger only. Add a WafActivityLog model when auditability is required.
 */

import { logger } from "@/lib/logger";

export type ActivityAction =
  | "created_run"
  | "started_pipeline"
  | "completed"
  | "failed"
  | "deleted_run"
  | "exported"
  | "updated_run_industry"
  | "created_comment_job"
  | "applied_comments"
  | "undone_comments"
  | "deleted_comment_job"
  | "scanned_schema"
  | "parsed_requirements"
  | "started_auto_improve"
  | "completed_auto_improve"
  | "synced_genie_spaces"
  | "rerun_business_value"
  | "demo_research"
  | "demo_generate"
  | "demo_cleanup"
  | "demo_genie_space_deployed"
  | "pipeline_queued"
  | "pipeline_promoted"
  | "pipeline_cancelled"
  | "endpoint_throttled"
  | "resource_shared"
  | "resource_unshared"
  | "waf_assessment_started"
  | "waf_assessment_completed"
  | "waf_assessment_failed"
  | "waf_genie_generated";

export interface ActivityLogEntry {
  activityId: string;
  userId: string | null;
  action: ActivityAction;
  resourceId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export async function logActivity(
  action: ActivityAction,
  opts: {
    userId?: string | null;
    resourceId?: string | null;
    metadata?: Record<string, unknown>;
  } = {},
): Promise<void> {
  logger.info("activity", {
    action,
    userId: opts.userId ?? null,
    resourceId: opts.resourceId ?? null,
    metadata: opts.metadata ?? null,
  });
}

export async function getRecentActivity(
  _limit = 20,
  _opts?: { userEmail?: string },
): Promise<ActivityLogEntry[]> {
  return [];
}

export async function getActivityForResource(_resourceId: string): Promise<ActivityLogEntry[]> {
  return [];
}
