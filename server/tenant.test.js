import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

process.env.SESSION_SECRET = "0123456789abcdef0123456789abcdef0123456789abcdef";

import { signup, login, createProject, listProjects, createInvite, acceptInvite } from "./auth.js";
import { importGithubIssues } from "./github.js";
import { createQuestion, answerQuestion, listQuestions } from "./clarification.js";
import { computeVersionDiff } from "./diff.js";

function createMockDb() {
  const tables = {
    accounts: [],
    organisations: [],
    org_members: [],
    workspaces: [],
    users: [],
    projects: [],
    project_members: [],
    project_invites: [],
    source_records: [],
    source_permissions: [],
    claims: [],
    evidence_links: [],
    clarification_questions: [],
    clarification_answers: [],
    rate_limits: [],
    audit_log: [],
  };

  return {
    tables,
    async query(sql, params = []) {
      // rate_limits
      if (sql.includes("rate_limits")) {
        return { rows: [{ hits: 1 }] };
      }

      // accounts
      if (sql.startsWith("INSERT INTO accounts")) {
        const [id, email, password_hash, name] = params;
        const row = { id, email, password_hash, name, created_at: new Date() };
        tables.accounts.push(row);
        return { rows: [row] };
      }
      if (sql.includes("FROM accounts WHERE email=$1")) {
        const found = tables.accounts.find((a) => a.email === params[0]);
        return { rows: found ? [found] : [] };
      }
      if (sql.includes("FROM accounts WHERE id=$1")) {
        const found = tables.accounts.find((a) => a.id === params[0]);
        return { rows: found ? [found] : [] };
      }

      // organisations
      if (sql.startsWith("INSERT INTO organisations")) {
        const [id, name, created_by] = params;
        const row = { id, name, created_by, created_at: new Date() };
        tables.organisations.push(row);
        return { rows: [row] };
      }
      if (sql.includes("FROM organisations WHERE id=$1")) {
        const found = tables.organisations.find((o) => o.id === params[0]);
        return { rows: found ? [found] : [] };
      }

      // org_members
      if (sql.startsWith("INSERT INTO org_members")) {
        const [org_id, account_id, role] = params;
        const row = { org_id, account_id, role, created_at: new Date() };
        tables.org_members.push(row);
        return { rows: [row] };
      }
      if (sql.includes("FROM org_members WHERE org_id=$1 AND account_id=$2")) {
        const found = tables.org_members.find(
          (om) => om.org_id === params[0] && om.account_id === params[1]
        );
        return { rows: found ? [found] : [] };
      }
      if (sql.includes("FROM organisations o JOIN org_members om")) {
        const list = tables.org_members
          .filter((om) => om.account_id === params[0])
          .map((om) => {
            const org = tables.organisations.find((o) => o.id === om.org_id);
            return { id: org?.id, name: org?.name, role: om.role };
          });
        return { rows: list };
      }

      // workspaces
      if (sql.startsWith("INSERT INTO workspaces")) {
        const [id, org_id, project_id] = params;
        const row = { id, org_id, project_id, active: true, run: 0, dirty: false };
        tables.workspaces.push(row);
        return { rows: [row] };
      }
      if (sql.includes("UPDATE workspaces SET dirty=true")) {
        return { rowCount: 1 };
      }

      // users
      if (sql.startsWith("INSERT INTO users")) {
        const [workspace, role, name] = params;
        tables.users.push({ workspace, role, name });
        return { rowCount: 1 };
      }

      // projects
      if (sql.startsWith("INSERT INTO projects")) {
        const [id, org_id, name, code, description, departing_name, departing_role, departing_last_day, incoming_name, incoming_role, team_members, workspace_id] = params;
        const row = { id, org_id, name, code, description, departing_name, departing_role, departing_last_day, incoming_name, incoming_role, team_members, workspace_id, created_at: new Date() };
        tables.projects.push(row);
        return { rows: [row] };
      }
      if (sql.includes("FROM projects p") && sql.includes("WHERE p.org_id=$1")) {
        const list = tables.projects
          .filter((p) => p.org_id === params[0])
          .map((p) => ({ ...p, user_project_role: "admin" }));
        return { rows: list };
      }

      // project_members
      if (sql.startsWith("INSERT INTO project_members")) {
        const [project_id, account_id, role] = params;
        tables.project_members.push({ project_id, account_id, role });
        return { rowCount: 1 };
      }
      if (sql.includes("FROM project_members pm") && sql.includes("pm.project_id=$1")) {
        const found = tables.project_members.find((pm) => pm.project_id === params[0] && pm.account_id === params[1]);
        return { rows: found ? [found] : [] };
      }

      // project_invites
      if (sql.startsWith("INSERT INTO project_invites")) {
        const [id, project_id, token_hash, role, invited_by, expires_at] = params;
        tables.project_invites.push({ id, project_id, token_hash, role, invited_by, expires_at, revoked: false });
        return { rowCount: 1 };
      }
      if (sql.includes("FROM project_invites i") && sql.includes("JOIN projects p")) {
        const inv = tables.project_invites.find((i) => i.token_hash === params[0] && !i.revoked);
        if (inv) {
          const p = tables.projects.find((proj) => proj.id === inv.project_id);
          return { rows: [{ ...inv, org_id: p.org_id, workspace_id: p.workspace_id, project_name: p.name }] };
        }
        return { rows: [] };
      }

      // source_records
      if (sql.includes("INSERT INTO source_records")) {
        const [workspace, id, title, author, recorded_at, text, visibility] = params.slice(0, 7);
        tables.source_records.push({ workspace, id, title, type: "github", author, recorded_at, text, visibility });
        return { rowCount: 1 };
      }
      if (sql.includes("FROM source_records WHERE workspace=$1")) {
        const list = tables.source_records.filter((s) => s.workspace === params[0]);
        return { rows: [{ n: list.length, chars: 100 }] };
      }

      // source_permissions
      if (sql.includes("INSERT INTO source_permissions")) {
        const [workspace, source_id, connected_by, connected_at, meta] = params;
        tables.source_permissions.push({ workspace, source_id, connected_by, scope: "public_repo_issues", connected_at, meta });
        return { rowCount: 1 };
      }

      // claims
      if (sql.includes("FROM claims WHERE workspace=$1 AND id=$2")) {
        const found = tables.claims.find((c) => c.workspace === params[0] && c.id === params[1]);
        return { rows: found ? [{ data: found }] : [] };
      }
      if (sql.includes("UPDATE claims SET data=$3 WHERE workspace=$1 AND id=$2")) {
        const idx = tables.claims.findIndex((c) => c.workspace === params[0] && c.id === params[1]);
        if (idx >= 0) tables.claims[idx] = { ...params[2], workspace: params[0], id: params[1] };
        return { rowCount: 1 };
      }

      // clarification_questions
      if (sql.startsWith("INSERT INTO clarification_questions")) {
        const [id, workspace, claim_id, gap_id, question, assigned_to, due_date, created_by] = params;
        tables.clarification_questions.push({ id, workspace, claim_id, gap_id, question, assigned_to, due_date, status: "open", created_by });
        return { rowCount: 1 };
      }
      if (sql.includes("FROM clarification_questions WHERE id=$1")) {
        const found = tables.clarification_questions.find((q) => q.id === params[0] && q.workspace === params[1]);
        return { rows: found ? [found] : [] };
      }
      if (sql.includes("UPDATE clarification_questions SET status='answered'")) {
        const found = tables.clarification_questions.find((q) => q.id === params[0]);
        if (found) found.status = "answered";
        return { rowCount: 1 };
      }

      // clarification_answers
      if (sql.startsWith("INSERT INTO clarification_answers")) {
        const [id, question_id, answer, answered_by] = params;
        tables.clarification_answers.push({ id, question_id, answer, answered_by });
        return { rowCount: 1 };
      }
      if (sql.includes("FROM clarification_answers WHERE question_id=$1")) {
        const found = tables.clarification_answers.filter((a) => a.question_id === params[0]);
        return { rows: found };
      }

      // evidence_links
      if (sql.includes("INSERT INTO evidence_links")) {
        return { rowCount: 1 };
      }

      // audit_log
      if (sql.startsWith("INSERT INTO audit_log")) {
        tables.audit_log.push({ params });
        return { rowCount: 1 };
      }

      return { rows: [] };
    },
  };
}

test("Account & Organization: signup hashes password, creates org and sets user as Admin", async () => {
  const db = createMockDb();
  const res = await signup({
    db,
    email: "sarah@acme.inc",
    password: "Password123!",
    name: "Sarah Jenkins",
    orgName: "Acme Cloud",
  });

  assert.ok(res.token);
  assert.equal(res.user.email, "sarah@acme.inc");
  assert.equal(res.user.name, "Sarah Jenkins");
  assert.equal(res.org.name, "Acme Cloud");
  assert.equal(res.org.role, "admin");

  // Verify password hash in db is not plaintext
  const storedAcc = db.tables.accounts[0];
  assert.notEqual(storedAcc.password_hash, "Password123!");
  assert.ok(storedAcc.password_hash.startsWith("$2"));
});

test("Account: login validates credentials and rejects wrong passwords", async () => {
  const db = createMockDb();
  await signup({
    db,
    email: "david@acme.inc",
    password: "CorrectPassword123!",
    name: "David",
    orgName: "Acme",
  });

  // Valid login
  const valid = await login({
    db,
    email: "david@acme.inc",
    password: "CorrectPassword123!",
    ipKey: "test-ip",
  });
  assert.ok(valid.token);
  assert.equal(valid.user.email, "david@acme.inc");

  // Invalid password
  await assert.rejects(
    login({ db, email: "david@acme.inc", password: "WrongPassword!", ipKey: "test-ip" }),
    /Invalid email or password/
  );
});

test("Project Setup Wizard: creates isolated project without hard-coded names", async () => {
  const db = createMockDb();
  const user = await signup({
    db,
    email: "lead@stripe.com",
    password: "StripePassword2026!",
    name: "Maya Patel",
    orgName: "Stripe Payments",
  });

  const proj = await createProject({
    db,
    accountId: user.user.id,
    orgId: user.org.id,
    data: {
      name: "Global Payouts Engine",
      code: "GPAY",
      description: "Low-latency multi-currency payout processing",
      departingName: "Carlos Ramos",
      departingRole: "Principal Systems Architect",
      departingLastDay: "December 15, 2026",
      incomingName: "Elena Rostova",
      incomingRole: "Senior Infrastructure Engineer",
      teamMembers: [
        { name: "Carlos Ramos", role: "Principal Systems Architect" },
        { name: "Elena Rostova", role: "Senior Infrastructure Engineer" },
        { name: "Maya Patel", role: "Director of Engineering" },
      ],
    },
  });

  assert.equal(proj.name, "Global Payouts Engine");
  assert.equal(proj.code, "GPAY");
  assert.equal(proj.departing, "Carlos Ramos");
  assert.equal(proj.incoming, "Elena Rostova");
  assert.ok(proj.workspaceId);
  assert.ok(proj.token);

  // List projects for org
  const list = await listProjects({ db, accountId: user.user.id, orgId: user.org.id });
  assert.equal(list.length, 1);
  assert.equal(list[0].name, "Global Payouts Engine");
  assert.equal(list[0].departing, "Carlos Ramos");
  assert.equal(list[0].incoming, "Elena Rostova");
});

test("Tenant Isolation: user from Company A cannot list or access Company B projects", async () => {
  const db = createMockDb();
  const companyA = await signup({
    db,
    email: "admin@companya.com",
    password: "Password123!",
    name: "Alice",
    orgName: "Company A",
  });

  const companyB = await signup({
    db,
    email: "admin@companyb.com",
    password: "Password123!",
    name: "Bob",
    orgName: "Company B",
  });

  // Alice creates project in Company A
  await createProject({
    db,
    accountId: companyA.user.id,
    orgId: companyA.org.id,
    data: { name: "Project Alpha", departingName: "Dan", incomingName: "Eve" },
  });

  // Bob attempts to list projects belonging to Company A
  await assert.rejects(
    listProjects({ db, accountId: companyB.user.id, orgId: companyA.org.id }),
    /Access denied to organisation/
  );
});

test("Project Invites: lead creates invite token and recipient accepts with designated role", async () => {
  const db = createMockDb();
  const lead = await signup({
    db,
    email: "lead@tech.org",
    password: "Password123!",
    name: "Lead",
    orgName: "Tech Org",
  });

  const proj = await createProject({
    db,
    accountId: lead.user.id,
    orgId: lead.org.id,
    data: { name: "Billing Microservice", departingName: "Dev1", incomingName: "Dev2" },
  });

  // Create invite for incoming member
  const invite = await createInvite({
    db,
    accountId: lead.user.id,
    projectId: proj.id,
    role: "incoming",
    expiresInHours: 72,
  });
  assert.ok(invite.token);
  assert.equal(invite.role, "incoming");

  // Recipient creates account and accepts invite
  const recipient = await signup({
    db,
    email: "newguy@tech.org",
    password: "Password123!",
    name: "New Developer",
    orgName: "Personal Space",
  });

  const accepted = await acceptInvite({
    db,
    accountId: recipient.user.id,
    rawToken: invite.token,
  });

  assert.equal(accepted.projectId, proj.id);
  assert.equal(accepted.role, "incoming");
  assert.ok(accepted.token);
});

test("GitHub Issues Connector: imports issues as source records with permission snapshot", async () => {
  const db = createMockDb();
  const sampleIssues = [
    {
      number: 101,
      title: "Migrate Redis caching layer to Valkey",
      body: "Carlos confirmed the migration is planned for Sprint 4. Elena will oversee rollout.",
      user: { login: "carlos-r" },
      html_url: "https://github.com/org/repo/issues/101",
    },
    {
      number: 102,
      title: "Fix flakiness in payment gateway webhook test",
      body: "Resolved in staging. Webhooks now retry with exponential backoff.",
      user: { login: "dev-tester" },
      html_url: "https://github.com/org/repo/issues/102",
    },
  ];

  const wsId = randomUUID();
  const res = await importGithubIssues({
    db,
    workspace: wsId,
    issuesJson: sampleIssues,
    visibility: "all",
    connectedBy: "Elena Rostova",
  });

  assert.equal(res.importedCount, 2);
  assert.equal(db.tables.source_records.length, 2);
  assert.equal(db.tables.source_records[0].id, "GH-101");
  assert.equal(db.tables.source_records[0].type, "github");
  assert.ok(db.tables.source_records[0].text.includes("Valkey"));

  // Check permission snapshot was recorded
  assert.equal(db.tables.source_permissions.length, 2);
  assert.equal(db.tables.source_permissions[0].connected_by, "Elena Rostova");
  assert.equal(db.tables.source_permissions[0].scope, "public_repo_issues");
});

test("Clarification Loop: question creation and answer moves claim back to Pending Review", async () => {
  const db = createMockDb();
  const wsId = randomUUID();
  const claimId = "claim-valkey";

  // Seed initial accepted claim
  db.tables.claims.push({
    workspace: wsId,
    id: claimId,
    statement: "Redis cache will be migrated to Valkey.",
    owner: "Carlos",
    category: "Decisions",
    review: "Accepted",
    evidence: "Insufficient Evidence",
    refs: ["GH-101"],
  });

  // 1. Lead creates clarification question
  const q = await createQuestion({
    db,
    workspace: wsId,
    claimId,
    question: "Carlos, what is the exact fallback if the Valkey migration fails?",
    assignedTo: "Carlos Ramos",
    dueDate: "2026-11-20",
    createdBy: "Elena Rostova",
  });

  assert.equal(q.status, "open");
  assert.equal(q.assignedTo, "Carlos Ramos");

  // 2. Carlos answers the question
  const ans = await answerQuestion({
    db,
    workspace: wsId,
    questionId: q.id,
    answer: "If Valkey latency exceeds 5ms, traffic automatically reverts to Redis replica via the feature flag.",
    answeredBy: "Carlos Ramos",
  });

  assert.equal(ans.status, "answered");
  assert.equal(ans.updatedClaim.review, "Pending Review"); // Moved back to Pending Review for human re-review
  assert.equal(ans.updatedClaim.clarificationAnswered, true);
  assert.ok(ans.updatedClaim.refs.includes(ans.sourceId));
});

test("Version Diff: detects added, removed, changed claims and excludes restricted content for incoming", () => {
  const v1 = {
    id: 1,
    claims: [
      { id: "c1", statement: "OAuth is deferred.", review: "Accepted", owner: "Aarav", category: "Decisions", evidence: "Supported", restricted: false },
      { id: "c2", statement: "Private lead budget discussion.", review: "Accepted", owner: "Lead", category: "Risks", evidence: "Supported", restricted: true },
    ],
  };

  const v2 = {
    id: 2,
    claims: [
      { id: "c1", statement: "OAuth is deferred until Sprint 5.", review: "Accepted", owner: "Kabir", category: "Decisions", evidence: "Supported", restricted: false },
      { id: "c3", statement: "New Valkey caching enabled.", review: "Accepted", owner: "Carlos", category: "Ownership", evidence: "Supported", restricted: false },
      { id: "c2", statement: "Private lead budget discussion updated.", review: "Accepted", owner: "Lead", category: "Risks", evidence: "Supported", restricted: true },
    ],
  };

  // Lead view diff (sees all changes)
  const leadDiff = computeVersionDiff(v1, v2, "reviewer");
  assert.equal(leadDiff.added.length, 1);
  assert.equal(leadDiff.added[0].id, "c3");
  assert.equal(leadDiff.changed.length, 2); // c1 and c2

  // Incoming view diff (strictly excludes c2)
  const incomingDiff = computeVersionDiff(v1, v2, "incoming");
  assert.equal(incomingDiff.added.length, 1);
  assert.equal(incomingDiff.added[0].id, "c3");
  assert.equal(incomingDiff.changed.length, 1); // ONLY c1
  assert.equal(incomingDiff.changed[0].id, "c1");
  assert.equal(incomingDiff.changed[0].changes.owner.from, "Aarav");
  assert.equal(incomingDiff.changed[0].changes.owner.to, "Kabir");
  assert.ok(!JSON.stringify(incomingDiff).includes("Private lead budget"));
});
