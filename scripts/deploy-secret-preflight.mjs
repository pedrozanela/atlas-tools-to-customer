import { execFileSync } from "node:child_process";

function secretKeysFromCli(raw) {
  const parsed = JSON.parse(String(raw));
  const entries = Array.isArray(parsed) ? parsed : parsed?.secrets;
  if (!Array.isArray(entries)) {
    throw new Error("unexpected response from `databricks secrets list-secrets`");
  }
  return new Set(
    entries
      .map((entry) => entry?.key)
      .filter((key) => typeof key === "string" && key.length > 0),
  );
}

/**
 * Verify secret metadata without ever reading or printing secret values.
 * Requirements are grouped by scope so each scope is listed only once.
 */
export function requireSecretKeys({
  profile,
  requirements,
  execFile = execFileSync,
}) {
  if (!profile) throw new Error("an explicit Databricks profile is required");

  const byScope = new Map();
  for (const requirement of requirements) {
    const scope = String(requirement?.scope ?? "").trim();
    const key = String(requirement?.key ?? "").trim();
    if (!scope || !key) {
      throw new Error("required secret scope/key is not configured");
    }
    const keys = byScope.get(scope) ?? new Set();
    keys.add(key);
    byScope.set(scope, keys);
  }

  const missing = [];
  for (const [scope, requiredKeys] of byScope) {
    const raw = execFile(
      "databricks",
      ["secrets", "list-secrets", scope, "--profile", profile, "--output", "json"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] },
    );
    const existingKeys = secretKeysFromCli(raw);
    for (const key of requiredKeys) {
      if (!existingKeys.has(key)) missing.push(`${scope}/${key}`);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `missing required Databricks secrets: ${missing.join(", ")}. ` +
        "Create them before deploying; this preflight checks metadata only and never reads values.",
    );
  }

  return { scopesChecked: byScope.size, keysChecked: requirements.length };
}
