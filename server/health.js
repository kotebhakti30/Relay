import { database } from "./db.js";

const KNOWN_VARS = [
  "DATABASE_URL",
  "SESSION_SECRET",
  "LLM_API_KEY",
  "LLM_PROVIDER",
  "GEMINI_MODEL",
  "PORT",
  "NODE_ENV",
  "VERCEL",
  "VERCEL_ENV",
];

const REQUIRED_TABLES = [
  "workspaces",
  "accounts",
  "organisations",
  "claims",
  "handover_versions",
  "audit_log",
];

export async function checkHealth() {
  const envVarsSet = KNOWN_VARS.filter((name) => Boolean(process.env[name]));
  let dbStatus = "unreachable";
  let migrationStatus = "unknown";
  let isHealthy = true;

  try {
    const db = database();
    await db.query("SELECT 1 AS ok");
    dbStatus = "reachable";

    const res = await db.query(
      `SELECT table_name FROM information_schema.tables 
       WHERE table_schema = 'public' 
       AND table_name = ANY($1::text[])`,
      [REQUIRED_TABLES]
    );

    const existingTables = new Set(res.rows.map((r) => r.table_name));
    const missingTables = REQUIRED_TABLES.filter((t) => !existingTables.has(t));

    if (missingTables.length === 0) {
      migrationStatus = "up to date";
    } else {
      migrationStatus = `incomplete (missing: ${missingTables.join(", ")})`;
      isHealthy = false;
    }
  } catch (err) {
    dbStatus = `unreachable (${err.message})`;
    isHealthy = false;
  }

  return {
    status: isHealthy ? "ok" : "degraded",
    database: dbStatus,
    migration: migrationStatus,
    env: envVarsSet,
    timestamp: new Date().toISOString(),
  };
}
