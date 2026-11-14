import bcrypt from "bcryptjs";
import { randomUUID, createHash } from "node:crypto";
import { fail, field } from "./db.js";
import { issue } from "./session.js";
import { sampleProject, seed } from "./seed.js";

export const DEMO_CREDENTIALS = {
  email: "demo@relay.local",
  password: "DemoUser2026!",
  name: "Riya Sharma",
  orgName: "CampusConnect Engineering",
};

export async function hashPassword(password) {
  if (!password || typeof password !== "string" || password.length < 8) {
    fail(400, "Password must be at least 8 characters long.");
  }
  return await bcrypt.hash(password, 10);
}

export async function verifyPassword(password, hash) {
  if (!password || !hash) return false;
  return await bcrypt.compare(password, hash);
}

export function validateEmail(email) {
  const clean = String(email || "").trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!clean || !emailRegex.test(clean) || clean.length > 254) {
    fail(400, "Please provide a valid email address.");
  }
  return clean;
}

export async function signup({ db, email, password, name, orgName }) {
  const cleanEmail = validateEmail(email);
  const cleanName = field(name || "Team Member", 100);
  const cleanOrg = field(orgName || "My Organisation", 100);
  const passwordHash = await hashPassword(password);

  const existing = await db.query("SELECT id FROM accounts WHERE email=$1", [cleanEmail]);
  if (existing.rows.length > 0) {
    fail(409, "An account with this email already exists.");
  }

  const accountId = randomUUID();
  const orgId = randomUUID();

  await db.query(
    "INSERT INTO accounts(id, email, password_hash, name) VALUES($1, $2, $3, $4)",
    [accountId, cleanEmail, passwordHash, cleanName]
  );

  await db.query(
    "INSERT INTO organisations(id, name, created_by) VALUES($1, $2, $3)",
    [orgId, cleanOrg, accountId]
  );

  await db.query(
    "INSERT INTO org_members(org_id, account_id, role) VALUES($1, $2, 'admin')",
    [orgId, accountId]
  );

  const token = issue(null, "admin", undefined, {
    accountId,
    email: cleanEmail,
    name: cleanName,
    orgId,
  });

  return {
    token,
    user: { id: accountId, email: cleanEmail, name: cleanName },
    org: { id: orgId, name: cleanOrg, role: "admin" },
  };
}

export async function login({ db, email, password, ipKey }) {
  const cleanEmail = validateEmail(email);
  if (!password) fail(400, "Password is required.");

  // Rate limiting check
  const minute_bucket = Math.floor(Date.now() / 60000);
  const rateKey = "login:" + ipKey + ":" + cleanEmail;
  const { rows: rateRows } = await db.query(
    "INSERT INTO rate_limits VALUES($1, $2, 1) ON CONFLICT(bucket, minute_bucket) DO UPDATE SET hits=rate_limits.hits+1 RETURNING hits",
    [rateKey, minute_bucket]
  );
  if (rateRows[0].hits > 5) {
    fail(429, "Too many login attempts. Please wait one minute before trying again.");
  }

  const accRes = await db.query(
    "SELECT id, email, password_hash, name FROM accounts WHERE email=$1",
    [cleanEmail]
  );
  const account = accRes.rows[0];
  if (!account) {
    fail(401, "Invalid email or password.");
  }

  const valid = await verifyPassword(password, account.password_hash);
  if (!valid) {
    fail(401, "Invalid email or password.");
  }

  const orgsRes = await db.query(
    "SELECT o.id, o.name, om.role FROM organisations o JOIN org_members om ON om.org_id=o.id WHERE om.account_id=$1 ORDER BY om.created_at ASC",
    [account.id]
  );

  const defaultOrg = orgsRes.rows[0] || null;

  const token = issue(null, defaultOrg?.role || "member", undefined, {
    accountId: account.id,
    email: account.email,
    name: account.name,
    orgId: defaultOrg?.id,
  });

  return {
    token,
    user: { id: account.id, email: account.email, name: account.name },
    orgs: orgsRes.rows,
    currentOrg: defaultOrg,
  };
}

export async function seedDemoAccount(db) {
  const cleanEmail = DEMO_CREDENTIALS.email;
  let account = (await db.query("SELECT * FROM accounts WHERE email=$1", [cleanEmail])).rows[0];

  if (!account) {
    const accountId = randomUUID();
    const passwordHash = await bcrypt.hash(DEMO_CREDENTIALS.password, 10);
    await db.query(
      "INSERT INTO accounts(id, email, password_hash, name) VALUES($1, $2, $3, $4)",
      [accountId, cleanEmail, passwordHash, DEMO_CREDENTIALS.name]
    );
    account = { id: accountId, email: cleanEmail, name: DEMO_CREDENTIALS.name };
  }

  // Ensure Demo Org exists
  let org = (
    await db.query(
      "SELECT o.id, o.name FROM organisations o JOIN org_members om ON om.org_id=o.id WHERE om.account_id=$1 LIMIT 1",
      [account.id]
    )
  ).rows[0];

  if (!org) {
    const orgId = randomUUID();
    await db.query(
      "INSERT INTO organisations(id, name, created_by) VALUES($1, $2, $3)",
      [orgId, DEMO_CREDENTIALS.orgName, account.id]
    );
    await db.query(
      "INSERT INTO org_members(org_id, account_id, role) VALUES($1, $2, 'admin')",
      [orgId, account.id]
    );
    org = { id: orgId, name: DEMO_CREDENTIALS.orgName };
  }

  // Ensure Demo Project exists with seeded workspace
  let project = (
    await db.query("SELECT * FROM projects WHERE org_id=$1 LIMIT 1", [org.id])
  ).rows[0];

  if (!project) {
    const wsId = await seed(db);
    const projId = randomUUID();
    await db.query(
      "UPDATE workspaces SET org_id=$1, project_id=$2 WHERE id=$3",
      [org.id, projId, wsId]
    );
    await db.query(
      `INSERT INTO projects(id, org_id, name, code, description, departing_name, departing_role, departing_last_day, incoming_name, incoming_role, team_members, workspace_id)
       VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        projId,
        org.id,
        sampleProject.name,
        sampleProject.code,
        sampleProject.description,
        sampleProject.departing,
        "Lead Backend Engineer",
        "Friday, Sprint 4",
        sampleProject.incoming,
        "Incoming Backend Developer",
        JSON.stringify(sampleProject.people),
        wsId,
      ]
    );
    await db.query(
      "INSERT INTO project_members(project_id, account_id, role) VALUES($1, $2, 'admin')",
      [projId, account.id]
    );
    project = { id: projId, name: sampleProject.name, workspace_id: wsId };
  }

  const token = issue(project.workspace_id, "reviewer", undefined, {
    accountId: account.id,
    email: account.email,
    name: account.name,
    orgId: org.id,
    projectId: project.id,
  });

  return {
    token,
    user: { id: account.id, email: account.email, name: account.name },
    org: { id: org.id, name: org.name, role: "admin" },
    project,
  };
}

export async function createProject({ db, accountId, orgId, data }) {
  const memberCheck = await db.query(
    "SELECT role FROM org_members WHERE org_id=$1 AND account_id=$2",
    [orgId, accountId]
  );
  if (!memberCheck.rows.length) {
    fail(403, "You do not have permission to create projects in this organisation.");
  }

  const name = field(data.name, 120);
  const code = field(data.code || name.slice(0, 4).toUpperCase(), 10);
  const description = field(data.description || "Project knowledge handover", 1000);
  const departingName = field(data.departingName || data.departing || "Departing Person", 100);
  const departingRole = field(data.departingRole || "Software Engineer", 100);
  const departingLastDay = field(data.departingLastDay || "Two weeks from now", 100);
  const incomingName = field(data.incomingName || data.incoming || "Incoming Member", 100);
  const incomingRole = field(data.incomingRole || "Software Engineer", 100);
  const teamMembers = Array.isArray(data.teamMembers) ? data.teamMembers : [];

  const wsId = randomUUID();
  const projId = randomUUID();

  // Create isolated workspace
  await db.query(
    "INSERT INTO workspaces(id, org_id, project_id) VALUES($1, $2, $3)",
    [wsId, orgId, projId]
  );

  // Setup lead and incoming user records in workspace
  await db.query("INSERT INTO users(workspace, role, name) VALUES($1, 'reviewer', $2)", [
    wsId,
    departingName,
  ]);
  await db.query("INSERT INTO users(workspace, role, name) VALUES($1, 'incoming', $2)", [
    wsId,
    incomingName,
  ]);

  // Insert project
  await db.query(
    `INSERT INTO projects(id, org_id, name, code, description, departing_name, departing_role, departing_last_day, incoming_name, incoming_role, team_members, workspace_id)
     VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
    [
      projId,
      orgId,
      name,
      code,
      description,
      departingName,
      departingRole,
      departingLastDay,
      incomingName,
      incomingRole,
      JSON.stringify(teamMembers),
      wsId,
    ]
  );

  // Add creator as project admin
  await db.query(
    "INSERT INTO project_members(project_id, account_id, role) VALUES($1, $2, $3)",
    [projId, accountId, "admin"]
  );

  const token = issue(wsId, "reviewer", undefined, {
    accountId,
    orgId,
    projectId: projId,
  });

  return {
    id: projId,
    workspaceId: wsId,
    token,
    name,
    code,
    description,
    departing: departingName,
    incoming: incomingName,
  };
}

export async function listProjects({ db, accountId, orgId }) {
  const memberCheck = await db.query(
    "SELECT role FROM org_members WHERE org_id=$1 AND account_id=$2",
    [orgId, accountId]
  );
  if (!memberCheck.rows.length) {
    fail(403, "Access denied to organisation.");
  }

  const res = await db.query(
    `SELECT p.*, pm.role as user_project_role 
     FROM projects p 
     LEFT JOIN project_members pm ON pm.project_id=p.id AND pm.account_id=$2
     WHERE p.org_id=$1 
     ORDER BY p.created_at DESC`,
    [orgId, accountId]
  );

  return res.rows.map((p) => ({
    id: p.id,
    name: p.name,
    code: p.code,
    description: p.description,
    workspaceId: p.workspace_id,
    departing: p.departing_name,
    departingRole: p.departing_role,
    incoming: p.incoming_name,
    incomingRole: p.incoming_role,
    role: p.user_project_role || memberCheck.rows[0].role,
    createdAt: p.created_at,
  }));
}

export async function createInvite({ db, accountId, projectId, role, expiresInHours = 48 }) {
  // Check permission: must be admin or lead of project
  const member = await db.query(
    `SELECT pm.role 
     FROM project_members pm 
     WHERE pm.project_id=$1 AND pm.account_id=$2`,
    [projectId, accountId]
  );

  if (!member.rows.length || !["admin", "reviewer"].includes(member.rows[0].role)) {
    fail(403, "Only project administrators can create invite links.");
  }

  if (!["admin", "reviewer", "departing", "incoming"].includes(role)) {
    fail(400, "Invalid role for invite.");
  }

  const rawToken = randomUUID() + "-" + randomUUID();
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");
  const expiresAt = new Date(Date.now() + expiresInHours * 3600 * 1000);
  const inviteId = randomUUID();

  await db.query(
    `INSERT INTO project_invites(id, project_id, token_hash, role, invited_by, expires_at)
     VALUES($1, $2, $3, $4, $5, $6)`,
    [inviteId, projectId, tokenHash, role, accountId, expiresAt]
  );

  return {
    inviteId,
    token: rawToken,
    role,
    expiresAt: expiresAt.toISOString(),
  };
}

export async function acceptInvite({ db, accountId, rawToken }) {
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");
  const res = await db.query(
    `SELECT i.*, p.org_id, p.workspace_id, p.name as project_name 
     FROM project_invites i 
     JOIN projects p ON p.id=i.project_id
     WHERE i.token_hash=$1 AND i.revoked=false AND i.expires_at > now()`,
    [tokenHash]
  );

  const invite = res.rows[0];
  if (!invite) {
    fail(404, "This invite link is invalid, expired, or has been revoked.");
  }

  // Ensure user is in organisation
  await db.query(
    `INSERT INTO org_members(org_id, account_id, role) 
     VALUES($1, $2, 'member') 
     ON CONFLICT(org_id, account_id) DO NOTHING`,
    [invite.org_id, accountId]
  );

  // Add user to project with assigned role
  await db.query(
    `INSERT INTO project_members(project_id, account_id, role)
     VALUES($1, $2, $3)
     ON CONFLICT(project_id, account_id) DO UPDATE SET role=$3`,
    [invite.project_id, accountId, invite.role]
  );

  const wsRole = invite.role === "incoming" ? "incoming" : "reviewer";
  const token = issue(invite.workspace_id, wsRole, undefined, {
    accountId,
    orgId: invite.org_id,
    projectId: invite.project_id,
    role: invite.role,
  });

  return {
    token,
    projectId: invite.project_id,
    projectName: invite.project_name,
    workspaceId: invite.workspace_id,
    role: invite.role,
  };
}

export async function getOrgDetails({ db, accountId, orgId }) {
  const memberCheck = await db.query(
    "SELECT role FROM org_members WHERE org_id=$1 AND account_id=$2",
    [orgId, accountId]
  );
  if (!memberCheck.rows.length) {
    fail(403, "Access denied to organisation.");
  }

  const orgRes = await db.query("SELECT * FROM organisations WHERE id=$1", [orgId]);
  const org = orgRes.rows[0];
  if (!org) fail(404, "Organisation not found.");

  const membersRes = await db.query(
    `SELECT a.id, a.email, a.name, om.role, om.created_at as joined_at 
     FROM org_members om 
     JOIN accounts a ON a.id=om.account_id 
     WHERE om.org_id=$1 
     ORDER BY om.created_at ASC`,
    [orgId]
  );

  return {
    org: { id: org.id, name: org.name, role: memberCheck.rows[0].role },
    members: membersRes.rows,
  };
}

export async function updateOrg({ db, accountId, orgId, name }) {
  const memberCheck = await db.query(
    "SELECT role FROM org_members WHERE org_id=$1 AND account_id=$2",
    [orgId, accountId]
  );
  if (!memberCheck.rows.length || memberCheck.rows[0].role !== "admin") {
    fail(403, "Only organisation administrators can rename the organisation.");
  }

  const cleanName = field(name, 100);
  await db.query("UPDATE organisations SET name=$1 WHERE id=$2", [cleanName, orgId]);
  return { id: orgId, name: cleanName };
}
