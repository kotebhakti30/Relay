import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useStore } from "../state/Store";
import { Badge, Heading } from "../components/UI";
import { GitPullRequest, FileText, Upload, ShieldCheck, CheckCircle2, ArrowUpRight } from "lucide-react";

export function Sources() {
  const { p, dispatch, importGithub, busy } = useStore();
  const [tab, setTab] = useState<"notes" | "github">("notes");
  const [text, setText] = useState("");
  const [title, setTitle] = useState("");
  const [visibility, setVisibility] = useState("all");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // GitHub connector state
  const [githubMode, setGithubMode] = useState<"repo" | "json">("repo");
  const [repoInput, setRepoInput] = useState("");
  const [issuesJson, setIssuesJson] = useState("");

  async function handleImportNote(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
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
      setSuccess("Meeting note imported successfully.");
      setTimeout(() => setSuccess(""), 4000);
    }
  }

  async function handleImportGithub(e: React.FormEvent) {
    e.preventDefault();
    if (!importGithub) return;
    setError("");
    setSuccess("");
    try {
      const res = await importGithub(
        githubMode === "repo" ? repoInput : "",
        visibility,
        githubMode === "json" ? issuesJson : undefined
      );
      if (res?.success) {
        setSuccess(
          `Imported ${res.importedCount} issues from ${res.repo}. Permission snapshot recorded: Connected by Lead, Scope: public_repo_issues.`
        );
        setRepoInput("");
        setIssuesJson("");
        setTimeout(() => setSuccess(""), 6000);
      }
    } catch (err: any) {
      setError(err.message || "Failed to import GitHub issues.");
    }
  }

  return (
    <>
      <Heading
        eyebrow="01 / CONNECT"
        title="Bring the context together."
        description="Inspect connected source records or import meeting notes and GitHub issues."
        action={
          <Link className="button primary" to="/reconstruct">
            Next: reconstruct
          </Link>
        }
      />

      {success && <div className="p-3 mb-4 bg-emerald-50 text-emerald-800 text-xs rounded-lg flex items-center gap-1.5"><CheckCircle2 size={15} /> {success}</div>}
      {error && <div className="p-3 mb-4 bg-red-50 text-red-800 text-xs rounded-lg">{error}</div>}

      <div className="panel import-panel">
        <div className="flex border-b border-stone-200 mb-4">
          <button
            type="button"
            className={`pb-2 text-xs font-semibold flex items-center gap-1.5 border-b-2 mr-4 ${
              tab === "notes" ? "border-emerald-800 text-emerald-900" : "border-transparent text-stone-500"
            }`}
            onClick={() => setTab("notes")}
          >
            <FileText size={14} /> Meeting Note / Document
          </button>
          <button
            type="button"
            className={`pb-2 text-xs font-semibold flex items-center gap-1.5 border-b-2 ${
              tab === "github" ? "border-emerald-800 text-emerald-900" : "border-transparent text-stone-500"
            }`}
            onClick={() => setTab("github")}
          >
            <GitPullRequest size={14} /> GitHub Issues Connector
          </button>
        </div>

        {tab === "notes" ? (
          <form onSubmit={handleImportNote}>
            <h2>Import a meeting note</h2>
            <p>
              Use fictional project data only. Source text is treated strictly as data. Every citation is verified verbatim on the server.
            </p>
            <label>
              Title
              <input
                maxLength={120}
                value={title}
                placeholder="e.g. Architecture Sync Notes"
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
              Upload text or Markdown (.txt, .md)
              <input
                type="file"
                accept=".txt,.md,text/plain,text/markdown"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  try {
                    if (f.size > 32000 || !/\.(txt|md)$/i.test(f.name))
                      throw Error("Choose a .txt or .md file under 8,000 characters.");
                    const value = await f.text();
                    if (value.length > 8000) throw Error("Maximum 8,000 characters.");
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
              <select value={visibility} onChange={(e) => setVisibility(e.target.value)}>
                <option value="all">Team (included in handover)</option>
                <option value="lead_only">Lead only (restricted)</option>
              </select>
            </label>
            <button className="primary" disabled={busy || !text.trim()}>
              {busy ? "Importing…" : "Import note"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleImportGithub} className="flex flex-col gap-3">
            <h2>Connect GitHub Issues</h2>
            <p>
              Import open issues and pull requests from public repositories. Each imported issue records a permission snapshot with author, scope, and timestamp.
            </p>

            <div className="flex gap-3 text-xs mb-1">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="githubMode"
                  checked={githubMode === "repo"}
                  onChange={() => setGithubMode("repo")}
                />
                Fetch via Public REST API
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="githubMode"
                  checked={githubMode === "json"}
                  onChange={() => setGithubMode("json")}
                />
                Paste JSON (Fallback)
              </label>
            </div>

            {githubMode === "repo" ? (
              <label>
                Repository Name or URL
                <input
                  type="text"
                  placeholder="e.g. facebook/react or https://github.com/owner/repo"
                  value={repoInput}
                  onChange={(e) => setRepoInput(e.target.value)}
                  className="input-field"
                  required
                />
              </label>
            ) : (
              <label>
                Paste Issues JSON
                <textarea
                  rows={4}
                  placeholder='[{"number": 42, "title": "Implement OAuth", "body": "Assigned to Kabir.", "user": {"login": "riya"}}]'
                  value={issuesJson}
                  onChange={(e) => setIssuesJson(e.target.value)}
                  className="input-field font-mono text-xs"
                  required
                />
              </label>
            )}

            <label>
              Visibility
              <select value={visibility} onChange={(e) => setVisibility(e.target.value)}>
                <option value="all">Team (included in handover)</option>
                <option value="lead_only">Lead only (restricted)</option>
              </select>
            </label>

            <button
              type="submit"
              className="primary self-start"
              disabled={busy || (githubMode === "repo" ? !repoInput.trim() : !issuesJson.trim())}
            >
              {busy ? "Connecting & Importing…" : "Connect & Import Issues"}
            </button>

            <p className="text-[11px] text-stone-500 mt-1">
              Note: Public repositories use GitHub's unauthenticated REST API. If the hourly IP limit is reached, use the Paste JSON tab to import without rate limits.
            </p>
          </form>
        )}
      </div>

      <div className="source-grid">
        {(p.records || []).map((r) => (
          <article className="source-card" key={r.id}>
            <Badge>
              {r.type === "github" ? (
                "GitHub issue"
              ) : r.type === "clarification" ? (
                "Clarification answer"
              ) : r.reference === r.id && r.id.length === 36 ? (
                "Imported note"
              ) : (
                "Connected source"
              )}
            </Badge>
            <h2>{r.title}</h2>
            <p>
              {r.author} · {r.access === "team" ? "Team" : "Lead only"}
            </p>
            <div className="flex gap-2 items-center mt-2">
              <Link className="button" to={"/record/" + r.id}>
                Inspect record
              </Link>
            </div>
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
