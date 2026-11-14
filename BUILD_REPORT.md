# Relay Build Report · Round 3 Final Submission
Team DEV404 · Dhanashree S. Hingnekar and Bhakti S. Kote

* **Production URL:** [https://relay2-rho.vercel.app/](https://relay2-rho.vercel.app/)
* **Public Repository:** [https://github.com/kotebhakti30/Relay](https://github.com/kotebhakti30/Relay)
* **Round 2 Working Tag:** `stable-round2-final` (`3cadcc9ec66bcf76470c8d37fb19f7a5e50bcd10`)
* **Round 3 Production Build:** `69472f6`
* **Lead Email:** kotebhakti@gmail.com

---

## 1. Executive Summary: What Was Built & Verified in Round 3

In Round 3, Team DEV404 completed all three promised improvements and delivered a production-ready, multi-tenant knowledge handover platform:

1. **Improvement 1 (Real Sources & Accounts):** Email and password authentication with bcrypt password hashing, login attempt rate-limiting, signed httpOnly cookies, multi-tenant organizations, a 4-step dynamic Project Setup Wizard, tenant isolation guarantees, and a live public GitHub repository issues connector.
2. **Improvement 2 (Clarification Loop with Departing Member):** Dedicated clarification inbox (`/#/clarifications`), structured answer submissions linking as persistent evidence (`CLR-...`), and deterministic re-labelling of claims to `Pending Review` for human lead approval.
3. **Improvement 3 (Handover Versions, Diff & Re-Review):** Side-by-side version diffing (`/#/history`), automated staleness detection (answered clarifications, new sources, 6-week age threshold), Version N+1 updated snapshot banner, and recipient re-acknowledgement.
4. **Extraction Accuracy Evaluation:** Ground-truth dataset with 3 diverse company contexts (FinTech, Digital Health, Fleet Logistics) measuring 100% precision and recall across Ownership, Decisions, and Blockers with 100% verbatim quote verification.
5. **Quality & Safety:** Cleaned all forbidden terminology from UI copy; wrapped the application in a global React Error Boundary; wired 25 automated unit tests across 5 server suites in `npm test` running in 1.7s.

---

## 2. The Three Promised Improvements (Detailed Implementation)

### Improvement 1: Real Sources, Accounts & Multi-Tenant Organizations
- **Authentication:** Added `server/auth.js` with bcrypt hashing (`$2a$10$...`), 8-character password enforcement, and in-memory rate limiting (max 5 failed attempts per 5-minute window per IP).
- **Session Security:** Issues HMAC-SHA256 tokens stored in `httpOnly`, `SameSite=Lax`, `Secure` cookies under `relay_session` (and bearer header fallback).
- **Multi-Tenant Organizations:** Signup creates an organization and sets the user as Admin. Header features account switcher and organization identity. Settings page (`/#/settings`) allows editing organization names and viewing active members.
- **Project Setup Wizard:** 4-step wizard modal (`src/components/ProjectWizard.tsx`) allows creating isolated projects with custom project name, code, departing member details, incoming member details, and team members. Screens and handover copy read dynamic database values without hardcoding names.
- **Tenant Isolation:** Every query in `server/workflow.js` scopes access to the caller's organization and project. Tests in `server/tenant.test.js` prove Company A cannot list, read, or modify Company B projects or claims.
- **Live GitHub Connector:** Added `server/github.js` and a dedicated GitHub tab in Data Sources (`src/pages/Sources.tsx`). Ingests issues via unauthenticated public REST API with rate-limit detection and an instant "Paste JSON" fallback tab. Records permission snapshots in `source_permissions`.
- **Seeded Demo Account:** Evaluators can log in with one click via `demo@relay.local` / `DemoUser2026!` or open the sample workspace in one click.

### Improvement 2: Clarification Loop with Departing Member
- **Inbox & Navigation:** Added `/clarifications` route and sidebar item (`src/pages/Clarifications.tsx`).
- **Targeted Questions:** Leads can ask questions directly from the Knowledge Gap Radar or any candidate claim card.
- **Authoritative Answers:** Departing members submit answers that are saved as immutable `clarification` source records (`CLR-...`) linked to the claim.
- **Deterministic Re-Review:** Answering a question deterministically resets the claim review state to `Pending Review`. Model calls are strictly forbidden from deciding review status; only a human lead can accept or resolve the claim.

### Improvement 3: Handover Versions, Side-by-Side Diff, & Staleness Detection
- **Immutable Snapshots:** Handover versions are stored in PostgreSQL with database trigger immutability.
- **Side-by-Side Diff Viewer:** Added `src/components/VersionDiffViewer.tsx` integrated into History (`src/pages/History.tsx`), highlighting added, removed, and changed claims with field-level before/after cards.
- **Staleness Detection Engine:** `server/diff.js` flags draft claims with `Needs re-review` when clarifications are answered, new sources are imported, or 6 weeks have elapsed since last review.
- **Version N+1 Re-Acknowledgement:** Handover page displays an "Updated Snapshot" banner on Version $N+1$, requiring the incoming developer to review the diff and formally re-acknowledge receipt.
- **Audience Protection:** Restricted and lead-only content is excluded from incoming-member diff views.

---

## 3. Server-Side Automated Test Suites (25 Tests Passing in 1.7s)

```
> relay-handover@2.0.0 test
> node --test server/rules.test.js server/reconstruction.test.js server/chat.test.js server/tenant.test.js server/accuracy.test.js

--- Extraction Accuracy Report ---
Evaluated 3 diverse company contexts with 9 target claims:
Total Matched: 9/9 (100.0%)
Ownership Accuracy: 3/3 (100.0%)
Decisions Accuracy: 3/3 (100.0%)
Blockers Accuracy: 3/3 (100.0%)
Verbatim Excerpt Verification Rate: 9/9 (100.0%)
-----------------------------------

✔ Extraction Accuracy: evaluates 3 distinct companies across Ownership, Decisions, and Blockers (22.7ms)
✔ Ask Relay: greeting does not trigger a refusal and provides clickable suggestions (6.1ms)
✔ Ask Relay: 'what is my role' returns the correct role without model call (4.4ms)
✔ Ask Relay: general answer contains the label and sends zero project data in the prompt (164.4ms)
✔ Ask Relay: incoming member's questions never include lead-only text in prompt sent to model (5.2ms)
✔ Ask Relay: answers cite only permitted claims and discard unverified citations (2.1ms)
✔ Ask Relay: question the evidence cannot answer gets a refusal / insufficient evidence (4.4ms)
✔ Ask Relay: prompt-injection in question or notes is neutralized (0.7ms)
✔ reconstruction preserves reviewed identity and tracks corroboration, unrelated notes and contradiction (30.9ms)
✔ a stale note, repeated import or review alone cannot corroborate ownership (0.9ms)
✔ a repeated reconstruction keeps the competing owner's distinct pending claim (5.3ms)
✔ Exact quotes allow only whitespace differences (2.5ms)
✔ Contradictions outrank stale and low authority (1.6ms)
✔ Only reviewed, permitted claims can be published (0.6ms)
✔ Role signatures reject tampering (2.7ms)
✔ Arbitrary owner and conflicting source states are grounded (17.1ms)
✔ Provider cannot cite unseen records or use a fabricated quotation (71.8ms)
✔ Account & Organization: signup hashes password, creates org and sets user as Admin (144.5ms)
✔ Account: login validates credentials and rejects wrong passwords (323.4ms)
✔ Project Setup Wizard: creates isolated project without hard-coded names (96.7ms)
✔ Tenant Isolation: user from Company A cannot list or access Company B projects (183.1ms)
✔ Project Invites: lead creates invite token and recipient accepts with designated role (188.2ms)
✔ GitHub Issues Connector: imports issues as source records with permission snapshot (0.6ms)
✔ Clarification Loop: question creation and answer moves claim back to Pending Review (0.9ms)
✔ Version Diff: detects added, removed, changed claims and excludes restricted content for incoming (0.5ms)
ℹ tests 25
ℹ suites 0
ℹ pass 25
ℹ fail 0
ℹ duration_ms 1777.9642
```

---

## 4. Ground-Truth Extraction Accuracy Evaluation

Evaluated via `server/accuracy.test.js` against `test-fixtures/ground-truth.json`:

| Company Domain | Target Focus | Precision | Recall | Verbatim Check |
| :--- | :--- | :---: | :---: | :---: |
| **ApexPay** (FinTech) | Ownership, DB Migration Decision, Webhook Blocker | 100% | 100% | 100% Pass |
| **HealthBridge** (Digital Health) | Audit Ownership, WebRTC Decision, Token Expiry Blocker | 100% | 100% | 100% Pass |
| **RoutePulse** (Fleet Logistics) | Telematics Ownership, Partitioning Decision, Kafka Blocker | 100% | 100% | 100% Pass |
| **Overall** | **9 Target Claims across 3 Sectors** | **100%** | **100%** | **100% Pass** |

---

## 5. Live Production Acceptance Check (`https://relay2-rho.vercel.app/`)

Verified in private incognito sessions on the live deployment:

| # | Journey & Test Step | Live Result | Status |
|---|---|---|---|
| 1 | Evaluator landing page with seeded demo card (`demo@relay.local`) & sample button | Clean, responsive, no forbidden terminology | **Pass** |
| 2 | One-click Demo Lead login | Sets signed session cookie; opens dashboard as Admin | **Pass** |
| 3 | Project Setup Wizard | Successfully creates isolated custom project | **Pass** |
| 4 | GitHub Issues Ingestion | Ingests issues and captures permission snapshot | **Pass** |
| 5 | Knowledge Reconstruction & Verbatim Evidence | Extracts claims with honest `Extractor` badge & exact quotes | **Pass** |
| 6 | Clarification Loop | Lead asks question; departing answers; resets claim to Pending Review | **Pass** |
| 7 | Handover Version 1 Approval | Approves immutable snapshot for incoming developer | **Pass** |
| 8 | One-Click Incoming Member View | Opens recipient view pre-authenticated; enforces permissions | **Pass** |
| 9 | Version 2 Revision & Staleness | Detects updates; publishes Version 2 with updated snapshot banner | **Pass** |
| 10 | Version Diff Comparison | Side-by-side comparison shows added, removed, and changed claims | **Pass** |
| 11 | Recipient Re-Acknowledgement | Incoming member submits formal re-acknowledgement | **Pass** |
| 12 | Tenant Isolation Enforcement | User from Org A receives 403 when requesting Org B project | **Pass** |
| 13 | Ask Relay Interactive Q&A | All 6 intent categories (greeting, role, project, general, restricted, refusal) pass | **Pass** |
