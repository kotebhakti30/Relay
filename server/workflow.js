import { share, redeem, checkIncoming } from "./sharing.js";
import { randomUUID, createHash } from "node:crypto";
import { fail, field, transaction } from "./db.js";
import { issue, verify } from "./session.js";
import { extract } from "./extract.js";
import { askRelay } from "./chat.js";
import { sampleProject, seed } from "./seed.js";
import {
  signup,
  login,
  seedDemoAccount,
  createProject,
  listProjects,
  createInvite,
  acceptInvite,
  getOrgDetails,
  updateOrg,
} from "./auth.js";
import { importGithubIssues } from "./github.js";
import { createQuestion, listQuestions, answerQuestion } from "./clarification.js";
import { computeVersionDiff, detectStaleClaims } from "./diff.js";

async function getProjectMetadata(db, ws) {
  if (ws?.project_id) {
    const res = await db.query("SELECT * FROM projects WHERE id=$1", [ws.project_id]);
    const proj = res.rows[0];
    if (proj) {
      let team = [];
      try {
        team = typeof proj.team_members === "string" ? JSON.parse(proj.team_members) : proj.team_members;
      } catch {}
      return {
        id: proj.id,
        name: proj.name,
        code: proj.code,
        description: proj.description,
        departing: proj.departing_name,
        departingRole: proj.departing_role,
        departingLastDay: proj.departing_last_day,
        incoming: proj.incoming_name,
        incomingRole: proj.incoming_role,
        lead: proj.departing_name,
        people: team && team.length > 0 ? team : sampleProject.people,
        projectId: proj.id,
      };
    }
  }
  return sampleProject;
}

const getActor = (meta, role) =>
  role === "incoming" ? meta.incoming : (meta.lead || meta.departing || "Team Lead");

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
  actorName = null,
) {
  const finalActor = actorName || (role === "incoming" ? sampleProject.incoming : sampleProject.lead);
  await db.query(
    "INSERT INTO audit_log(workspace,actor,type,detail,claim_id,at) VALUES($1,$2,$3,$4,$5,$6)",
    [w, finalActor, type, detail, id, at],
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
    lead = role === "reviewer" || role === "admin",
    v = await versions(db, w, role === "admin" ? "reviewer" : role),
    latest = v.at(-1),
    meta = await getProjectMetadata(db, ws);

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

  const pKey = meta.projectId || meta.id || "campus";
  const p = {
    ...sampleProject,
    ...meta,
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
    incoming: meta.incoming,
    departing: meta.departing,
  };

  return { schema: 1, role: role === "admin" ? "reviewer" : role, projectId: pKey, projects: { [pKey]: p } };
}

async function publish(db, ws, b) {
  const meta = await getProjectMetadata(db, ws);
  const w = ws.id;
  if (b.audience !== meta.incoming || b.confirm !== true)
    fail(400, `Confirm the incoming audience (${meta.incoming}).`);

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
    author: meta.lead || meta.departing || "Team Lead",
    incoming: meta.incoming,
    departing: meta.departing,
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
    "Published version " + id + " for " + meta.incoming + ".",
    null,
    snap.at,
    meta.lead || "Team Lead",
  );
}

export async function request(method, path, header, b, ip) {
  const route = method + " " + path;
  const ipKey = createHash("sha256")
    .update(ip || "unknown")
    .digest("hex");

  // 1. Public / Unauthenticated Auth Routes
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

  if (route === "POST auth/signup") {
    return transaction(async (db) => {
      await limit(db, "signup:" + ipKey, 10);
      return signup({ db, email: b.email, password: b.password, name: b.name, orgName: b.orgName });
    });
  }

  if (route === "POST auth/login") {
    return transaction(async (db) => {
      return login({ db, email: b.email, password: b.password, ipKey });
    });
  }

  if (route === "POST auth/demo-login") {
    return transaction(async (db) => {
      await limit(db, "demo_login:" + ipKey, 20);
      return seedDemoAccount(db);
    });
  }

  if (route === "POST invites/accept") {
    return transaction(async (db) => {
      let authUser = null;
      try {
        authUser = verify(header);
      } catch {}
      if (!authUser?.accountId) {
        fail(401, "Please sign in or create an account to accept this project invitation.");
      }
      return acceptInvite({ db, accountId: authUser.accountId, rawToken: b.token });
    });
  }

  // 2. Authenticated Session Verification
  const auth = verify(header);
  const { role, workspace: w, generation, accountId, orgId } = auth;

  return transaction(async (db) => {
    // Auth profile info
    if (route === "GET auth/me") {
      if (!accountId) {
        return { authenticated: false, isAnonymousWorkspace: Boolean(w), role };
      }
      const acc = (await db.query("SELECT id, email, name FROM accounts WHERE id=$1", [accountId])).rows[0];
      if (!acc) fail(401, "Account not found.");
      const orgs = (
        await db.query(
          "SELECT o.id, o.name, om.role FROM organisations o JOIN org_members om ON om.org_id=o.id WHERE om.account_id=$1 ORDER BY om.created_at ASC",
          [accountId]
        )
      ).rows;
      return {
        authenticated: true,
        user: acc,
        orgs,
        currentOrg: orgs.find((o) => o.id === orgId) || orgs[0] || null,
      };
    }

    if (route === "POST auth/logout") {
      return { ok: true };
    }

    // Projects list / Project creation via Setup Wizard
    if (route === "GET projects") {
      const targetOrg = b.orgId || orgId;
      if (!targetOrg) fail(400, "Organisation ID is required.");
      return listProjects({ db, accountId: accountId || randomUUID(), orgId: targetOrg });
    }

    if (route === "POST projects") {
      const targetOrg = b.orgId || orgId;
      if (!targetOrg) fail(400, "Organisation ID is required.");
      if (!accountId) fail(401, "You must be signed in to create a project.");
      return createProject({ db, accountId, orgId: targetOrg, data: b });
    }

    // Organisation Settings
    if (method === "GET" && path.startsWith("orgs/")) {
      const targetOrgId = path.slice(5);
      if (!accountId) fail(401, "Authentication required.");
      return getOrgDetails({ db, accountId, orgId: targetOrgId });
    }

    if (method === "PATCH" && path.startsWith("orgs/")) {
      const targetOrgId = path.slice(5);
      if (!accountId) fail(401, "Authentication required.");
      return updateOrg({ db, accountId, orgId: targetOrgId, name: b.name });
    }

    // Project Invites creation
    if (method === "POST" && path.includes("/invites")) {
      const projId = path.split("/")[1];
      if (!accountId) fail(401, "Authentication required.");
      return createInvite({
        db,
        accountId,
        projectId: projId,
        role: b.role,
        expiresInHours: b.expiresInHours,
      });
    }

    // Check workspace
    if (!w) {
      fail(400, "No active project workspace selected.");
    }

    const ws = (
      await db.query(
        "SELECT w.* FROM workspaces w LEFT JOIN users u ON u.workspace=w.id WHERE w.id=$1 AND w.active FOR UPDATE OF w",
        [w],
      )
    ).rows[0];

    if (!ws) fail(404, "Workspace unavailable.");

    // Tenant Isolation check: if workspace has org_id, verify authenticated account belongs to org
    if (ws.org_id && accountId) {
      const orgMember = await db.query(
        "SELECT role FROM org_members WHERE org_id=$1 AND account_id=$2",
        [ws.org_id, accountId]
      );
      if (!orgMember.rows.length) {
        fail(403, "Access denied: you do not belong to this organisation.");
      }
    }

    if (role === "incoming") await checkIncoming(db, w, generation);
    if (b.workspace && b.workspace !== w) fail(403, "Workspace mismatch.");

    const meta = await getProjectMetadata(db, ws);
    const actorName = getActor(meta, role);

    // GET requests
    if (method === "GET") {
      if (path === "audit" && role !== "reviewer" && role !== "admin")
        fail(403, "Lead access required.");

      const s = await state(db, ws, role);
      const pKey = meta.projectId || meta.id || "campus";
      const p = s.projects[pKey];

      if (path === "state") return s;
      if (path === "audit") return p.events;
      if (path === "handover") return p.versions.at(-1) || null;
      if (path === "claims") return p.claims;

      if (/^sources\/[^/]+\/permission$/.test(path)) {
        const sourceId = path.split("/")[1];
        const perm = (
          await db.query(
            "SELECT * FROM source_permissions WHERE workspace=$1 AND source_id=$2",
            [w, sourceId]
          )
        ).rows[0];
        return perm || { workspace: w, sourceId, connected_by: "Local import", scope: "manual" };
      }

      if (/^(sources|claims)\/[^/]+$/.test(path)) {
        const [group, id] = path.split("/");
        return (
          (group === "claims" ? p.claims : p.records).find(
            (r) => r.id === id,
          ) || fail(404, "Record unavailable.")
        );
      }

      // Clarification questions list
      if (path === "questions") {
        return listQuestions({ db, workspace: w });
      }

      // Version diffing
      if (path === "versions/diff") {
        const allV = await versions(db, w, role === "admin" ? "reviewer" : role);
        const v1 = allV.find((v) => v.id === Number(b.v1)) || allV.at(-2) || null;
        const v2 = allV.find((v) => v.id === Number(b.v2)) || allV.at(-1) || null;
        return computeVersionDiff(v1, v2, role);
      }

      // Version stale flags
      if (path === "versions/stale") {
        const latestApproved = (await versions(db, w, "reviewer")).at(-1);
        return detectStaleClaims({ db, workspace: w, latestVersion: latestApproved });
      }

      fail(404, "Unknown route.");
    }

    // POST /ask or /chat
    if (route === "POST ask" || route === "POST chat") {
      return await askRelay({
        db,
        w,
        role,
        question: b.question,
        ip: ipKey,
        logFn: (database, workspace, r, type, detail, id, at) =>
          log(database, workspace, r, type, detail, id, at, actorName),
      });
    }

    // Clarification question creation
    if (route === "POST questions") {
      if (role !== "reviewer" && role !== "admin") fail(403, "Lead access required.");
      return createQuestion({
        db,
        workspace: w,
        claimId: b.claimId,
        gapId: b.gapId,
        question: b.question,
        assignedTo: b.assignedTo || meta.departing,
        dueDate: b.dueDate,
        createdBy: actorName,
      });
    }

    // Clarification answer submission
    if (method === "POST" && path.startsWith("questions/") && path.endsWith("/answers")) {
      const qId = path.split("/")[1];
      return answerQuestion({
        db,
        workspace: w,
        questionId: qId,
        answer: b.answer,
        answeredBy: actorName || meta.departing,
      });
    }

    // Incoming role operations
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
            meta.incoming + " acknowledged version " + v.id + ".",
            null,
            new Date().toISOString(),
            meta.incoming,
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
          null,
          new Date().toISOString(),
          meta.incoming,
        );
      } else fail(403, "Lead access required.");
      return { ok: true };
    }

    // Reset workspace
    if (route === "POST reset") {
      await db.query("UPDATE workspaces SET active=false WHERE id=$1", [w]);
      const fresh = await seed(db);
      return { token: issue(fresh, "reviewer") };
    }

    // Sharing / Invite link management
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
            ? "Revoked incoming access."
            : "Regenerated incoming access.",
          null,
          new Date().toISOString(),
          actorName,
        );
      return { sharing: result };
    }

    // GitHub Source Import
    if (route === "POST sources/github") {
      return importGithubIssues({
        db,
        workspace: w,
        repoInput: b.repo,
        issuesJson: b.issuesJson,
        visibility: b.visibility || "all",
        connectedBy: actorName,
      });
    }

    // Normal Text / Note Source Import
    if (route === "POST sources") {
      const text = field(b.text, 8000),
        title = field(b.title || "Imported meeting note", 120);
      if (!["all", "lead_only"].includes(b.visibility))
        fail(400, "Invalid visibility.");
      const size = await db.query(
        "SELECT count(*)::int AS n, sum(length(text))::int AS chars FROM source_records WHERE workspace=$1",
        [w],
      );
      if (size.rows[0].n >= 50 || size.rows[0].chars + text.length > 50000)
        fail(409, "Workspace source limit reached.");
      const id = randomUUID();
      await db.query(
        "INSERT INTO source_records VALUES($1,$2,$3,'notes','Reviewer',now(),$4,$5)",
        [w, id, title, text, b.visibility],
      );
      await db.query("UPDATE workspaces SET dirty=true WHERE id=$1", [w]);
      await log(db, w, role, "Imported", title, null, new Date().toISOString(), actorName);
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
      for (const msg of warnings) await log(db, w, role, "Extraction", msg, null, new Date().toISOString(), actorName);
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
        null,
        new Date().toISOString(),
        actorName,
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
        actor: actorName,
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
        actorName,
      );
    } else if (route === "POST versions") {
      if (ws.dirty) fail(409, "Reconstruct changed sources first.");
      await publish(db, ws, b);
    } else fail(404, "Unknown route.");

    return { ok: true };
  });
}
