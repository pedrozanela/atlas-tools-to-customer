import assert from "node:assert/strict";
import test from "node:test";

import { requireSecretKeys } from "./deploy-secret-preflight.mjs";

test("checks secret metadata with the explicit profile and no value API", () => {
  const calls = [];
  const result = requireSecretKeys({
    profile: "adb-sa-latam",
    requirements: [
      { scope: "atlas-app", key: "lakebase-atlas-admin-password" },
      { scope: "atlas-app", key: "certifica-jwt-secret" },
      { scope: "atlas-app", key: "certifica-seed-admin-password" },
    ],
    execFile(command, args) {
      calls.push([command, args]);
      return JSON.stringify([
        { key: "lakebase-atlas-admin-password", last_updated_timestamp: 1 },
        { key: "certifica-jwt-secret", last_updated_timestamp: 1 },
        { key: "certifica-seed-admin-password", last_updated_timestamp: 2 },
      ]);
    },
  });

  assert.deepEqual(result, { scopesChecked: 1, keysChecked: 3 });
  assert.deepEqual(calls, [[
    "databricks",
    [
      "secrets",
      "list-secrets",
      "atlas-app",
      "--profile",
      "adb-sa-latam",
      "--output",
      "json",
    ],
  ]]);
});

test("fails closed when a required secret key is absent", () => {
  assert.throws(
    () => requireSecretKeys({
      profile: "adb-sa-latam",
      requirements: [
        { scope: "atlas-app", key: "certifica-jwt-secret" },
        { scope: "atlas-app", key: "certifica-seed-admin-password" },
      ],
      execFile: () => JSON.stringify([{ key: "certifica-jwt-secret" }]),
    }),
    /atlas-app\/certifica-seed-admin-password/,
  );
});

test("requires an explicit profile before invoking the CLI", () => {
  let invoked = false;
  assert.throws(
    () => requireSecretKeys({
      profile: "",
      requirements: [{ scope: "atlas-app", key: "certifica-jwt-secret" }],
      execFile: () => {
        invoked = true;
        return "[]";
      },
    }),
    /explicit Databricks profile/,
  );
  assert.equal(invoked, false);
});
