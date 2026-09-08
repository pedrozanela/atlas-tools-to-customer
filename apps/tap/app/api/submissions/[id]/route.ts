import { NextResponse } from "next/server";
import { headers as nextHeaders } from "next/headers";
import { AppConfig } from "@/lib/config";
import { getSubmission } from "@/lib/databricks";

export const dynamic = "force-dynamic";

/**
 * GET /api/submissions/:id
 * Returns the full payload for a single submission (cloud_provider,
 * tools, criteria, metadata). Restricted to the requesting user.
 */
export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
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

  const { id } = await context.params;
  if (!/^[0-9]+$/.test(id)) {
    return NextResponse.json(
      { ok: false, error: "Invalid submission ID." },
      { status: 400 },
    );
  }

  try {
    const sub = await getSubmission(id, userEmail);
    if (!sub) {
      return NextResponse.json(
        { ok: false, error: "Submission not found." },
        { status: 404 },
      );
    }
    return NextResponse.json({ ok: true, submission: sub });
  } catch (e) {
    console.error("getSubmission failed", e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
