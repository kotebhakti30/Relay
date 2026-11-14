import { permitted } from "./workflow.js";

export function computeVersionDiff(v1Snapshot, v2Snapshot, role = "reviewer") {
  const isIncoming = role === "incoming";

  const getCleanClaims = (snap) => {
    if (!snap || !Array.isArray(snap.claims)) return [];
    let list = snap.claims;
    if (isIncoming) {
      list = list.filter((c) => !c.restricted && permitted(c));
    }
    return list;
  };

  const c1List = getCleanClaims(v1Snapshot);
  const c2List = getCleanClaims(v2Snapshot);

  const c1Map = new Map(c1List.map((c) => [c.id, c]));
  const c2Map = new Map(c2List.map((c) => [c.id, c]));

  const added = [];
  const removed = [];
  const changed = [];
  const unchanged = [];

  // Check additions and modifications
  for (const [id, c2] of c2Map.entries()) {
    if (!c1Map.has(id)) {
      added.push({
        id,
        statement: c2.statement,
        category: c2.category,
        owner: c2.owner,
        review: c2.review,
        evidence: c2.evidence,
        refsCount: (c2.refs || []).length,
      });
    } else {
      const c1 = c1Map.get(id);
      const diffFields = {};
      let isMaterial = false;

      if (c1.statement !== c2.statement) {
        diffFields.statement = { from: c1.statement, to: c2.statement };
        isMaterial = true;
      }
      if (c1.owner !== c2.owner) {
        diffFields.owner = { from: c1.owner, to: c2.owner };
        isMaterial = true;
      }
      if (c1.review !== c2.review) {
        diffFields.review = { from: c1.review, to: c2.review };
        isMaterial = true;
      }
      if (c1.evidence !== c2.evidence) {
        diffFields.evidence = { from: c1.evidence, to: c2.evidence };
        isMaterial = true;
      }
      if ((c1.refs || []).length !== (c2.refs || []).length) {
        diffFields.refsCount = { from: (c1.refs || []).length, to: (c2.refs || []).length };
      }
      if (c1.note !== c2.note) {
        diffFields.note = { from: c1.note || "", to: c2.note || "" };
      }

      if (Object.keys(diffFields).length > 0) {
        changed.push({
          id,
          category: c2.category,
          current: c2,
          previous: c1,
          changes: diffFields,
          isMaterialChange: isMaterial,
        });
      } else {
        unchanged.push(c2);
      }
    }
  }

  // Check removals
  for (const [id, c1] of c1Map.entries()) {
    if (!c2Map.has(id)) {
      removed.push({
        id,
        statement: c1.statement,
        category: c1.category,
        owner: c1.owner,
        review: c1.review,
      });
    }
  }

  const hasMaterialChanges =
    added.length > 0 || removed.length > 0 || changed.some((c) => c.isMaterialChange);

  const parts = [];
  if (changed.length > 0) parts.push(`${changed.length} claim${changed.length > 1 ? "s" : ""} modified`);
  if (added.length > 0) parts.push(`${added.length} added`);
  if (removed.length > 0) parts.push(`${removed.length} removed`);
  const summary = parts.length > 0 ? parts.join(", ") : "No material changes detected";

  return {
    fromVersion: v1Snapshot?.id || 0,
    toVersion: v2Snapshot?.id || 0,
    summary,
    added,
    removed,
    changed,
    unchangedCount: unchanged.length,
    hasMaterialChanges,
    role,
  };
}

export async function detectStaleClaims({ db, workspace, latestVersion }) {
  if (!latestVersion) return [];

  const draftClaims = (
    await db.query("SELECT data FROM claims WHERE workspace=$1", [workspace])
  ).rows.map((r) => r.data);

  const staleList = [];
  const snapshotDate = new Date(latestVersion.at || Date.now());
  const sixWeeksAgo = new Date(Date.now() - 42 * 86400 * 1000);

  // Check for newly added sources since approval
  const newSources = (
    await db.query(
      "SELECT id, title, recorded_at FROM source_records WHERE workspace=$1 AND recorded_at > $2",
      [workspace, snapshotDate]
    )
  ).rows;
  const newSourceIds = new Set(newSources.map((s) => s.id));

  for (const c of draftClaims) {
    const reasons = [];

    // Reason 1: Clarification answered
    if (c.clarificationAnswered) {
      reasons.push("New clarification answer provided by departing member");
    }

    // Reason 2: Evidence changed or new sources linked
    if ((c.refs || []).some((id) => newSourceIds.has(id))) {
      reasons.push("New or updated source records connected to this claim");
    }

    // Reason 3: 6-week staleness rule on underlying source notes
    // If sources exist and all are older than 6 weeks
    const srcDates = (
      await db.query(
        "SELECT recorded_at FROM source_records WHERE workspace=$1 AND id=ANY($2)",
        [workspace, c.refs || []]
      )
    ).rows;
    if (srcDates.length > 0 && srcDates.every((s) => new Date(s.recorded_at) < sixWeeksAgo)) {
      reasons.push("Underlying evidence is older than 6 weeks and requires confirmation");
    }

    if (reasons.length > 0) {
      const fullReason = reasons.join("; ");
      staleList.push({
        claimId: c.id,
        statement: c.statement,
        owner: c.owner,
        category: c.category,
        reason: fullReason,
      });

      // Record in version_stale_flags table
      await db.query(
        `INSERT INTO version_stale_flags(workspace, claim_id, reason)
         VALUES($1, $2, $3)
         ON CONFLICT(workspace, claim_id) DO UPDATE SET reason=EXCLUDED.reason, flagged_at=now()`,
        [workspace, c.id, fullReason]
      );
    }
  }

  return staleList;
}
