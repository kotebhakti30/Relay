# Relay: Architecture & Implementation Summary

## 1. System Overview
Relay is a knowledge handover platform designed for engineering teams undergoing developer transitions. Instead of passive handoff documents that rapidly become obsolete, Relay reconstructs grounded candidate knowledge from unstructured project sources (meeting notes, task boards, repository issues, and chat updates), links exact verbatim evidence, surfaces conflicting ownership and stale data, and requires human lead verification before publishing immutable, audience-scoped snapshots.

```
┌────────────────────────────────────────────────────────────────────────┐
│                          Relay Architecture                            │
└────────────────────────────────────────────────────────────────────────┘
                                 │
     ┌───────────────────────────┴───────────────────────────┐
     ▼                                                       ▼
┌────────────────────────┐                             ┌────────────────────────┐
│  React 19 Frontend     │                             │ Node Serverless API    │
│  - Vite + Tailwind v4  │ ── HTTP / HMAC Cookie ───►  │ api/relay.js           │
│  - HashRouter          │                             │ server/*.js            │
│  - Multi-tenant UI     │                             └────────────────────────┘
└────────────────────────┘                                       │
                                                   ┌─────────────┴─────────────┐
                                                   ▼                           ▼
                                      ┌────────────────────────┐  ┌────────────────────────┐
                                      │ PostgreSQL (Neon)      │  │ Google Gemini API      │
                                      │ - Tenant Isolation     │  │ - gemini-2.5-flash     │
                                      │ - Immutable Triggers   │  │ - Structured Schema    │
                                      │ - Audit Trails         │  │ - Verbatim Evidence    │
                                      └────────────────────────┘  └────────────────────────┘
```

---

## 2. Multi-Tenant Architecture & Data Isolation

### 2.1 Schema & Scoping
The data model separates identity, tenant boundaries, and project knowledge:
- `accounts`: User identity, email, bcrypt password hash (`$2a$10$...`), rate-limiting metadata.
- `organisations`: Tenant partition representing an engineering organization or company.
- `org_members`: Role within an organization (`admin`, `member`).
- `projects`: Isolated handover scopes (`org_id`, `name`, `code`, `departing`, `incoming`, `people`).
- `project_members`: Project-level access controls (`role`: `admin`, `reviewer`, `departing`, `incoming`).
- `workspaces`: Physical partition in PostgreSQL linking knowledge records, claims, reviews, tasks, and audit logs.
- `source_permissions`: Immutable snapshots of ingestion authority and permission metadata.

### 2.2 Cross-Tenant Protection
Every database query and API route enforces tenant boundaries:
1. When accessing a project or workspace, the user's session token (`orgId`, `accountId`) is verified against `project_members` and `projects.org_id`.
2. A user belonging to Organization A receives `403 Forbidden` or `404 Not Found` if attempting to query, update, or inspect items belonging to Organization B, even by direct ID lookup.
3. Unit test suite `server/tenant.test.js` exercises cross-tenant access rejection, verifying that Project A's claims are unreachable by Company B.

---

## 3. Session Management & Dual Authentication Scheme

### 3.1 Authenticated Account Sessions
- **Password Security:** Passwords hashed with `bcryptjs` (salt rounds: 10), enforcing minimum 8-character complexity.
- **Login Rate Limiting:** In-memory sliding-window limiter prevents brute-force attempts on `/api/relay?action=auth/login` (maximum 5 failed attempts per 5-minute window per IP).
- **Session Tokens:** Signed HMAC-SHA256 tokens carrying payload: `{ accountId, email, name, orgId, projectId, role, exp }`.
- **Cookie Delivery:** Transmitted via `httpOnly`, `SameSite=Lax`, `Secure` (in production) cookies under `relay_session`, or as standard `Authorization: Bearer <token>` headers.
- **Scope Notice:** As documented in `About & limitations`, self-service email verification and email password reset are intentionally not implemented for hackathon scope; accounts are administrator-managed.

### 3.2 Anonymous & Sample Workspace Compatibility
To allow external evaluators and automated test runners to experience the product in one click without mandatory credentials:
- Signed anonymous workspace tokens continue to function seamlessly.
- Pre-seeded Demo Account: `demo@relay.local` / `DemoUser2026!` with one-click lead access.
- "Explore sample workspace" opens an isolated sandbox workspace initialized with the CampusConnect dataset.

---

## 4. Knowledge Extraction Pipeline & Verbatim Verification

Relay supports both AI-assisted extraction via Google Gemini and deterministic rule-based extraction:

```
[ Ingested Source Records ]
          │
          ▼
┌──────────────────────────────────────────────┐
│  Provider Check (LLM_API_KEY & LLM_PROVIDER) │
└──────────────────────────────────────────────┘
          │
    ┌─────┴──────────────────────┐
    ▼ (Key present)              ▼ (Key absent or timeout)
┌───────────────────────┐   ┌───────────────────────────┐
│ Gemini 2.5 Flash API  │   │ Deterministic Rules       │
│ - Strict JSON Schema  │   │ - Regex sentence matching │
│ - Categories 1-4      │   │ - Owner assignment parser │
└───────────────────────┘   └───────────────────────────┘
          │                              │
          └──────────────┬───────────────┘
                         ▼
        ┌───────────────────────────────────┐
        │ Verbatim Excerpt Verification     │
        │ - Normalizes whitespace & Unicode │
        │ - Must be substring of source text│
        │ - Unverified excerpts REJECTED    │
        └───────────────────────────────────┘
                         ▼
        ┌───────────────────────────────────┐
        │ Corroboration & Conflict Engine   │
        │ - 2+ fresh records: Supported     │
        │ - Discrepant states: Conflicting  │
        │ - 1 source: Insufficient Evidence │
        └───────────────────────────────────┘
```

1. **AI Extraction:** When configured with `LLM_API_KEY`, Relay sends batch-sanitized text (capped at 8,000 characters per note) to `gemini-2.5-flash` with strict response schema enforcing `{ claims: [{ source, excerpt, type }] }`.
2. **Verbatim Check:** Every excerpt returned by the model is checked server-side via `verified(record, excerpt)`. Any hallucinated quote or unseen citation is discarded immediately.
3. **Deterministic Fallback:** If the API times out, fails, or credentials are omitted, regular-expression sentence rules extract ownership, decisions, blockers, and risks deterministically.
4. **Honest Labeling:** Every claim carries an immutable `extractor` badge (`AI-assisted` or `Rule-based`), visible on all claim cards, evidence inspectors, and handover snapshots.

---

## 5. Ask Relay: Intent Classification & Audience Isolation

The "Ask Relay" Q&A assistant adheres to strict evidence rules and role-based audience filters:

1. **Intent Classification Step:** Prior to knowledge retrieval, queries are categorized into:
   - `greeting`: Warm one-sentence reply with 3 clickable suggestions based on visible claims. No refusal.
   - `about_me`: Returns current user identity, role, and permissions from session context. No model call.
   - `about_product`: Returns structured help documentation explaining Relay's purpose.
   - `restricted`: If an incoming member queries lead-only data (e.g. vendor budgets), refuses without leaking data.
   - `general_knowledge`: Up to 3 sentences labeled *"General answer, not from your project sources"*, passing zero project context in the prompt.
   - `project_question`: Grounded Q&A citing only permitted claims and evidence.
2. **Query Layer Scoping:** For incoming members, lead-only and unapproved records are excluded at the database query layer *before* any text reaches the model prompt.
3. **Prompt Injection Hardening:** System prompts strictly treat user inputs and note contents as data. Prompt injection attempts inside notes or chat questions are neutralized.

---

## 6. Clarification Loop with Departing Member

To eliminate guesswork when claims are ambiguous or contradictory:
1. **Creation:** A team lead creates a clarification question directly from the Knowledge Gap Radar or any candidate claim card.
2. **Assignee Inbox:** The departing member sees an inbox of assigned questions on `/clarifications`.
3. **Evidence Link:** Submitting an answer creates a persistent `clarification` source record (`CLR-...`) authored by the departing member.
4. **Deterministic Re-Labelling:** Submitting an answer deterministically resets the claim's review state to `Pending Review` and flags it for human lead re-review.
5. **Human Control:** The model is forbidden from auto-approving claims upon clarification. The team lead must review the new evidence and make the final decision.

---

## 7. Handover Versions, Side-by-Side Diff, & Staleness Detection

### 7.1 Immutable Version Snapshots
When a lead approves a handover, Relay stores an immutable snapshot in `handover_versions`. Database triggers prevent updates or deletions of approved versions.

### 7.2 Side-by-Side Version Diff
The diff engine (`server/diff.js`) compares any two snapshots:
- Highlights added, removed, and changed claims (owner, statement, review state, notes).
- Flags material changes requiring re-acknowledgement.
- Automatically excludes restricted/lead-only claims when viewed by incoming members.

### 7.3 Staleness Detection
Draft claims are automatically flagged with `Needs re-review` if:
- A clarification was answered by the departing member.
- A new source note was imported into the workspace.
- More than 6 weeks (42 days) have elapsed since the claim's last update.

### 7.4 Re-Acknowledgement Flow
When Version $N+1$ is published, the incoming developer sees an "Updated Snapshot" banner on `/handover` detailing what changed, with a prompt to formally re-acknowledge receipt.

---

## 8. Live GitHub Connector & Public REST Ingestion

- **Public REST Fetch:** Connects to `https://api.github.com/repos/{owner}/{repo}/issues?state=all&per_page=30` using unauthenticated HTTP requests.
- **Rate-Limit Resilience:** GitHub unauthenticated requests are limited to 60 req/hour per IP. If HTTP 403 or 429 is encountered, Relay displays a clean diagnostic banner and provides an instant "Paste JSON" fallback tab.
- **Permission Snapshot:** Records an immutable snapshot in `source_permissions` capturing repository slug, visibility, imported issue count, and ingestion timestamp.
