import { share, redeem, checkIncoming } from "./sharing.js";
import { randomUUID, createHash } from "node:crypto";
import { fail, field, transaction } from "./db.js";
import { issue, verify } from "./session.js";
import { extract } from "./extract.js";
import { seed } from "./seed.js";
const actor = (role) => (role === "incoming" ? "Neha" : "Riya");
function source(r) {
  return {
    id: r.id,
    title: r.title,
    type: r.type,
    author: r.author,
    timestamp: r.recorded_at,
    reference: r.id,
    access: r.visibility === "all" ? "team" : "reviewer",
    content: r.text,
    entities: [],
  };
}
export function permitted(c) {
  return !c.restricted && ["Accepted", "Unresolved"].includes(c.review);
}
async function log(
  db,
  w,
  role,
  type,
  detail,
  id = null,
  at = new Date().toISOString(),
) {
  await db.query(
    "INSERT INTO audit_log(workspace,actor,type,detail,claim_id,at) VALUES($1,$2,$3,$4,$5,$6)",
    [w, actor(role), type, detail, id, at],
  );
}
async function limit(db, bucket, max) {
  const minute_bucket = Math.floor(Date.now() / 60000);
  const { rows } = await db.query(
    "INSERT INTO rate_limits VALUES($1,$2,1) ON CONFLICT(bucket,minute_bucket) DO UPDATE SET hits=rate_limits.hits+1 RETURNING hits",
    [bucket, minute_bucket],
  );
  if (rows[0].hits > max)
    fail(429, "Too many requests. Try again in one minute.");
  await db.query("DELETE FROM rate_limits WHERE minute_bucket<$1", [
    minute_bucket - 2,
  ]);
}
async function versions(db, w, role) {
  const order = role === "incoming" ? "DESC LIMIT 1" : "ASC";
  const rows = (
    await db.query(
      "SELECT v.snapshot,a.at AS receipt FROM handover_versions v LEFT JOIN acknowledgements a ON a.workspace=v.workspace AND a.version=v.id WHERE v.workspace=$1 AND v.audience='incoming' ORDER BY v.id " +
        order,
      [w],
    )
  ).rows;
  return rows.map((r) => ({
    ...r.snapshot,
    acknowledged: r.receipt || undefined,
  }));
}
async function state(db, ws, role) {
  const w = ws.id,
    lead = role === "reviewer",
    v = await versions(db, w, role),
    latest = v.at(-1);
  const records = lead
    ? (
        await db.query(
          "SELECT * FROM source_records WHERE workspace=$1 ORDER BY recorded_at,id",
          [w],
        )
      ).rows.map(source)
    : latest?.records || [];
  const claims = lead
    ? (
        await db.query(
          "SELECT data FROM claims WHERE workspace=$1 ORDER BY id",
          [w],
        )
      ).rows.map((r) => r.data)
    : latest?.claims || [];
  const reviews = lead
    ? (
        await db.query(
          "SELECT data FROM review_actions WHERE workspace=$1 ORDER BY id DESC",
          [w],
        )
      ).rows.map((r) => r.data)
    : [];
  const events = lead
    ? (
        await db.query(
          'SELECT id,type,detail,at,actor,claim_id AS "claimId" FROM audit_log WHERE workspace=$1 ORDER BY id DESC',
          [w],
        )
      ).rows
    : [];
  const tasks = latest
    ? (
        await db.query(
          "SELECT id,note,done FROM tasks WHERE workspace=$1 AND version=$2",
          [w, latest.id],
        )
      ).rows
    : [];
  const p = {
    sharing: lead && latest ? await share(db, w) : undefined,
    records,
    connections: [...new Set(records.map((r) => r.type))],
    restrictedEnabled: lead,
    claims,
    resolvedGaps: [...new Set(reviews.map((r) => r.gapId).filter(Boolean))],
    reviews,
    events,
    versions: v,
    tasks: Object.fromEntries(tasks.map((t) => [latest.id + ":" + t.id, t])),
    run: ws.run,
    dirty: lead && ws.dirty,
    incoming: "Neha",
    departing: "Aarav",
  };
  return { schema: 1, role, projectId: "campus", projects: { campus: p } };
}
async function publish(db, w, b) {
  if (b.audience !== "Neha" || b.confirm !== true)
    fail(400, "Confirm the incoming audience.");
  const drafts = (
    await db.query("SELECT data FROM claims WHERE workspace=$1 ORDER BY id", [
      w,
    ])
  ).rows.map((r) => r.data);
  if (!drafts.length || drafts.some((c) => c.review === "Pending Review"))
    fail(409, "Review every candidate first.");
  if (
    drafts.some(
      (c) =>
        c.review === "Accepted" && c.evidence !== "Supported" && !c.resolution,
    )
  )
    fail(409, "Record a verification outcome for uncertain claims.");
  const claims = drafts.filter(permitted);
  const refs = [...new Set(claims.flatMap((c) => c.refs))];
  const records = (
    await db.query(
      "SELECT * FROM source_records WHERE workspace=$1 AND visibility='all' AND id=ANY($2) ORDER BY id",
      [w, refs],
    )
  ).rows.map(source);
  if (!claims.length || records.length !== refs.length)
    fail(409, "No permitted handover or inconsistent references.");
  const prior = (await versions(db, w, "reviewer")).at(-1);
  if (prior && JSON.stringify(prior.claims) === JSON.stringify(claims)) return;
  const id = (prior?.id || 0) + 1;
  const snap = {
    id,
    claims,
    records,
    at: new Date().toISOString(),
    audience: "Incoming Developer",
    author: "Riya",
    incoming: "Neha",
    departing: "Aarav",
  };
  await db.query("INSERT INTO handover_versions VALUES($1,$2,'incoming',$3)", [
    w,
    id,
    snap,
  ]);
  for (const c of claims)
    await db.query("INSERT INTO tasks(workspace,version,id) VALUES($1,$2,$3)", [
      w,
      id,
      c.id,
    ]);
  await log(
    db,
    w,
    "reviewer",
    "Approved",
    "Published version " + id + " for Neha.",
  );
}
export async function request(method, path, header, b, ip) {
  const route = method + " " + path;
  const ipKey = createHash("sha256")
    .update(ip || "unknown")
    .digest("hex");
  if (route === "POST workspaces")
    return transaction(async (db) => {
      await limit(db, "create:" + ipKey, 30);
      const w = await seed(db);
      return { token: issue(w, "reviewer") };
    });
  if (route === "POST redeem") {
    await transaction((db) => limit(db, "redeem:" + ipKey, 30));
    return transaction((db) => redeem(db, b));
  }
  const { role, workspace: w, generation } = verify(header);
  return transaction(async (db) => {
    const ws = (
      await db.query(
        "SELECT w.* FROM workspaces w JOIN users u ON u.workspace=w.id WHERE w.id=$1 AND u.role=$2 AND w.active FOR UPDATE OF w",
        [w, role],
      )
    ).rows[0];
    if (role === "incoming") await checkIncoming(db, w, generation);
    if (!ws) fail(404, "Workspace unavailable.");
    if (b.workspace && b.workspace !== w) fail(403, "Workspace mismatch.");
    if (method === "GET") {
      if (path === "audit" && role !== "reviewer")
        fail(403, "Lead access required.");
      const s = await state(db, ws, role);
      const p = s.projects.campus;
      if (path === "state") return s;
      if (path === "audit") return p.events;
      if (path === "handover") return p.versions.at(-1) || null;
      if (path === "claims") return p.claims;
      if (/^(sources|claims)\/[^/]+$/.test(path)) {
        const [group, id] = path.split("/");
        return (
          (group === "claims" ? p.claims : p.records).find(
            (r) => r.id === id,
          ) || fail(404, "Record unavailable.")
        );
      }
      fail(404, "Unknown route.");
    }
    if (role === "incoming") {
      const v = (await versions(db, w, role)).at(-1);
      if (!v) fail(403, "No approved handover.");
      if (route === "POST acknowledge") {
        if (b.version !== v.id) fail(409, "Reload the latest handover.");
        const ack = await db.query(
          "INSERT INTO acknowledgements(workspace,version) VALUES($1,$2) ON CONFLICT DO NOTHING",
          [w, v.id],
        );
        if (ack.rowCount)
          await log(
            db,
            w,
            role,
            "Acknowledged",
            "Neha acknowledged version " + v.id + ".",
          );
      } else if (method === "POST" && path.startsWith("tasks/")) {
        const [version, id] = path.slice(6).split(":");
        if (Number(version) !== v.id) fail(404, "Unknown task.");
        if (b.done !== undefined && typeof b.done !== "boolean")
          fail(400, "Invalid completion value.");
        const note = b.note === undefined ? null : field(b.note, 2000, true);
        const changed = await db.query(
          "UPDATE tasks SET done=coalesce($4,done),note=coalesce($5,note) WHERE workspace=$1 AND version=$2 AND id=$3",
          [w, v.id, id, b.done ?? null, note],
        );
        if (!changed.rowCount) fail(404, "Unknown task.");
        await log(
          db,
          w,
          role,
          "Task updated",
          "Updated first-week task " + id + ".",
        );
      } else fail(403, "Lead access required.");
      return { ok: true };
    }
    if (route === "POST reset") {
      await db.query("UPDATE workspaces SET active=false WHERE id=$1", [w]);
      const fresh = await seed(db);
      return { token: issue(fresh, "reviewer") };
    }
    if (route === "POST invite") {
      if (!(await versions(db, w, role)).length)
        fail(409, "Approve a handover first.");
      const action = b.action || "get";
      if (!["get", "regenerate", "revoke"].includes(action))
        fail(400, "Unknown sharing action.");
      const result = await share(db, w, action);
      if (action !== "get")
        await log(
          db,
          w,
          role,
          "Sharing",
          action === "revoke"
            ? "Revoked Neha’s access."
            : "Regenerated Neha’s access.",
        );
      return { sharing: result };
    }
    if (route === "POST sources") {
      const text = field(b.text, 8000),
        title = field(b.title || "Imported meeting note", 120);
      if (!["all", "lead_only"].includes(b.visibility))
        fail(400, "Invalid visibility.");
      const size = await db.query(
        "SELECT count(*)::int AS n, sum(length(text))::int AS chars FROM source_records WHERE workspace=$1",
        [w],
      );
      if (size.rows[0].n >= 30 || size.rows[0].chars + text.length > 40000)
        fail(409, "Workspace source limit reached.");
      const id = randomUUID();
      await db.query(
        "INSERT INTO source_records VALUES($1,$2,$3,'notes','Reviewer',now(),$4,$5)",
        [w, id, title, text, b.visibility],
      );
      await db.query("UPDATE workspaces SET dirty=true WHERE id=$1", [w]);
      await log(db, w, role, "Imported", title);
    } else if (route === "POST reconstruct") {
      await limit(db, "workspace:" + w, 5);
      await limit(db, "extract:" + ipKey, 15);

      const records = (
        await db.query(
          "SELECT * FROM source_records WHERE workspace=$1 ORDER BY recorded_at,id",
          [w],
        )
      ).rows;
      const prior = (
        await db.query("SELECT data FROM claims WHERE workspace=$1", [w])
      ).rows.map((r) => r.data);
      const { claims, warnings } = await extract(records, prior);
      for (const msg of warnings) await log(db, w, role, "Extraction", msg);
      await db.query("DELETE FROM claims WHERE workspace=$1", [w]);
      for (let c of claims) {
        await db.query("INSERT INTO claims VALUES($1,$2,$3)", [w, c.id, c]);
        for (const id of c.refs)
          await db.query("INSERT INTO evidence_links VALUES($1,$2,$3,$4)", [
            w,
            c.id,
            id,
            c.quotes[id],
          ]);
      }
      await db.query(
        "UPDATE workspaces SET run=run+1,dirty=false WHERE id=$1",
        [w],
      );
      await log(
        db,
        w,
        role,
        "Reconstructed",
        claims.length + " cited candidates.",
      );
    } else if (method === "PATCH" && path.startsWith("claims/")) {
      const id = path.slice(7);
      const before = (
        await db.query("SELECT data FROM claims WHERE workspace=$1 AND id=$2", [
          w,
          id,
        ])
      ).rows[0]?.data;
      if (!before) fail(404, "Claim unavailable.");
      if (!["Accepted", "Rejected", "Unresolved"].includes(b.review))
        fail(400, "Choose a review decision.");
      const after = {
        ...before,
        statement: field(b.statement, 2000),
        owner: field(b.owner, 100),
        review: b.review,
        note: field(b.note, 2000),
        resolution: field(b.resolution ?? "", 2000, true),
      };
      const action = {
        id: randomUUID(),
        claimId: id,
        before,
        after,
        at: new Date().toISOString(),
        actor: "Riya",
        reason: after.note,
        gapId: b.gapId === "gap-" + id ? b.gapId : null,
      };
      await db.query("UPDATE claims SET data=$3 WHERE workspace=$1 AND id=$2", [
        w,
        id,
        after,
      ]);
      await db.query(
        "INSERT INTO review_actions(workspace,data) VALUES($1,$2)",
        [w, action],
      );
      await log(
        db,
        w,
        role,
        "Review",
        after.review + ": " + after.statement,
        id,
        action.at,
      );
    } else if (route === "POST versions") {
      if (ws.dirty) fail(409, "Reconstruct changed sources first.");
      await publish(db, w, b);
    } else fail(404, "Unknown route.");
    return { ok: true };
  });
}
