import { NextResponse } from "next/server";
import { headers as nextHeaders } from "next/headers";
import { AppConfig } from "@/lib/config";
import { listSubmissions } from "@/lib/databricks";

export const dynamic = "force-dynamic";

/**
 * GET /api/submissions
 * Returns the current user's TAP submissions (most recent first). Filters
 * by the x-forwarded-email header injected by the Databricks Apps proxy.
 */
export async function GET() {
  const hdrs = await nextHeaders();
  const userEmail =
    hdrs.get("x-forwarded-email") ??
    hdrs.get("x-forwarded-user") ??
    AppConfig.LOCAL_DEV_USER ??
    "";

  if (!userEmail) {
    return NextResponse.json(
      { ok: false, error: "No user identity available." },
      { status: 401 },
    );
  }

  try {
    const rows = await listSubmissions(userEmail);
    return NextResponse.json({ ok: true, submissions: rows });
  } catch (e) {
    console.error("listSubmissions failed", e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
