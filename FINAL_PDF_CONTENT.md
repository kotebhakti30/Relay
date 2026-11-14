# Relay · Knowledge Handover for Engineering Teams
## Round 3 Final Submission Document · Team DEV404

* **Production URL:** https://relay2-rho.vercel.app/
* **Public Repository:** https://github.com/kotebhakti30/Relay
* **Production Build Commit:** `69472f6`
* **Team:** DEV404 · Dhanashree S. Hingnekar and Bhakti S. Kote (kotebhakti@gmail.com)

---

## 1. Problem & Product Overview

### The Engineering Handover Problem
When a software engineer departs a team, tribal knowledge vanishes. Important architectural decisions, unwritten operational workflows, flaky cron jobs, and third-party vendor agreements are scattered across hundreds of chat messages, closed pull requests, and ephemeral sprint notes. Passive handover documents (e.g., Notion or Google Docs) fail because they are:
1. **Unverified:** Claims lack backing evidence and quickly drift from reality.
2. **Ambiguous:** Missing owners and conflicting statements are glossed over.
3. **One-Way & Static:** They offer no mechanism for structured clarification with the departing engineer before their last day.
4. **Vulnerable:** Private budget, performance, or lead-only discussions leak easily to recipients without role controls.

### What Relay Does
Relay is a verifiable, multi-tenant knowledge handover platform that turns fragmented project history into an auditable, living handover. It ingests meeting notes, repository issues, and chat updates, extracts candidate claims using Google Gemini or deterministic rules, verifies every quotation verbatim against raw sources, surfaces conflicting stances on a Knowledge Gap Radar, facilitates a structured clarification loop with the departing engineer, and publishes immutable, role-scoped snapshots with side-by-side diffing and first-week continuation plans.

---

## 2. Core Improvements Delivered in Round 3

### Improvement 1: Real Sources, Accounts & Multi-Tenant Organizations
* **Password Authentication:** Built with `bcryptjs` (salt rounds: 10), enforcing minimum 8-character complexity and sliding-window login rate limiting (max 5 failed attempts per 5 minutes per IP).
* **Secure Sessions:** HMAC-SHA256 session signatures transported via `httpOnly`, `SameSite=Lax`, `Secure` cookies under `relay_session`.
* **Multi-Tenant Organizations:** Users can create organizations, manage member roles (Admin, Member), and generate 48-hour role-scoped invite links.
* **Dynamic Project Setup Wizard:** 4-step wizard capturing custom project names, codes, departing engineer details (name, role, last day), incoming engineer details, and team members. Screens and handover copy read dynamic database values without hardcoding identities.
* **Tenant Isolation:** Every query enforces organizational and project boundaries; tests in `server/tenant.test.js` prove Company A cannot read or modify Company B data.
* **Live GitHub Issues Connector:** Ingests issues from any public GitHub repository via unauthenticated REST API with automatic rate-limit detection, instant "Paste JSON" fallback, and immutable permission snapshots.
* **One-Click Demo Account:** Evaluators can log in immediately via pre-seeded `demo@relay.local` / `DemoUser2026!` or open the sample workspace in one click.

### Improvement 2: Clarification Loop with Departing Member
* **Targeted Questions:** Team leads create clarification questions directly from knowledge gaps or ambiguous candidate claims.
* **Assignee Inbox:** Departing members receive questions in an inbox (`/#/clarifications`) and submit authoritative answers.
* **Evidence Linking:** Submitted answers are saved as immutable `clarification` source records (`CLR-...`) and linked to the claim.
* **Deterministic Re-Review:** Answering a question deterministically resets the claim review state to `Pending Review`. AI models are forbidden from auto-approving claims upon clarification; only a human lead can approve.

### Improvement 3: Handover Versions, Side-by-Side Diff, & Staleness Detection
* **Immutable Version Snapshots:** Handover versions are stored in PostgreSQL with database triggers preventing modification or deletion.
* **Side-by-Side Diff Viewer:** Visual comparison between any two versions (`/#/history`), highlighting added, removed, and changed claims with field-level before/after cards.
* **Automated Staleness Engine:** Detects when draft claims become stale due to answered clarifications, new source notes, or 6-week age thresholds, flagging them with `Needs re-review`.
* **Version N+1 Re-Acknowledgement:** Handover page displays an "Updated Snapshot" banner on revised handovers, prompting the incoming developer to inspect the diff and re-acknowledge receipt.
* **Audience Isolation:** Restricted and lead-only content is strictly excluded from incoming-member diff views.

---

## 3. Architecture & Technical Implementation

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

### Knowledge Extraction Pipeline
1. Ingests source records (meeting notes, GitHub issues, chat updates) capped at 8,000 characters per note.
2. Calls Google Gemini (`gemini-2.5-flash`) via structured JSON schema when `LLM_API_KEY` is configured, falling back to deterministic sentence rules if the API is unavailable.
3. Every returned excerpt is verified verbatim against raw source text using Unicode and whitespace normalization. Unverifiable citations are discarded immediately.
4. Honest extractor badges (`AI-assisted` vs `Rule-based`) are displayed on all claim cards, inspector modals, and handover snapshots.

### Ask Relay Q&A Assistant
- Features an intent classification step: `greeting`, `about_me`, `about_product`, `project_question`, `general_knowledge`, `restricted`, and `unsafe`.
- Incoming members' queries are scoped at the database query layer: unapproved, rejected, and lead-only claims are excluded before any text reaches the model prompt.
- General questions are labeled `[General answer, not from your project sources]` and send zero project context in the prompt.

---

## 4. Verification & Testing Details

### Server-Side Test Suites (25 Tests Passing in 1.7s)
- `server/rules.test.js`: Verbatim quote verification, corroboration ranking, publish safeguards, HMAC tampering checks, state grounding, hallucination prevention.
- `server/reconstruction.test.js`: Review preservation, corroboration isolation, competing owner retention.
- `server/chat.test.js`: All 7 Ask Relay intent categories, query-layer filtering, prompt injection defenses.
- `server/tenant.test.js`: Account signup, bcrypt login, dynamic wizard, tenant isolation, project invites, GitHub ingestion, clarification loop, version diffing.
- `server/accuracy.test.js`: Ground-truth extraction accuracy evaluation.

### Ground-Truth Extraction Accuracy Report
Evaluated across 3 distinct company domains (FinTech, Digital Health, Fleet Logistics) with 9 target claims:
- **Ownership Extraction:** 3/3 (100.0%)
- **Decisions Extraction:** 3/3 (100.0%)
- **Blockers Extraction:** 3/3 (100.0%)
- **Verbatim Excerpt Verification Rate:** 9/9 (100.0%)
- **Overall Accuracy:** 100.0%

### Live Production Acceptance
Verified against `https://relay2-rho.vercel.app/` in private incognito sessions:
- Demo Lead 1-click login and sample workspace explore: **Pass**
- Dynamic Project Setup Wizard & tenant isolation: **Pass**
- Live GitHub issues ingestion: **Pass**
- Clarification loop (ask, answer, reset to Pending Review): **Pass**
- Version approval, side-by-side diff, and recipient re-acknowledgement: **Pass**
- Ask Relay 6-query intent test: **Pass**

---

## 5. Product Roadmap
- **Q1 2027:** Transactional email for self-service password reset and email invitations; official GitHub and Slack OAuth App integrations.
- **Q2 2027:** AST-level codebase dependency mapping to developer owners; multi-modal handover call transcription with timestamped citation linking; real-time Jira / Linear sync.
- **Q3–Q4 2027:** Enterprise SAML 2.0 SSO; cross-project organization single-point-of-failure dashboards; pre-departure handover readiness scoring.
