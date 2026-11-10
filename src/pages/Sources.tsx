import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useStore } from "../state/Store";
import { Badge, Heading } from "../components/UI";
export function Sources() {
  const { p, dispatch, busy } = useStore(),
    [text, setText] = useState(""),
    [title, setTitle] = useState(""),
    [visibility, setVisibility] = useState("all"),
    [error, setError] = useState("");
  return (
    <>
      <Heading
        eyebrow="01 / CONNECT"
        title="Bring the context together."
        description="Inspect the synthetic sample records or import a meeting note of your own."
        action={
          <Link className="button primary" to="/reconstruct">
            Next: reconstruct
          </Link>
        }
      />
      <form
        className="panel import-panel"
        onSubmit={async (e) => {
          e.preventDefault();
          if (
            await dispatch({
              type: "import",
              text,
              title: title || "Imported meeting note",
              visibility,
            })
          ) {
            setText("");
            setTitle("");
            setError("");
          }
        }}
      >
        <h2>Import a meeting note</h2>
        <p>
          Use fictional project data only. When a model is configured, it
          receives source text for extraction. Every citation is checked on the
          server.
        </p>
        <label>
          Title
          <input
            maxLength={120}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <label>
          Meeting note
          <textarea
            required
            rows={3}
            maxLength={8000}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste an assignment, decision, blocker or risk from your meeting."
          />
        </label>
        <label>
          Upload text or Markdown
          <input
            type="file"
            accept=".txt,.md,text/plain,text/markdown"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              try {
                if (f.size > 32000 || !/\.(txt|md)$/i.test(f.name))
                  throw Error(
                    "Choose a .txt or .md file under 8,000 characters.",
                  );
                const value = await f.text();
                if (value.length > 8000)
                  throw Error("Maximum 8,000 characters.");
                setText(value);
                setTitle(f.name);
                setError("");
              } catch (err) {
                setError((err as Error).message);
              }
            }}
          />
        </label>
        <label>
          Visibility
          <select
            value={visibility}
            onChange={(e) => setVisibility(e.target.value)}
          >
            <option value="all">Team</option>
            <option value="lead_only">Lead only</option>
          </select>
        </label>
        {error && <p role="alert">{error}</p>}
        <button className="primary" disabled={busy || !text.trim()}>
          Import note
        </button>
      </form>
      <div className="source-grid">
        {(p.records || []).map((r) => (
          <article className="source-card" key={r.id}>
            <Badge>
              {r.reference === r.id && r.id.length === 36
                ? "Imported note"
                : "Synthetic sample"}
            </Badge>
            <h2>{r.title}</h2>
            <p>
              {r.author} · {r.access === "team" ? "Team" : "Lead only"}
            </p>
            <Link className="button" to={"/record/" + r.id}>
              Inspect record
            </Link>
          </article>
        ))}
      </div>
    </>
  );
}
export function Reconstruct() {
  const { p, dispatch, busy } = useStore();
  const nav = useNavigate();
  return (
    <>
      <Heading
        eyebrow="02 / RECONSTRUCT"
        title="From scattered records to shared context."
        description="Extract candidate claims and verify their quotations against the source records."
      />
      <section className="reconstruct panel">
        <h2>Reconstruct project knowledge</h2>
        <p>
          {p.records?.length} records available. Each candidate identifies its
          extractor. Rules determine evidence labels. You decide what to
          approve.
        </p>
        <button
          className="primary"
          disabled={busy}
          onClick={async () => {
            if (await dispatch({ type: "reconstruct" })) nav("/knowledge");
          }}
        >
          {busy ? "Checking sources…" : "Reconstruct Project Knowledge"}
        </button>
      </section>
    </>
  );
}
