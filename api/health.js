import { checkHealth } from "../server/health.js";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  res.setHeader("Content-Type", "application/json");

  try {
    const health = await checkHealth();
    const statusCode = health.status === "ok" ? 200 : 503;
    return res.status(statusCode).json(health);
  } catch (err) {
    return res.status(503).json({
      status: "error",
      database: "unreachable",
      migration: "unknown",
      error: err.message,
      env: [],
      timestamp: new Date().toISOString(),
    });
  }
}
