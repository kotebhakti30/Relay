import { request } from "../server/workflow.js";
import { checkHealth } from "../server/health.js";
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("Referrer-Policy", "no-referrer");
  try {
    const url = new URL(req.url, "http://localhost");
    const path =
      url.searchParams.get("route") ||
      url.searchParams.get("action") ||
      url.pathname.replace(/^\/api\//, "");

    if (path === "health") {
      const health = await checkHealth();
      return res.status(health.status === "ok" ? 200 : 503).json(health);
    }
    let body = req.body ?? {};
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {
        return res.status(400).json({ error: "Invalid JSON." });
      }
    }
    if (
      !body ||
      typeof body !== "object" ||
      Array.isArray(body) ||
      JSON.stringify(body).length > 12000
    )
      return res.status(400).json({ error: "Invalid request body." });
    const ip = String(
      req.headers["x-vercel-forwarded-for"] ||
        req.socket?.remoteAddress ||
        "unknown",
    ).split(",")[0];
    let authHeader = req.headers.authorization;
    if (!authHeader && req.headers.cookie) {
      const match = req.headers.cookie.match(/(?:^|;\s*)relay_session=([^;]+)/);
      if (match) {
        authHeader = "Bearer " + decodeURIComponent(match[1]);
      }
    }

    const result = await request(
      req.method,
      path,
      authHeader,
      body,
      ip,
    );

    if (result && result.token) {
      res.setHeader(
        "Set-Cookie",
        `relay_session=${encodeURIComponent(result.token)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=604800`
      );
    } else if (path === "auth/logout") {
      res.setHeader(
        "Set-Cookie",
        "relay_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0"
      );
    }

    return res.status(200).json(result);
  } catch (e) {
    return res
      .status(e.status || 503)
      .json({
        error: e.status
          ? e.message
          : "Database unavailable. Check DATABASE_URL and run the schema migration, then retry.",
      });
  }
}
