import { createHmac, randomBytes, createHash } from "node:crypto";
import { fail } from "./db.js";
import { issue } from "./session.js";
const hash = (s) => createHash("sha256").update(s).digest("hex");
function credentials(nonce) {
  const derive = (purpose) =>
    createHmac("sha256", process.env.SESSION_SECRET)
      .update(purpose + ":" + nonce)
      .digest("hex");
  return {
    link: derive("incoming link"),
    code: derive("incoming code").slice(0, 12).toUpperCase(),
  };
}
// Existing deployed workspaces can be upgraded without access to their Neon credentials.
export async function ensureSharing(db) {
  if (
    (await db.query("SELECT to_regclass('relay_shares') AS present")).rows[0]
      .present
  )
    return;
  await db.query("SELECT pg_advisory_xact_lock(704431987)");
  await db.query(
    "CREATE TABLE IF NOT EXISTS relay_shares(workspace uuid PRIMARY KEY REFERENCES workspaces, generation text NOT NULL, link_hash text UNIQUE, code_hash text UNIQUE, active boolean NOT NULL)",
  );
}
export async function share(db, w, action = "get") {
  await ensureSharing(db);
  let row = (
    await db.query("SELECT * FROM relay_shares WHERE workspace=$1", [w])
  ).rows[0];
  if (action === "revoke") {
    await db.query(
      "UPDATE relay_shares SET active=false,link_hash=null,code_hash=null WHERE workspace=$1",
      [w],
    );
    return null;
  }
  if (!row || action === "regenerate") {
    const generation = randomBytes(32).toString("hex");
    const pair = credentials(generation);
    await db.query(
      "INSERT INTO relay_shares VALUES ($1,$2,$3,$4,true) ON CONFLICT(workspace) DO UPDATE SET generation=$2,link_hash=$3,code_hash=$4,active=true",
      [w, generation, hash(pair.link), hash(pair.code)],
    );
    return pair;
  }
  return row.active ? credentials(row.generation) : null;
}
export async function redeem(db, b) {
  await ensureSharing(db);
  const isCode = typeof b.code === "string",
    value = isCode ? b.code.trim().toUpperCase() : b.link;
  if (
    typeof value !== "string" ||
    !(isCode ? /^[0-9A-F]{12}$/ : /^[a-f0-9]{64}$/).test(value)
  )
    fail(403, "Invalid or revoked access.");
  const row = (
    await db.query(
      "SELECT s.workspace,s.generation FROM relay_shares s JOIN workspaces w ON w.id=s.workspace WHERE s.active AND w.active AND " +
        (isCode ? "s.code_hash" : "s.link_hash") +
        "=$1",
      [hash(value)],
    )
  ).rows[0];
  if (!row) fail(403, "Invalid or revoked access.");
  return { token: issue(row.workspace, "incoming", row.generation) };
}
export async function checkIncoming(db, w, generation) {
  await ensureSharing(db);
  if (
    !generation ||
    !(
      await db.query(
        "SELECT 1 FROM relay_shares WHERE workspace=$1 AND generation=$2 AND active",
        [w, generation],
      )
    ).rowCount
  )
    fail(
      403,
      "This incoming session expired or was revoked. Open the current invitation.",
    );
}
