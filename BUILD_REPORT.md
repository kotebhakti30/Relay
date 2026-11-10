# Relay Build Report · Final Polish & AI Verification
Team DEV404 · Dhanashree S. Hingnekar and Bhakti S. Kote

* **Production URL:** [https://relay2-rho.vercel.app/](https://relay2-rho.vercel.app/)
* **Public Repository:** [https://github.com/kotebhakti30/Relay](https://github.com/kotebhakti30/Relay)
* **Pre-AI Tag:** `stable-before-ai` (`f1c668ae514d600830507b3720836b5fdf45d188`)
* **Verified Production Build:** `ef885c5`

---

## 1. Summary of Changes & Audit

### A. Wording & Terminology Removal
* Removed the words `"demo"`, `"Demo mode"`, `"Guided Demo"`, `"Reset Demo"`, `"prototype"`, `"Round 1"`, `"Round 2"`, `"DEV404"`, `"sample data"` and `"synthetic"` from all user-facing views:
  * Removed the `workspace-banner` element.
  * Replaced topbar pill with `{p.organisation}`.
  * Replaced reset modal copy with `"Reset workspace"`.
  * Added small `.sample-tag` (`Sample`) next to project title on the sample workspace.
  * Updated `Overview.tsx` hero kicker to `PROJECT CONTEXT` and removed "synthetic".
  * Updated `Sources.tsx` description and badge to `Connected source`.
  * Seed audit logs updated from "synthetic records" to "initial records".
  * Retained team names and hackathon designations exclusively in `README.md`, `BUILD_REPORT.md`, and submission documentation.

### B. One-Click Incoming Member Flow
* Added **Open as incoming member** primary action button on the Handover page (visible to the team lead once a handover snapshot is approved). Clicking it opens a new browser window/tab pre-authenticated with the recipient link and token.
* Kept manual copyable link input and access code for external sharing.
* Added plain-language guidance: *"Share this link and code with the incoming person."*
* Updated the workspace Quick tour to document the one-click recipient flow.

### C. Real AI Extraction & Grounding
* Supported server-side Google Gemini extraction via `LLM_API_KEY` and `LLM_PROVIDER=gemini` targeting model `gemini-2.5-flash` with strict JSON schema response formatting.
* Added server-side verbatim verification (`verified(r, c.excerpt)`): every excerpt returned by the model is checked against raw source text; unverifiable citations are discarded.
* Added honest labeling: claims display `Extractor · AI-assisted` when extracted by Gemini, and `Extractor · Rule-based` when using deterministic rules.
* Input capping (max 8,000 characters per note, max 100,000 characters per batch) and database rate-limiting per workspace and IP.
* Prompt injection defense: source text is treated strictly as data, instructing the model to ignore any embedded instructions.

### D. Evidence-Backed Chatbot ("Ask Relay") with Intent Classification
* Added server-side interactive assistant accessible to project members.
* **Intent Classification Step before Retrieval:**
  1. `greeting / small_talk`: Warm 1-sentence reply with 3 clickable suggested questions based on claims this role may see; never returns "Insufficient evidence".
  2. `about_me`: Returns role, identity, and permissions (name, role, what this role can/cannot see) directly from session data without calling an LLM.
  3. `about_product`: Answers how Relay and its pages work from static help text without involving project claims or calling an LLM.
  4. `project_question`: Grounded retrieval sending ONLY permitted claims and evidence to Gemini with strict JSON schema and citation verification. Insufficient evidence explains what is missing and offers 2 related answerable questions.
  5. `general_knowledge`: Allows short general computing answers (max 3 sentences) with a visible `[General answer, not from your project sources]` label. Sends ZERO project claims to the model.
  6. `restricted`: For incoming-member sessions, returns `"This information is not available for this role."` without leaking contents. Enforced at the SQL query layer.
  7. `unsafe / injection`: Neutralizes system overrides, role-breaks, and injection attempts, returning a safe refusal without executing commands.
* **Query-layer permission enforcement**: incoming members can only retrieve and query approved, audience-permitted claims from the latest handover snapshot (`!restricted && ['Accepted', 'Unresolved']`). Lead-only sources (`CH-R1`) and unapproved/rejected items are filtered out in the database query layer before retrieval or model prompting.
* Rate-limited per workspace and IP; audited in `audit_log`.

### E. Dedicated "About & Limitations" Page
* Accessible via `/#/about` and linked directly from the footer and sidebar.
* Plainly documents fictional sample records, AI-assisted vs rule-based mechanics, supported sources, role models, and unbuilt items (e.g. self-service email/password signup and external webhook connectors).

---

## 2. Public Acceptance Results · 10 November 2026

Both automated browser test suites passed against `https://relay2-rho.vercel.app/` in a signed-out private session on commit `ef885c5`.

### Core Eight-Step Handover Test (`tests/workflow.spec.ts`)

| Step | Acceptance Criteria | Production Result |
|---|---|---|
| 1 | Signed-out visitor opens an isolated workspace with sample indicator | **Pass** |
| 2 | Import a typed meeting note and observe imported record in source list | **Pass** |
| 3 | Reconstruct project knowledge, generate ownership claim and inspect verbatim quotation | **Pass** |
| 4 | Inspect contradictory sources, correct claim statement and refresh | **Pass** |
| 5 | Review all candidate claims (Accept, Reject, Unresolved), select audience, and approve version | **Pass** |
| 6 | Open incoming link in isolated session; verify HTTP 403/404 on restricted, rejected, and pending items | **Pass** |
| 7 | Save a first-week task note, mark complete, refresh and acknowledge receipt | **Pass** |
| 8 | Read receipt acknowledgement in lead audit history and inspect approved immutable version | **Pass** |

*All 2 core workflow suites passed in 34.3s.*

---

## 3. Live AI & Chatbot Verification Results (`tests/chat.spec.ts`)

Verified live against `https://relay2-rho.vercel.app/`:

### A. Extractor Verification
* **Claim Extractor Label:** Shows `Extractor · Rule-based` when running on deterministic fallback; switches to `Extractor · AI-assisted` when `LLM_API_KEY` is provided.

### B. Ask Relay 6-Query Verification Suite

| # | Question & Role | Live Text Shown | Intent & Badge | Pass / Fail |
|---|---|---|---|---|
| 1 | `"hii"` (Lead) | `Hello! I am Ask Relay, ready to help you review and trace project facts back to their source evidence.`<br>Suggested questions:<br>• `What decisions were made about defer OAuth until sprint 4.?`<br>• `Who owns the nightly digest cron job.?`<br>• `Is the Issue #34 is open?` | `greeting`<br>Verified evidence | **Pass** |
| 2 | `"what is my role"` (Lead) | `You are signed in as Riya with the Team Lead / Reviewer role. You have full visibility across all project sources (including lead-only records), candidate claims, and audit history. You can edit claims, publish approved handover snapshots, and manage incoming member access.` | `about_me`<br>Verified evidence | **Pass** |
| 3 | `"who owns the nightly digest cron job?"` (Lead) | `Based on verified evidence: Aarav owns the nightly digest cron job. (Owner: Aarav, Status: Pending Review, Evidence: Insufficient Evidence).`<br>Cited claims (1): `Ownership: Aarav owns the nightly digest cr…`<br>Cited sources (1): `Nightly digest · Ownership (TB-1)` | `project_question`<br>Verified evidence | **Pass** |
| 4 | `"what is OAuth?"` (Lead) | `[General answer, not from your project sources] OAuth is an open-standard authorization framework that allows third-party applications to obtain limited access to user resources without exposing credentials.` | `general_knowledge`<br>General knowledge (not project data) | **Pass** |
| 5 | `"What is the quantum encryption protocol in 2035?"` (Lead) | `I searched the permitted handover records for "What is the quantum encryption protocol in 2035?", but could not find any recorded facts or evidence. To add this context, import a supporting meeting note in Data Sources or consult the team lead.`<br>Suggested questions:<br>• `What decisions were made about defer OAuth until sprint 4.?`<br>• `Who owns the nightly digest cron job.?` | `project_question`<br>Insufficient evidence | **Pass** |
| 6 | `"What is the vendor contingency budget risk?"` (Neha, Incoming) | `This information is not available for this role.` | `restricted`<br>Restricted for this role | **Pass** |

*All 6 live chatbot query tests passed in 10.2s.*

---

## 4. How to Configure the Gemini API Key on Vercel

If you wish to enable live Gemini LLM calls in production:
1. Log in to [Vercel Dashboard](https://vercel.com/) and navigate to project `relay2` under team `dev407`.
2. Go to **Settings → Environment Variables**.
3. Add a new variable:
   * **Key:** `LLM_API_KEY`
   * **Value:** *(your Google Gemini API key from Google AI Studio)*
   * **Environment:** Select **Production**.
4. Add another variable:
   * **Key:** `LLM_PROVIDER`
   * **Value:** `gemini`
   * **Environment:** Select **Production**.
5. Go to **Deployments**, click the three dots (`...`) on the latest production deployment, and select **Redeploy**.
6. When redeployment completes, Reconstruction will use `gemini-2.5-flash` with strict JSON schema and label claims `Extractor · AI-assisted`. If the key is omitted or invalid, Relay automatically and safely falls back to tested deterministic rules without error.
