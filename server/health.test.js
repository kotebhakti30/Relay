import test from "node:test";
import assert from "node:assert/strict";
import { checkHealth } from "./health.js";

test("Health check endpoint returns database status, migration status, and safe env list", async () => {
  const result = await checkHealth();
  assert.ok(result, "Health check should return a result object");
  assert.ok(result.status === "ok" || result.status === "degraded", "Status should be ok or degraded");
  assert.ok(typeof result.database === "string", "Database should be a string");
  assert.ok(typeof result.migration === "string", "Migration should be a string");
  assert.ok(Array.isArray(result.env), "Env should be an array of variable names");

  // Verify that env array contains ONLY variable names and NEVER secret values
  for (const item of result.env) {
    assert.match(item, /^[A-Z0-9_]+$/, `Item in env array must be an environment variable name: ${item}`);
    assert.ok(!item.includes("postgres:"), "Env list must not contain connection strings or secrets");
    assert.ok(!item.includes("http"), "Env list must not contain URLs or secrets");
  }
});
