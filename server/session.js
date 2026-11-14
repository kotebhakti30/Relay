import { createHmac, timingSafeEqual } from "node:crypto";
import { fail } from "./db.js";
function signature(data) {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32)
    fail(503, "Server setup incomplete: configure SESSION_SECRET.");
  return createHmac("sha256", secret).update(data).digest("base64url");
}
export function issue(workspace, role, generation, extra = {}) {
  const data = Buffer.from(
    JSON.stringify({
      workspace,
      role,
      generation,
      ...extra,
      exp: Date.now() + 7 * 86400000,
    }),
  ).toString("base64url");
  return data + "." + signature(data);
}
export function verify(header) {
  const [data, mac, ...extra] = String(header || "")
    .replace(/^Bearer /, "")
    .split(".");
  if (!data || !mac || extra.length || mac.length !== 43)
    fail(401, "A valid workspace link is required.");
  const expected = Buffer.from(signature(data));
  const supplied = Buffer.from(mac);
  if (
    supplied.length !== expected.length ||
    !timingSafeEqual(supplied, expected)
  )
    fail(401, "Invalid session signature.");
  const auth = JSON.parse(Buffer.from(data, "base64url").toString());
  if (auth.exp < Date.now())
    fail(401, "Workspace link expired. Start a new workspace.");
  return auth;
}
