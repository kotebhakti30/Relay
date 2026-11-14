import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Check, ArrowUpRight, ShieldCheck, Radar } from "lucide-react";
import { useStore } from "../state/Store";
import { activeGaps, approvalErrors } from "../domain/engine";
import type { Claim, Gap } from "../domain/types";
import { Heading, Badge, Empty, Modal, cleanText } from "../components/UI";
import { ReviewDialog } from "../components/ReviewDialog";
export function Review() {
  const { p, dispatch } = useStore();
  const nav = useNavigate();
  const [filter, setFilter] = useState("All decisions");
  const [edit, setEdit] = useState<Claim | null>(null);
  const [audience, setAudience] = useState(false);
  const [appropriate, setAppropriate] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const errors = [...approvalErrors(p), ...(!audience ? ["Choose a target audience."] : []), ...(!appropriate ? ["Confirm the included information is appropriate for this audience."] : [])];
  const reviewed = p.claims.filter((c) => c.review !== "Pending Review").length;
  const list = p.claims.filter(
    (c) => filter === "All decisions" || c.review === filter,
  );
  return (
    <>
      <Heading
        eyebrow="04 / HUMAN REVIEW"
        title="Your judgment makes it a handover."
        description="Accept, correct, reject or leave a claim explicitly unresolved. Every decision keeps an audit trail."
      />
      {!p.claims.length ? (
        <Empty />
      ) : (
        <div className="review-layout">
          <section>
            <div className="toolbar">
              <select
                aria-label="Review filter"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                {[
                  "All decisions",
                  "Pending Review",
                  "Accepted",
                  "Rejected",
                  "Unresolved",
                ].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
              <span className="muted">{list.length} candidate claims</span>
            </div>
            <div className="review-list">
              {list.map((c) => (
                <article className="review-card" key={c.id}>
                  <div className="row">
                    <span className="eyebrow">
                      {c.category} · {c.id}
                    </span>
                    <Badge>{c.review}</Badge>
                  </div>
                  <h3>{cleanText(c.statement)}</h3>
                  <div className="flex flex-wrap gap-2">
                    <Badge>{c.evidence}</Badge>
                    <Badge>Extractor · {c.extractor}</Badge>
                    <Badge>
                      {c.refs.length}{" "}
                      {c.refs.length === 1 ? "source" : "sources"}
                    </Badge>
                    {(c.resolution || c.review === "Accepted") && (
                      <Badge>Reviewer-confirmed</Badge>
                    )}
                    {c.restricted && <Badge>Excluded from incoming view</Badge>}
                    <span className="meta">Owner: {c.owner}</span>
                  </div>
                  {c.note && <p className="review-note">Reviewer: {c.note}</p>}
                  <div className="actions">
                    <button className="primary" onClick={() => setEdit(c)}>
                      Review / edit
                    </button>
                    <Link className="button" to={`/evidence/${c.id}`}>
                      Open evidence <ArrowUpRight size={14} />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
            {!list.length && (
              <p className="panel">No claims in this review state.</p>
            )}
          </section>
          <aside className="panel approval-panel">
            <ShieldCheck size={27} />
            <h2>Ready to pass it on?</h2>
            <p>
              {reviewed} of {p.claims.length} claims reviewed
            </p>
            <progress value={reviewed} max={p.claims.length} />
            <div className="approval-rules">
              <p>
                <Check size={16} /> Rejected claims are excluded.
              </p>
              <p>
                <Check size={16} /> Unresolved claims stay labelled.
              </p>
              <p>
                <Check size={16} /> Lead-only claims stay private.
              </p>
            </div>
            <label>
              Target audience
              <select
                aria-label="Target audience"
                value={audience ? "incoming" : ""}
                onChange={(e) => setAudience(e.target.value === "incoming")}
              >
                <option value="">Choose an audience</option>
                <option value="incoming">
                  Incoming Developer · {p.incoming}
                </option>
              </select>
            </label>
            <label className="check-label">
              <input
                type="checkbox"
                checked={appropriate}
                onChange={(e) => setAppropriate(e.target.checked)}
              />{" "}
              I confirm the included information is appropriate for this
              audience.
            </label>
            {errors.length > 0 && (
              <ul className="validation">
                {errors.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            )}
            <button
              className="primary full"
              disabled={errors.length > 0 || !audience || !appropriate}
              onClick={() => setConfirm(true)}
            >
              Approve Handover
            </button>
            <small>
              Creates a versioned database snapshot. Later edits require a new
              approval.
            </small>
          </aside>
        </div>
      )}
      {edit && <ReviewDialog claim={edit} onClose={() => setEdit(null)} />}{" "}
      {confirm && (
        <Modal
          title="Approve this handover version?"
          onClose={() => setConfirm(false)}
        >
          <p>
            Version {p.versions.length + 1} will include{" "}
            {
              p.claims.filter(
                (c) =>
                  !c.restricted &&
                  ["Accepted", "Unresolved"].includes(c.review),
              ).length
            }{" "}
            audience-appropriate claims for {p.incoming}. Rejected and
            restricted claims are excluded.
          </p>
          <div className="actions">
            <button onClick={() => setConfirm(false)}>Cancel</button>
            <button
              className="primary"
              onClick={async () => {
                if (
                  !(await dispatch({ type: "approve", audience, appropriate }))
                )
                  return;
                setConfirm(false);
                nav("/handover");
              }}
            >
              Confirm approval
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
export function Gaps() {
  const { state, p } = useStore();
  const [severity, setSeverity] = useState("All severities");
  const [type, setType] = useState("All types");
  const [owner, setOwner] = useState("All owners");
  const [status, setStatus] = useState("Open");
  const [review, setReview] = useState("All review states");
  const [edit, setEdit] = useState<{ claim: Claim; gap: Gap } | null>(null);
  const all = activeGaps(p).filter(
    (g) =>
      state.role === "reviewer" ||
      !p.claims.find((c) => c.id === g.claimId)?.restricted,
  );
  const list = all.filter((g) => {
    const c = p.claims.find((c) => c.id === g.claimId)!;
    return (
      (severity === "All severities" || g.severity === severity) &&
      (type === "All types" || g.type === type) &&
      (owner === "All owners" || c.owner === owner) &&
      (status === "All gaps" ||
        (status === "Resolved") === p.resolvedGaps.includes(g.id)) &&
      (review === "All review states" || review === c.review)
    );
  });
  return (
    <>
      <Heading
        eyebrow="KNOWLEDGE GAP RADAR"
        title="Make the unknowns visible."
        description="Missing ownership, contradictions and unanswered questions deserve a place in the handover."
      />
      <div className="radar-summary">
        <div className="radar-art">
          <Radar size={72} strokeWidth={1} />
        </div>
        <div>
          <span className="eyebrow">CONTINUITY CHECK</span>
          <h2>
            {all.filter((g) => !p.resolvedGaps.includes(g.id)).length} gaps need
            a closer look
          </h2>
          <p>
            {p.resolvedGaps.length} resolved with a recorded human verification.
            Nothing disappears from history.
          </p>
        </div>
      </div>
      {!p.claims.length ? (
        <Empty />
      ) : (
        <>
          <div className="toolbar">
            {[
              {
                label: "Gap severity",
                value: severity,
                set: setSeverity,
                options: ["All severities", "High", "Medium", "Low"],
              },
              {
                label: "Gap type",
                value: type,
                set: setType,
                options: ["All types", ...new Set(all.map((g) => g.type))],
              },
              {
                label: "Gap owner",
                value: owner,
                set: setOwner,
                options: [
                  "All owners",
                  ...new Set(p.claims.map(claim => claim.owner)),
                  "Unassigned",
                ],
              },
              {
                label: "Gap status",
                value: status,
                set: setStatus,
                options: ["Open", "Resolved", "All gaps"],
              },
              {
                label: "Gap review state",
                value: review,
                set: setReview,
                options: [
                  "All review states",
                  "Pending Review",
                  "Accepted",
                  "Rejected",
                  "Unresolved",
                ],
              },
            ].map((s) => (
              <select
                key={s.label}
                aria-label={s.label}
                value={s.value}
                onChange={(e) => s.set(e.target.value)}
              >
                {s.options.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            ))}
          </div>
          <div className="knowledge-grid">
            {list.map((g) => {
              const c = p.claims.find((c) => c.id === g.claimId)!;
              return (
                <article className="knowledge-card" key={g.id}>
                  <div className="row">
                    <Badge>{g.severity}</Badge>
                    <Badge>
                      {p.resolvedGaps.includes(g.id) ? "Resolved" : "Open"}
                    </Badge>
                  </div>
                  <h3>{g.title}</h3>
                  <p>{g.missing}</p>
                  <p>
                    <strong>Why it matters:</strong> {g.impact}
                  </p>
                  <small>
                    Owner: {c.owner} · Clarify with {g.clarify}
                  </small>
                  <div className="actions">
                    {state.role === "reviewer" && (
                      <button
                        className="primary"
                        onClick={() => setEdit({ claim: c, gap: g })}
                      >
                        Inspect / resolve
                      </button>
                    )}
                    <Link className="button" to={`/evidence/${c.id}`}>
                      Evidence
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
          {!list.length && (
            <p className="panel">No gaps match these filters.</p>
          )}
        </>
      )}
      {edit && (
        <ReviewDialog
          claim={edit.claim}
          gap={edit.gap}
          onClose={() => setEdit(null)}
        />
      )}
    </>
  );
}
