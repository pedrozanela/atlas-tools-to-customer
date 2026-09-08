import "server-only";

/**
 * Mint a service-principal OAuth token (M2M client_credentials).
 *
 * Forwarded user OAuth tokens are deliberately narrow and miss the
 * scopes most workspace APIs require (sql, model-serving, workspace).
 * The app SP credentials (DATABRICKS_CLIENT_ID/SECRET, injected by the
 * Databricks App runtime) mint a broader token via /oidc/v1/token.
 *
 * Cached in-process until ~30 s before expiry.
 */

let cached: { token: string; expiresAt: number } | null = null;

interface TokenResponse {
  access_token: string;
  expires_in: number;
}

export async function getServicePrincipalToken(host: string): Promise<string> {
  const now = Date.now();
  if (cached && cached.expiresAt > now + 30_000) {
    return cached.token;
  }

  const clientId = process.env.DATABRICKS_CLIENT_ID;
  const clientSecret = process.env.DATABRICKS_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error(
      "DATABRICKS_CLIENT_ID/SECRET are not set. The app's service " +
        "principal credentials are required — they should be injected " +
        "automatically by the Databricks App runtime.",
    );
  }

  const tokenUrl = `${host.replace(/\/$/, "")}/oidc/v1/token`;
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    scope: "all-apis",
  });

  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      Authorization:
        "Basic " +
        Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "(unreadable)");
    throw new Error(`SP token mint failed (${res.status}): ${txt}`);
  }
  const json = (await res.json()) as TokenResponse;
  cached = {
    token: json.access_token,
    expiresAt: now + (json.expires_in ?? 3600) * 1000,
  };
  return cached.token;
}
