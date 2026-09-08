import { NextResponse } from "next/server";
import { getUserInfo } from "@/lib/auth/user";

/**
 * GET /api/user
 * Returns the current user's email from Databricks Apps proxy headers.
 */
export async function GET() {
  const { email, name } = await getUserInfo();

  return NextResponse.json({
    email,
    name,
    source: email
      ? process.env.MAS_LOCAL_USER_EMAIL
        ? "env"
        : "proxy"
      : "none",
  });
}
