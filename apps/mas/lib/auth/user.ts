import "server-only";
import { headers } from "next/headers";

/**
 * Get the current user's email from Databricks Apps proxy headers.
 *
 * Resolution order:
 * 1. x-forwarded-email header (set by Databricks Apps proxy)
 * 2. x-forwarded-preferred-username header (fallback)
 * 3. MAS_LOCAL_USER_EMAIL env var (for local development)
 *
 * @returns The user's email or null if not available
 */
export async function getUserEmail(): Promise<string | null> {
  try {
    const hdrs = await headers();
    const email =
      hdrs.get("x-forwarded-email") ??
      hdrs.get("x-forwarded-preferred-username");
    if (email) return email;
  } catch {
    // Outside of request context or headers unavailable
  }
  return process.env.MAS_LOCAL_USER_EMAIL ?? null;
}

/**
 * Get user info including email and display name.
 *
 * @returns Object with email and optional name
 */
export async function getUserInfo(): Promise<{
  email: string | null;
  name: string | null;
}> {
  try {
    const hdrs = await headers();
    const email =
      hdrs.get("x-forwarded-email") ??
      hdrs.get("x-forwarded-preferred-username");
    const name = hdrs.get("x-forwarded-name") ?? null;

    if (email) {
      return { email, name };
    }
  } catch {
    // Outside of request context
  }

  return {
    email: process.env.MAS_LOCAL_USER_EMAIL ?? null,
    name: null,
  };
}
