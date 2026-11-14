import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowUpRight, Search, LockKeyhole, ArrowLeft } from "lucide-react";
import { useStore } from "../state/Store";
import { visibleClaims, visibleRecords } from "../domain/engine";
import { Heading, Badge, Empty, Evidence, date } from "../components/UI";
import { ReviewDialog } from "../components/ReviewDialog";
import type { Claim } from "../domain/types";
const categories = [
  "Decisions",
  "Blockers",
  "Ownership",
  "Dependencies",
  "Risks",
  "Next actions",
  "Unresolved questions",
];
export function Knowledge({ explorer = false }: { explorer?: boolean }) {
  const { state, p, dispatch, busy } = useStore();
  const { id } = useParams();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All categories");
  const [status, setStatus] = useState("All evidence");
  const [sort, setSort] = useState("Newest evidence");
  const [selected, setSelected] = useState("");
  const [edit, setEdit] = useState<Claim | null>(null);
  const [adding, setAdding] = useState("");
  const [note, setNote] = useState("");
  const all = visibleClaims(p, state.role);
  const rs = visibleRecords(p, state.role);
  const list = all
    .filter(
      (c) =>
        c.statement.toLowerCase().includes(search.toLowerCase()) &&
        (category === "All categories" || c.category === category) &&
        (status === "All evidence" || c.evidence === status),
    )
    .sort((a, b) =>
      sort === "Owner"
        ? a.owner.localeCompare(b.owner)
        : sort === "Statement"
          ? a.statement.localeCompare(b.statement)
          : b.updated.localeCompare(a.updated),
    );
  const chosen =
    all.find((c) => c.id === (id || selected)) || (id ? undefined : list[0]);
  return (
    <>
      <Heading
        eyebrow={explorer ? "03 / VERIFY" : "PROJECT KNOWLEDGE"}
        title={
          explorer ? "Every claim has a trail." : "The project, reconstructed."
        }
        description={
          explorer
            ? "Inspect the evidence, understand the uncertainty, then make a human decision."
            : "Structured candidate knowledge, grounded in the sources you connected."
        }
        action={
          state.role === "reviewer" ? (
            <Link to="/review" className="button primary">
              Review claims <ArrowUpRight size={16} />
            </Link>
          ) : undefined
        }
      />
      {!all.length ? (
        <Empty />
      ) : (
        <>
          <div className="toolbar">
            <label className="search">
              <Search size={17} />
              <input
                aria-label="Search claims"
                placeholder="Search project knowledge…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            <select
              aria-label="Category filter"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {["All categories", ...categories].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <select
              aria-label="Evidence filter"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              {[
                "All evidence",
                "Supported",
                "Conflicting",
                "Insufficient Evidence",
              ].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <select
              aria-label="Sort claims"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              {["Newest evidence", "Owner", "Statement"].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="row mb-4">
            <span className="muted">
              {list.length} claims · {rs.length} available records
            </span>
            <span className="hint">Evidence assessment ≠ human approval</span>
          </div>
          {explorer ? (
            <div className="evidence-layout">
              <div className="claim-list">
                {list.map((c) => (
                  <Link
                    key={c.id}
                    to={`/evidence/${c.id}`}
                    className={`claim-select ${chosen?.id === c.id ? "selected" : ""}`}
                    onClick={() => setSelected(c.id)}
                  >
                    <div className="row">
                      <small>{c.id.toUpperCase()}</small>
                      {c.restricted && <LockKeyhole size={14} />}
                    </div>
                    <strong>{c.statement}</strong>
                    <div className="flex flex-wrap gap-2">
                      <Badge>{c.evidence}</Badge>
                      <small>
                        {c.refs.length}{" "}
                        {c.refs.length === 1 ? "source" : "sources"}
                      </small>
                    </div>
                  </Link>
                ))}
                {!list.length && (
                  <p className="panel">No claims match these filters.</p>
                )}
              </div>
              <section className="panel inspector">
                {chosen ? (
                  <>
                    <Evidence claim={chosen} records={rs} />
                    {state.role === "reviewer" && (
                      <div className="actions">
                        <button onClick={() => { setAdding(chosen.id); setNote(""); }}>Add supporting note</button>
                        {adding === chosen.id && <form onSubmit={async event => {
                          event.preventDefault();
                          if (!await dispatch({type: "import", text: note, title: "Supporting note", visibility: chosen.restricted ? "lead_only" : "all"})) return;
                          setAdding("");
                          setNote("");
                          await dispatch({type: "reconstruct"});
                        }}>
                          <label>Supporting source text<textarea autoFocus required maxLength={8000} value={note} onChange={e => setNote(e.target.value)}/></label>
                          <p>Relay checks which claims this source supports during reconstruction.</p>
                          <button disabled={busy || !note.trim()}>Save note and reconstruct</button>
                          <button type="button" disabled={busy} onClick={() => setAdding("")}>Cancel</button>
                        </form>}
                      </div>
                    )}
                    {state.role === "reviewer" && (
                      <button
                        className="primary mt-6"
                        onClick={() => setEdit(chosen)}
                      >
                        Review this claim
                      </button>
                    )}
                  </>
                ) : (
                  <p>
                    This claim is unavailable in your current role or project.
                  </p>
                )}
              </section>
            </div>
          ) : (
            <>
              <div className="knowledge-grid">
                {list.map((c) => (
                  <Link
                    className="knowledge-card"
                    to={`/evidence/${c.id}`}
                    key={c.id}
                  >
                    <div className="row">
                      <span className="eyebrow">{c.category}</span>
                      <ArrowUpRight size={17} />
                    </div>
                    <h3>{c.statement}</h3>
                    <div className="flex gap-2 flex-wrap">
                      <Badge>{c.evidence}</Badge>
                      <Badge>Extractor · {c.extractor}</Badge>
                      <Badge>{c.review}</Badge>
                    </div>
                    <div className="card-meta">
                      <span>{c.owner}</span>
                      <span>
                        {c.refs.length}{" "}
                        {c.refs.length === 1 ? "source" : "sources"} ·{" "}
                        {date(c.updated)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
              {!list.length && (
                <p className="panel">No claims match these filters.</p>
              )}
              <section className="panel mt-6">
                <h2>Decision Trail</h2>
                <p>Chronology from the records available in this context.</p>
                <div className="timeline">
                  {rs
                    .filter(
                      (r) =>
                        r.entities.includes("decision") ||
                        r.entities.includes("architecture"),
                    )
                    .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
                    .map((r) => (
                      <Link
                        className="timeline-item"
                        key={r.id}
                        to={`/record/${r.id}`}
                      >
                        <small>{date(r.timestamp)}</small>
                        <strong>{r.title}</strong>
                        <p>{r.content}</p>
                      </Link>
                    ))}
                  {!rs.some(
                    (r) =>
                      r.entities.includes("decision") ||
                      r.entities.includes("architecture"),
                  ) && (
                    <p>
                      Connect meeting notes or repository context to populate
                      the Decision Trail.
                    </p>
                  )}
                </div>
              </section>
            </>
          )}
        </>
      )}
      {edit && <ReviewDialog claim={edit} onClose={() => setEdit(null)} />}
    </>
  );
}
export function RecordPage() {
  const { id } = useParams();
  const { state, p } = useStore();
  const r = visibleRecords(p, state.role).find((r) => r.id === id);
  return (
    <>
      <Link
        className="text-link"
        to={state.role === "incoming" ? "/handover" : "/evidence"}
      >
        <ArrowLeft size={16} /> Back to evidence
      </Link>
      {r ? (
        <>
          <Heading
            eyebrow="SOURCE RECORD"
            title={r.title}
            description="Read the original record used during extraction."
          />
          <section className="panel">
            <div className="flex gap-2">
              <Badge>{r.type}</Badge>
              <Badge>{r.access === "team" ? "Team access" : "Lead only"}</Badge>
            </div>
            <dl className="record-meta">
              <dt>Source ID</dt>
              <dd>{r.id}</dd>
              <dt>Author</dt>
              <dd>{r.author}</dd>
              <dt>Recorded</dt>
              <dd>{date(r.timestamp)}</dd>
              <dt>Record reference</dt>
              <dd>{r.reference}</dd>
              <dt>Related entities</dt>
              <dd>{r.entities.join(", ")}</dd>
            </dl>
            <blockquote>
              <mark>{r.content}</mark>
            </blockquote>
          </section>
        </>
      ) : (
        <Empty
          title="Record unavailable"
          description="This record is not available to your current role, project or approved handover."
          to={state.role === "incoming" ? "/handover" : "/sources"}
          action="Return to available information"
        />
      )}
    </>
  );
}
