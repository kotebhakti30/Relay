import { randomUUID } from "node:crypto";
import { fail, field } from "./db.js";

export async function createQuestion({
  db,
  workspace,
  claimId,
  gapId = null,
  question,
  assignedTo,
  dueDate = null,
  createdBy = "Team Lead",
}) {
  const cleanQ = field(question, 1000);
  const cleanAssignee = field(assignedTo || "Departing Member", 100);
  const cleanDue = dueDate ? field(dueDate, 50, true) : null;

  // Verify claim exists in workspace
  const claimRes = await db.query(
    "SELECT data FROM claims WHERE workspace=$1 AND id=$2",
    [workspace, claimId]
  );
  const claim = claimRes.rows[0]?.data;
  if (!claim) {
    fail(404, "Claim not found in this workspace.");
  }

  if (claim.review === "Rejected") {
    fail(400, "Cannot create clarification questions on rejected claims.");
  }

  const qId = randomUUID();
  await db.query(
    `INSERT INTO clarification_questions(id, workspace, claim_id, gap_id, question, assigned_to, due_date, status, created_by)
     VALUES($1, $2, $3, $4, $5, $6, $7, 'open', $8)`,
    [qId, workspace, claimId, gapId, cleanQ, cleanAssignee, cleanDue, createdBy]
  );

  // Log in audit trail
  await db.query(
    "INSERT INTO audit_log(workspace, actor, type, detail, claim_id) VALUES($1, $2, 'Clarification Request', $3, $4)",
    [workspace, createdBy, `Asked ${cleanAssignee}: ${cleanQ.slice(0, 80)}`, claimId]
  );

  return {
    id: qId,
    workspace,
    claimId,
    gapId,
    question: cleanQ,
    assignedTo: cleanAssignee,
    dueDate: cleanDue,
    status: "open",
    createdBy,
    createdAt: new Date().toISOString(),
  };
}

export async function listQuestions({ db, workspace, claimId = null, assignedTo = null, status = null }) {
  let query = `
    SELECT q.*, 
           a.id as answer_id, a.answer, a.answered_by, a.answered_at
    FROM clarification_questions q
    LEFT JOIN clarification_answers a ON a.question_id=q.id
    WHERE q.workspace=$1
  `;
  const params = [workspace];

  if (claimId) {
    params.push(claimId);
    query += ` AND q.claim_id=$${params.length}`;
  }
  if (assignedTo) {
    params.push(assignedTo);
    query += ` AND q.assigned_to=$${params.length}`;
  }
  if (status) {
    params.push(status);
    query += ` AND q.status=$${params.length}`;
  }

  query += " ORDER BY q.created_at DESC";

  const res = await db.query(query, params);
  return res.rows.map((r) => ({
    id: r.id,
    claimId: r.claim_id,
    gapId: r.gap_id,
    question: r.question,
    assignedTo: r.assigned_to,
    dueDate: r.due_date,
    status: r.status,
    createdBy: r.created_by,
    createdAt: r.created_at,
    answer: r.answer_id
      ? {
          id: r.answer_id,
          text: r.answer,
          answeredBy: r.answered_by,
          answeredAt: r.answered_at,
        }
      : null,
  }));
}

export async function answerQuestion({
  db,
  workspace,
  questionId,
  answer,
  answeredBy = "Departing Member",
}) {
  const cleanAns = field(answer, 4000);
  if (!cleanAns.trim()) {
    fail(400, "Answer text cannot be empty.");
  }

  // Get question
  const qRes = await db.query(
    "SELECT * FROM clarification_questions WHERE id=$1 AND workspace=$2",
    [questionId, workspace]
  );
  const q = qRes.rows[0];
  if (!q) {
    fail(404, "Clarification question not found.");
  }

  // Idempotency check: if already answered with exact same answer, return existing
  const existingAns = await db.query(
    "SELECT * FROM clarification_answers WHERE question_id=$1",
    [questionId]
  );
  if (existingAns.rows.length > 0) {
    const prev = existingAns.rows[0];
    if (prev.answer === cleanAns) {
      return { id: prev.id, status: "answered", duplicate: true };
    }
  }

  // Fetch current claim
  const claimRes = await db.query(
    "SELECT data FROM claims WHERE workspace=$1 AND id=$2",
    [workspace, q.claim_id]
  );
  const claim = claimRes.rows[0]?.data;
  if (!claim) {
    fail(404, "Associated claim no longer exists.");
  }

  // Insert answer record
  const aId = randomUUID();
  await db.query(
    "INSERT INTO clarification_answers(id, question_id, answer, answered_by) VALUES($1, $2, $3, $4)",
    [aId, questionId, cleanAns, answeredBy]
  );

  // Update question status to answered
  await db.query(
    "UPDATE clarification_questions SET status='answered' WHERE id=$1",
    [questionId]
  );

  // Create new source record for the clarification answer
  const sourceId = `CLR-${questionId.slice(0, 8)}`;
  const sourceTitle = `Clarification: ${q.question.slice(0, 60)}`;
  const now = new Date();
  await db.query(
    `INSERT INTO source_records(workspace, id, title, type, author, recorded_at, text, visibility)
     VALUES($1, $2, $3, 'clarification', $4, $5, $6, 'all')
     ON CONFLICT(workspace, id) DO UPDATE SET text=EXCLUDED.text, recorded_at=EXCLUDED.recorded_at`,
    [workspace, sourceId, sourceTitle, answeredBy, now, cleanAns]
  );

  // Link evidence
  await db.query(
    `INSERT INTO evidence_links(workspace, claim_id, source_id, exact_excerpt)
     VALUES($1, $2, $3, $4)
     ON CONFLICT(workspace, claim_id, source_id) DO UPDATE SET exact_excerpt=EXCLUDED.exact_excerpt`,
    [workspace, q.claim_id, sourceId, cleanAns.slice(0, 200)]
  );

  // Deterministic re-labelling:
  // Add reference to claim, update quote, and set review back to "Pending Review"
  const newRefs = [...new Set([...(claim.refs || []), sourceId])];
  const newQuotes = { ...(claim.quotes || {}), [sourceId]: cleanAns.slice(0, 200) };

  // Check if answer contradicts existing claim statement
  let newEvidenceStatus = claim.evidence;
  if (
    /\b(not|never|canceled|cancelled|invalid|wrong|no longer|reverted|deprecated|won't)\b/i.test(cleanAns) &&
    !/\b(fixed|resolved|completed|done)\b/i.test(cleanAns)
  ) {
    newEvidenceStatus = "Conflicting";
  } else if (newRefs.length >= 2 && newEvidenceStatus !== "Conflicting") {
    newEvidenceStatus = "Supported";
  }

  const updatedClaim = {
    ...claim,
    refs: newRefs,
    quotes: newQuotes,
    evidence: newEvidenceStatus,
    review: "Pending Review", // Moves back to Pending Review for human re-review
    resolution: null, // Requires human re-verification
    clarificationAnswered: true,
  };

  await db.query(
    "UPDATE claims SET data=$3 WHERE workspace=$1 AND id=$2",
    [workspace, q.claim_id, updatedClaim]
  );

  // Mark workspace dirty
  await db.query("UPDATE workspaces SET dirty=true WHERE id=$1", [workspace]);

  // Record in audit log
  await db.query(
    "INSERT INTO audit_log(workspace, actor, type, detail, claim_id) VALUES($1, $2, 'Clarification Answered', $3, $4)",
    [workspace, answeredBy, `Answered: ${cleanAns.slice(0, 80)}`, q.claim_id]
  );

  return {
    id: aId,
    questionId,
    claimId: q.claim_id,
    sourceId,
    answer: cleanAns,
    answeredBy,
    updatedClaim,
    status: "answered",
  };
}
