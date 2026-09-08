import { NextResponse } from "next/server";
import { headers as nextHeaders } from "next/headers";
import { AppConfig } from "@/lib/config";
import {
  TOOL_CATEGORIES_MAPPING,
  CLOUD_PROVIDERS,
  CLOUD_PROVIDERS_STANDARD,
} from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function GET() {
  const hdrs = await nextHeaders();
  const user_name =
    hdrs.get("x-forwarded-email") ??
    hdrs.get("x-forwarded-user") ??
    AppConfig.LOCAL_DEV_USER ??
    "";

  return NextResponse.json({
    tool_categories: TOOL_CATEGORIES_MAPPING,
    cloud_providers: CLOUD_PROVIDERS,
    cloud_providers_standard: CLOUD_PROVIDERS_STANDARD,
    is_development: AppConfig.DEV_MOCK_DATABASE,
    company_name: AppConfig.APP_COMPANY_NAME ?? "",
    user_name,
  });
}
