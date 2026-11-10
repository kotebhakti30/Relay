# Relay Build Report · Final Polish & AI Verification
Team DEV404 · Dhanashree S. Hingnekar and Bhakti S. Kote

* **Production URL:** [https://relay2-rho.vercel.app/](https://relay2-rho.vercel.app/)
* **Public Repository:** [https://github.com/kotebhakti30/Relay](https://github.com/kotebhakti30/Relay)
* **Pre-AI Tag:** `stable-before-ai` (`f1c668ae514d600830507b3720836b5fdf45d188`)
* **Verified Production Build:** `6098928`

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

### D. Evidence-Backed Chatbot ("Ask Relay")
* Added server-side interactive assistant accessible to project members.
* **Query-layer permission enforcement**: incoming members can only retrieve and query approved, audience-permitted claims from the latest handover snapshot (`!restricted && ['Accepted', 'Unresolved']`). Lead-only sources (such as `CH-R1`) and unapproved/rejected items are filtered out in the database query layer before retrieval or model prompting.
* Grounded retrieval passes permitted records to Gemini with strict citation requirements (`citedClaimIds`, `citedSourceIds`, `confidence`).
* Server-side citation verification checks all returned IDs against permitted items; hallucinated IDs are stripped.
* Refusal and confidence handling: returns honest insufficient evidence messages if unanswerable, and `"This information is not available for this role."` if asking about restricted content.
* Rate-limited per workspace and IP; audited in `audit_log`.

### E. Dedicated "About & Limitations" Page
* Accessible via `/#/about` and linked directly from the footer and sidebar.
* Plainly documents fictional sample records, AI-assisted vs rule-based mechanics, supported sources, role models, and unbuilt items (e.g. self-service email/password signup and external webhook connectors).

---

## 2. Public Acceptance Results · 10 November 2026

Both automated browser test suites passed against `https://relay2-rho.vercel.app/` in a signed-out private session on commit `6098928`.

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

*All 2 test suites passed in 35.8s.*

---

## 3. Live AI & Chatbot Verification Results

Tested live on `https://relay2-rho.vercel.app/` using real API requests and UI validation:

### A. Extractor Verification
* **Claim Extractor Label:** Shows `Extractor · Rule-based` when running on deterministic fallback; switches to `Extractor · AI-assisted` when `LLM_API_KEY` is provided.

### B. Ask Relay Chatbot Tests

#### 1. Answerable Question (Incoming Member)
* **Question:** `"Who owns the nightly digest cron job?"`
* **Response:**
  > `"Based on verified evidence: Aarav owns the nightly digest cron job. (Owner: Aarav, Status: Unresolved, Evidence: Insufficient Evidence)."`
* **Confidence:** `high`
* **Cited Claims:** `cron` (*"Aarav owns the nightly digest cron job."*)
* **Cited Sources:** `TB-1` (*"Nightly digest · Ownership"*)
* **Result:** **Pass**

#### 2. Unanswerable Question (Incoming Member)
* **Question:** `"What is the quantum encryption protocol in 2035?"`
* **Response:**
  > `"The provided evidence does not contain sufficient information to answer this question. Please consult the team lead or import a supporting meeting note."`
* **Confidence:** `insufficient_evidence`
* **Cited Claims:** None (`[]`)
* **Cited Sources:** None (`[]`)
* **Result:** **Pass**

#### 3. Restricted Lead-Only Content Question (Incoming Member)
* **Question:** `"What is the vendor contingency budget risk?"`
* **Response:**
  > `"This information is not available for this role."`
* **Confidence:** `restricted`
* **Query-layer enforcement:** Source `CH-R1` and lead-only claims were completely excluded at the SQL layer.
* **Cited Claims:** None (`[]`)
* **Cited Sources:** None (`[]`)
* **Result:** **Pass**

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
