/**
 * API: POST /api/assessment/run
 *
 * Triggers a fresh WAF assessment, running synchronously while the
 * pillar queries execute (typically 10-30s on a warm warehouse). The
 * response is the final assessment summary.
 *
 * `scope` is an optional UC label stored alongside the run for display;
 * the SQL queries themselves scan all of `system.*` (workspace-wide).
 */

import { NextRequest, NextResponse } from "next/server";
import { ensureMigrated } from "@/lib/lakebase/schema";
import { runAssessment } from "@/lib/engines/waf-assessment/service";
import { handleApiError } from "@/lib/api-utils";
import { requireUser, ForgeAuthError } from "@/lib/auth/route-user";
import { logActivity } from "@/lib/lakebase/activity-log";
import { ensureWafGenieSpace } from "@/lib/engines/waf-assessment/genie/provision";
import {
  seedRecommendationBatch,
  setRecommendationSetupStatus,
  startRecommendationGeneration,
} from "@/lib/engines/waf-assessment/genie/recommendations";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    await ensureMigrated();
    let user;
    try {
      user = await requireUser(request);
    } catch (e) {
      if (e instanceof ForgeAuthError) {
        return NextResponse.json({ error: e.message }, { status: e.status });
      }
      throw e;
    }
    const body = await request.json().catch(() => ({}));
    const scope = typeof body.scope === "string" ? body.scope : undefined;
    const requestedLocale = typeof body.locale === "string" ? body.locale : "en";
    const locale = new Set(["en", "pt-BR", "es"]).has(requestedLocale) ? requestedLocale : "en";
    if (!user.oboToken) {
      return NextResponse.json(
        {
          error:
            "Databricks user authorization is required. Reopen the App and approve its OBO scopes.",
        },
        { status: 401 },
      );
    }
    // `triggeredBy` is server-derived from the authenticated user. The
    // body field is intentionally NOT honored to prevent attribution
    // spoofing in the assessment row + activity log.
    const triggeredBy = user.email;

    const summary = await runAssessment({
      scope,
      triggeredBy,
      ownerEmail: user.email,
      oboToken: user.oboToken,
    });

    // Fire-and-forget activity logging: never block the response on a
    // logging failure.
    void logActivity(
      summary.status === "completed"
        ? "waf_assessment_completed"
        : summary.status === "failed"
          ? "waf_assessment_failed"
          : "waf_assessment_started",
      {
        userId: user.email,
        resourceId: summary.assessmentId,
        metadata: {
          scope: scope ?? null,
          overallScore: summary.overallScore,
          totalControls: summary.totalControls,
          metControls: summary.metControls,
        },
      },
    );

    let genie: {
      action: "created" | "updated";
      spaceId: string;
      spaceUrl: string;
    } | null = null;
    let recommendations: { status: "pending" | "not_started"; total: number } | null = null;
    let automationError: string | null = null;

    if (summary.status === "completed") {
      try {
        await setRecommendationSetupStatus(summary.assessmentId, "running");
        // The Atlas App is restricted to its admin/deployer. Agent management,
        // SQL evidence, and every per-control analysis run on behalf of that
        // user; the token is never persisted in Lakebase.
        genie = await ensureWafGenieSpace({
          locale,
          userEmail: user.email,
          oboToken: user.oboToken,
        });
        const total = await seedRecommendationBatch({
          assessmentId: summary.assessmentId,
          agentId: genie.spaceId,
          locale,
        });
        recommendations = {
          status: total > 0 ? "pending" : "not_started",
          total,
        };
        await setRecommendationSetupStatus(summary.assessmentId, "completed");
        if (total > 0) {
          startRecommendationGeneration(summary.assessmentId, user.oboToken);
        }
      } catch (error) {
        // The deterministic assessment remains valid even when the optional
        // Beta Agent mode feature is disabled or lacks permissions.
        automationError = error instanceof Error ? error.message : String(error);
        logger.error("Automatic WAF Genie recommendation setup failed", {
          assessmentId: summary.assessmentId,
          error: automationError,
        });
        try {
          await setRecommendationSetupStatus(summary.assessmentId, "failed", automationError);
        } catch (persistenceError) {
          logger.error("Could not persist WAF Genie setup failure", {
            assessmentId: summary.assessmentId,
            error:
              persistenceError instanceof Error
                ? persistenceError.message
                : String(persistenceError),
          });
        }
      }
    }

    return NextResponse.json(
      {
        ...summary,
        genie,
        recommendations,
        automationError,
      },
      { status: 201 },
    );
  } catch (error) {
    return handleApiError(error, "/api/assessment/run");
  }
}
