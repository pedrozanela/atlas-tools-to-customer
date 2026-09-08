import { NextResponse } from "next/server";
import { headers as nextHeaders } from "next/headers";
import { AppConfig, isCompanyConfigured } from "@/lib/config";
import { saveTools } from "@/lib/databricks";
import type { SubmitToolsRequest } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!AppConfig.DEV_MOCK_DATABASE && !isCompanyConfigured()) {
    return NextResponse.json(
      { ok: false, error: "Server not configured (APP_COMPANY_* missing)." },
      { status: 500 },
    );
  }

  let body: SubmitToolsRequest;
  try {
    body = (await req.json()) as SubmitToolsRequest;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body." },
      { status: 400 },
    );
  }

  // Trust X-Forwarded-* injected by the Databricks Apps proxy; fall back to
  // the local-dev identity. The frontend cannot set its own user_name.
  const hdrs = await nextHeaders();
  const user_name =
    hdrs.get("x-forwarded-email") ??
    hdrs.get("x-forwarded-user") ??
    AppConfig.LOCAL_DEV_USER;

  try {
    const ok = await saveTools({
      company_name: AppConfig.APP_COMPANY_NAME ?? "",
      company_industry: AppConfig.APP_COMPANY_INDUSTRY ?? "",
      user_name,
      cloud_provider: body.cloud_provider ?? [],
      tools: body.tools ?? {},
      criteria: body.criteria ?? {},
    });
    return NextResponse.json({ ok });
  } catch (e) {
    console.error("submit failed", e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
