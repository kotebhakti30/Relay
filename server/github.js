import { randomUUID } from "node:crypto";
import { fail, field } from "./db.js";

export function parseRepoSlug(input) {
  if (!input || typeof input !== "string") {
    fail(400, "Repository name or URL is required (e.g. 'owner/repo' or 'https://github.com/owner/repo').");
  }
  const clean = input.trim().replace(/^https?:\/\/github\.com\//i, "").replace(/\/+$/, "");
  const parts = clean.split("/");
  if (parts.length < 2 || !parts[0] || !parts[1]) {
    fail(400, "Invalid repository format. Please provide 'owner/repo' (e.g. 'facebook/react' or 'kotebhakti30/Relay').");
  }
  return { owner: parts[0], repo: parts[1], slug: `${parts[0]}/${parts[1]}` };
}

export async function fetchPublicGithubIssues(owner, repo) {
  const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues?state=open&per_page=15`;
  let res;
  try {
    res = await fetch(url, {
      headers: {
        "User-Agent": "Relay-Handover-Connector/3.0",
        "Accept": "application/vnd.github.v3+json",
      },
      signal: AbortSignal.timeout(10000),
    });
  } catch (err) {
    fail(504, `Could not connect to GitHub API: ${err.message}. You can use the Paste JSON fallback below.`);
  }

  if (res.status === 403 || res.status === 429) {
    const resetTime = res.headers.get("x-ratelimit-reset");
    const resetMsg = resetTime ? ` Rate limit resets at ${new Date(Number(resetTime) * 1000).toLocaleTimeString()}.` : "";
    fail(429, `GitHub public API rate limit reached.${resetMsg} Please use the Paste JSON tab to import issues immediately.`);
  }

  if (res.status === 404) {
    fail(404, `Repository '${owner}/${repo}' was not found. Please ensure it is a valid public GitHub repository.`);
  }

  if (!res.ok) {
    fail(res.status, `GitHub API returned status ${res.status}: ${res.statusText}. Try the Paste JSON fallback.`);
  }

  const data = await res.json();
  if (!Array.isArray(data)) {
    fail(502, "Unexpected response format from GitHub API.");
  }
  return data;
}

export async function importGithubIssues({
  db,
  workspace,
  repoInput,
  issuesJson,
  visibility = "all",
  connectedBy = "Team Lead",
}) {
  if (!["all", "lead_only"].includes(visibility)) {
    fail(400, "Visibility must be either 'all' or 'lead_only'.");
  }

  let rawIssues = [];
  let repoSlug = "custom/json-import";

  if (issuesJson) {
    try {
      rawIssues = typeof issuesJson === "string" ? JSON.parse(issuesJson) : issuesJson;
      if (!Array.isArray(rawIssues)) {
        if (rawIssues.items && Array.isArray(rawIssues.items)) {
          rawIssues = rawIssues.items;
        } else {
          rawIssues = [rawIssues];
        }
      }
    } catch {
      fail(400, "Invalid JSON format for issues. Please paste valid GitHub issues JSON.");
    }
    if (repoInput) {
      try {
        repoSlug = parseRepoSlug(repoInput).slug;
      } catch {}
    }
  } else {
    const { owner, repo, slug } = parseRepoSlug(repoInput);
    repoSlug = slug;
    rawIssues = await fetchPublicGithubIssues(owner, repo);
  }

  if (rawIssues.length === 0) {
    fail(400, "No open issues found in the specified repository or JSON payload.");
  }

  // Check workspace source limits
  const currentSize = await db.query(
    "SELECT count(*)::int AS n, coalesce(sum(length(text)),0)::int AS chars FROM source_records WHERE workspace=$1",
    [workspace]
  );
  if (currentSize.rows[0].n + rawIssues.length > 50) {
    fail(409, "Importing these issues would exceed the workspace limit of 50 source records.");
  }

  const imported = [];
  const now = new Date();

  for (let i = 0; i < Math.min(rawIssues.length, 15); i++) {
    const issue = rawIssues[i];
    const num = issue.number || (i + 1);
    const title = field(issue.title || `Issue #${num}`, 120);
    const author = field(issue.user?.login || issue.author || "GitHub Contributor", 100);
    const bodyText = issue.body || issue.text || "No description provided.";
    const fullText = field(`${title}\n\n${bodyText}`, 8000);
    const id = `GH-${num}`;

    // Insert or update source record
    await db.query(
      `INSERT INTO source_records(workspace, id, title, type, author, recorded_at, text, visibility)
       VALUES($1, $2, $3, 'github', $4, $5, $6, $7)
       ON CONFLICT(workspace, id) DO UPDATE SET 
         title=EXCLUDED.title, 
         author=EXCLUDED.author, 
         text=EXCLUDED.text, 
         visibility=EXCLUDED.visibility`,
      [workspace, id, `Issue #${num}: ${title.slice(0, 80)}`, author, now, fullText, visibility]
    );

    // Record permission snapshot
    const meta = {
      repo: repoSlug,
      issueUrl: issue.html_url || `https://github.com/${repoSlug}/issues/${num}`,
      isPullRequest: Boolean(issue.pull_request),
      labels: Array.isArray(issue.labels) ? issue.labels.map((l) => (typeof l === "string" ? l : l.name)) : [],
    };

    await db.query(
      `INSERT INTO source_permissions(workspace, source_id, connected_by, scope, connected_at, meta)
       VALUES($1, $2, $3, 'public_repo_issues', $4, $5)
       ON CONFLICT(workspace, source_id) DO UPDATE SET
         connected_by=EXCLUDED.connected_by,
         connected_at=EXCLUDED.connected_at,
         meta=EXCLUDED.meta`,
      [workspace, id, connectedBy, now, JSON.stringify(meta)]
    );

    imported.push({ id, title: `Issue #${num}: ${title}`, author, meta });
  }

  // Mark workspace dirty so reconstruction is required
  await db.query("UPDATE workspaces SET dirty=true WHERE id=$1", [workspace]);

  return {
    success: true,
    repo: repoSlug,
    importedCount: imported.length,
    sources: imported,
  };
}
