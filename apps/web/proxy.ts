import { NextRequest, NextResponse } from "next/server";

const DATABRICKS_OBO_HEADER = "x-forwarded-access-token";

/**
 * Atlas is one Databricks App hosting several internal Next.js apps.
 * User authorization (OBO) is forwarded to the zones that query workspace
 * data with the caller's own identity:
 *
 *   - WAF   — Agent-mode / assessment SQL run on-behalf-of the user.
 *   - Forge — reads the Unity Catalog `system.*` tables (lineage, compute,
 *             lakeflow, billing) with the caller's grants, so the deploy
 *             does not need account-admin `system.*` grants for the app SP.
 *
 * Every other zone (tap, maturity, shell) keeps the app service-principal
 * authorization, so the shell strips the OBO token before proxying them.
 */
const OBO_ZONES = ["/waf", "/forge"];

export function shouldForwardWafOboToken(pathname: string): boolean {
  return OBO_ZONES.some((zone) => pathname === zone || pathname.startsWith(zone + "/"));
}

export function headersForAtlasZone(pathname: string, source: HeadersInit): Headers {
  const requestHeaders = new Headers(source);
  if (!shouldForwardWafOboToken(pathname)) {
    requestHeaders.delete(DATABRICKS_OBO_HEADER);
  }
  return requestHeaders;
}

export function proxy(request: NextRequest) {
  const requestHeaders = headersForAtlasZone(request.nextUrl.pathname, request.headers);
  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
