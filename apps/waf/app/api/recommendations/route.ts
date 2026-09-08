/**
 * API: GET /api/assessment/recommendations?assessmentId=<uuid>
 *
 * Returns the persisted Agent mode batch for one assessment. Pending work is
 * resumed best-effort, so a page refresh does not require another Run.
 */

import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/api-utils";
import { requireUser, ForgeAuthError } from "@/lib/auth/route-user";
import { listAccessibleIds } from "@/lib/lakebase/acl";
import { getAssessmentDetail } from "@/lib/engines/waf-assessment/service";
import {
  listRecommendationBatch,
  startRecommendationGeneration,
} from "@/lib/engines/waf-assessment/genie/recommendations";
import { isValidUUID } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    let user;
    try {
      user = await requireUser(request);
    } catch (error) {
      if (error instanceof ForgeAuthError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
      }
      throw error;
    }

    const assessmentId = request.nextUrl.searchParams.get("assessmentId") ?? "";
    if (!isValidUUID(assessmentId)) {
      return NextResponse.json({ error: "assessmentId must be a valid UUID" }, { status: 400 });
    }

    const sharedIds = await listAccessibleIds(user.email, "waf_assessment");
    const assessment = await getAssessmentDetail(assessmentId, user.email, sharedIds);
    if (!assessment) {
      return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
    }
    if (!user.oboToken) {
      return NextResponse.json(
        {
          error:
            "Databricks user authorization is required. Reopen the App and approve its OBO scopes.",
        },
        { status: 401 },
      );
    }

    let batch = await listRecommendationBatch(assessmentId);
    if (batch.pending > 0 || batch.running > 0) {
      // Refresh the in-memory token for long-running/recovered Agent calls.
      // It is intentionally never persisted in Lakebase.
      startRecommendationGeneration(assessmentId, user.oboToken);
      batch = await listRecommendationBatch(assessmentId);
    }

    return NextResponse.json(batch, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return handleApiError(error, "/api/assessment/recommendations");
  }
}
