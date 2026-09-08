/**
 * API: GET /api/assessment/assets
 *
 * Reports whether the automatically managed WAF Genie Agent exists in the
 * workspace, plus its URL.
 *
 * Requires an authenticated user. The deploy notebook restricts the enclosing
 * Databricks App ACL to the admin/deployer.
 */

import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/api-utils";
import { requireUser, ForgeAuthError } from "@/lib/auth/route-user";
import { getWafGenieAsset } from "@/lib/engines/waf-assessment/genie/provision";

export async function GET(request: NextRequest) {
  try {
    let user;
    try {
      user = await requireUser(request);
    } catch (e) {
      if (e instanceof ForgeAuthError) {
        return NextResponse.json({ error: e.message }, { status: e.status });
      }
      throw e;
    }
    if (!user.oboToken) {
      return NextResponse.json(
        { error: "Databricks user authorization is required" },
        { status: 401 },
      );
    }
    const asset = await getWafGenieAsset(user.oboToken).catch(() => null);
    return NextResponse.json({
      genie: asset ? { id: asset.spaceId, url: asset.spaceUrl } : null,
    });
  } catch (error) {
    return handleApiError(error, "/api/assessment/assets");
  }
}
