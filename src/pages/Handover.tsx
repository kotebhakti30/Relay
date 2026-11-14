import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, ChevronDown, ShieldCheck } from "lucide-react";
import { useStore } from "../state/Store";
import { latest, readerClaims, plan } from "../domain/engine";
import { Heading, Badge, Empty, Evidence, date, Modal, cleanText, cleanOwner } from "../components/UI";
import type { Claim } from "../domain/types";
export function Handover() {
  const { state, p, dispatch, incomingLink } = useStore();
  const v = latest(p);
  const [inspect, setInspect] = useState<Claim | null>(null);
  const [ack, setAck] = useState(false);
  const claims = readerClaims(v);
  return (
    <>
      <Heading
        eyebrow="05 / HANDOVER"
        title="The next chapter, with context."
        description="An approved snapshot of the project. Every fact has evidence; every open question stays visible."
        action={
          v ? (
            <Link className="button primary" to="/plan">
              First-week plan <ArrowRight size={16} />
            </Link>
          ) : undefined
        }
      />
      {!v ? (
        <Empty
          title="Your handover isn’t ready yet."
          description="The team lead must review the candidate claims and approve a version before anything is shared."
          to={state.role === "reviewer" ? "/review" : "/"}
          action={
            state.role === "reviewer" ? "Go to review" : "Back to overview"
          }
        />
      ) : (
        <>
          <section className="handover-banner">
            <ShieldCheck size={32} />
            <div>
              <div className="flex gap-2">
                <Badge>Approved · v{v.id}</Badge>
                {v.id > 1 && <Badge>Updated</Badge>}
                <Badge>Incoming Developer</Badge>
              </div>
              <h2>
                {v.departing} → {v.incoming}
              </h2>
              <p>
                Reviewed by {v.author} · {date(v.at)} · {claims.length}{" "}
                permitted claims
              </p>
            </div>
            <div className="ml-auto">
              {state.role === "incoming" ? (
                <button
                  className="primary"
                  disabled={!!v.acknowledged}
                  onClick={() => setAck(true)}
                >
                  {v.acknowledged
                    ? "Receipt acknowledged"
                    : v.id > 1
                      ? "Re-acknowledge revised receipt"
                      : "Acknowledge receipt"}
                </button>
              ) : null}
            </div>
          </section>
          {v.id > 1 && (
            <div className="panel mb-4" style={{ borderLeft: "4px solid var(--accent, #6366f1)" }}>
              <strong>Updated handover version published</strong>
              <p style={{ margin: "0.25rem 0 0", color: "var(--muted)" }}>
                This is snapshot version {v.id}. It includes newly reviewed claims and answered clarifications from the departing member.
                {state.role === "incoming" && !v.acknowledged && (
                  <span style={{ display: "block", marginTop: "0.25rem", color: "var(--amber, #f59e0b)" }}>
                    Material updates were published. Please re-acknowledge receipt above once reviewed.
                  </span>
                )}
              </p>
            </div>
          )}
          {state.role === "reviewer" && (
            <section className="panel">
              <h2>Share with {p.incoming}</h2>
              {incomingLink ? (
                <>
                  <p className="share-note">
                    Share this link and code with the incoming person.
                  </p>
                  <label>
                    {p.incoming}’s access link
                    <input
                      readOnly
                      value={incomingLink}
                      onFocus={(e) => e.target.select()}
                    />
                  </label>
                  <label>
                    Access code
                    <input readOnly value={p.sharing?.code} />
                  </label>
                  <p>
                    Open the link, or enter this code on Relay’s start screen.
                  </p>
                  <div className="flex gap-2 items-center flex-wrap">
                    <a
                      className="button primary"
                      target="_blank"
                      rel="noopener noreferrer"
                      href={incomingLink}
                    >
                      Open as incoming member
                    </a>
                    <button
                      onClick={() =>
                        dispatch({ type: "share", action: "revoke" })
                      }
                    >
                      Revoke access
                    </button>
                    <button
                      onClick={() =>
                        dispatch({ type: "share", action: "regenerate" })
                      }
                    >
                      Regenerate link and code
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex flex-col gap-3 items-start">
                  <p className="text-stone-600">Sharing is revoked.</p>
                  <button
                    className="primary"
                    onClick={() =>
                      dispatch({ type: "share", action: "regenerate" })
                    }
                  >
                    Generate new link and code
                  </button>
                </div>
              )}
            </section>
          )}
          <div className="knowledge-grid">
            {claims.map((c) => (
              <article className="knowledge-card" key={c.id}>
                <div className="row">
                  <span className="eyebrow">{c.category}</span>
                  <Badge>{c.review}</Badge>
                </div>
                <h3>{cleanText(c.statement)}</h3>
                <div className="flex gap-2 flex-wrap">
                  <Badge>{c.evidence}</Badge>
                  {(c.resolution || c.review === "Accepted") && (
                    <Badge>Reviewer-confirmed</Badge>
                  )}
                </div>
                <p>
                  Owner: <strong>{cleanOwner(c.owner)}</strong>
                </p>
                {c.review === "Unresolved" && (
                  <p className="warning">
                    Open question — do not treat this as a confirmed fact.
                  </p>
                )}
                {c.note && <p className="review-note">{c.note}</p>}
                <button onClick={() => setInspect(c)}>
                  Inspect evidence ({c.refs.length})
                </button>
              </article>
            ))}
          </div>
        </>
      )}
      {inspect && v && (
        <Modal
          title="Approved claim & evidence"
          onClose={() => setInspect(null)}
        >
          <Evidence claim={inspect} records={v.records} />
        </Modal>
      )}
      {ack && (
        <Modal title="Acknowledge this handover?" onClose={() => setAck(false)}>
          <p>
            This records that you received version {v?.id}, including its
            unresolved questions. It does not mark your onboarding tasks
            complete.
          </p>
          <div className="actions">
            <button onClick={() => setAck(false)}>Cancel</button>
            <button
              className="primary"
              onClick={() => {
                dispatch({ type: "ack" });
                setAck(false);
              }}
            >
              Confirm receipt
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
export function Plan() {
  const { state, p, dispatch, incomingLink } = useStore();
  const v = latest(p);
  const tasks = plan(v);
  const completed = tasks.filter((t) => p.tasks[t.id]?.done).length;
  return (
    <>
      <Heading
        eyebrow="FIRST-WEEK CONTINUATION PLAN"
        title="Know where to begin."
        description="Next steps derived from this approved handover. Rejected and restricted claims never become tasks."
      />
      {!v ? (
        <Empty
          title="A plan follows an approved handover."
          description="Approve a version first to generate a plan from its permitted claims."
          to="/handover"
          action="View handover status"
        />
      ) : (
        <>
          <section className="panel progress-panel">
            <div>
              <span className="eyebrow">
                {p.incoming}’S FIRST WEEK · VERSION {v.id}
              </span>
              <h2>
                {completed} of {tasks.length} tasks complete
              </h2>
              <p>Take each step with the context behind it.</p>
            </div>
            <div className="progress-value">
              {Math.round((completed / tasks.length) * 100) || 0}%
              <progress
                aria-label="Onboarding progress"
                value={completed}
                max={tasks.length || 1}
              />
            </div>
          </section>
          {state.role !== "incoming" && (
            <p className="notice">
              Use {p.incoming}’s access link to complete tasks and add personal notes.
            </p>
          )}
          <div className="plan-list">
            {tasks.map((t) => {
              const progress = p.tasks[t.id] || { done: false, note: "" };
              return (
                <details
                  className={`plan-task ${progress.done ? "complete" : ""}`}
                  key={t.id}
                >
                  <summary>
                    <span className="day">DAY {t.day}</span>
                    <span className="task-check">
                      {progress.done ? <Check size={17} /> : t.day}
                    </span>
                    <div>
                      <strong>{t.title}</strong>
                      <small>
                        {p.incoming} · {t.priority} priority ·{" "}
                        {progress.done ? "Complete" : "To do"}
                      </small>
                    </div>
                    <ChevronDown className="ml-auto" size={18} />
                  </summary>
                  <div className="task-details">
                    <p>
                      <strong>Dependency:</strong> {t.dependency}
                    </p>
                    <p>
                      <strong>Related claim:</strong> {cleanText(t.claim.statement)}
                    </p>
                    <Badge>{t.claim.review}</Badge>
                    <div className="actions">
                      {t.claim.refs.map((id) => (
                        <Link className="button" to={`/record/${id}`} key={id}>
                          Evidence · {id}
                        </Link>
                      ))}
                    </div>
                    {state.role === "incoming" && (
                      <>
                        <label>
                          Personal notes
                          <textarea
                            placeholder="Your observations and next steps…"
                            defaultValue={progress.note}
                            onBlur={(e) =>
                              dispatch({
                                type: "task",
                                id: t.id,
                                note: e.target.value,
                              })
                            }
                          />
                        </label>
                        <label className="check-label">
                          <input
                            type="checkbox"
                            defaultChecked={progress.done}
                            onChange={async (e) => {
                              const box = e.currentTarget;
                              box.disabled = true;
                              if (
                                !(await dispatch({
                                  type: "task",
                                  id: t.id,
                                  done: box.checked,
                                }))
                              )
                                box.checked = progress.done;
                              box.disabled = false;
                            }}
                          />{" "}
                          Mark task complete
                        </label>
                      </>
                    )}
                  </div>
                </details>
              );
            })}
          </div>
          {completed === tasks.length && tasks.length > 0 ? (
            <div className="panel p-6 text-center my-6 bg-emerald-50 border border-emerald-200 rounded-lg">
              <h2 className="text-lg font-semibold text-emerald-950 mb-1">All tasks complete</h2>
              <p className="text-sm text-emerald-800 mb-4">
                You have completed every orientation task in your first-week plan.
              </p>
              <Link className="button primary inline-flex items-center gap-2" to="/handover">
                Return to handover to acknowledge receipt <ArrowRight size={16} />
              </Link>
            </div>
          ) : (
            <Link className="text-link" to="/handover">
              Return to handover and acknowledge receipt <ArrowRight size={16} />
            </Link>
          )}
        </>
      )}
    </>
  );
}
