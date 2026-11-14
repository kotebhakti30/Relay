# Round 3 Final Submission Form Answers
Team DEV404 · Relay

---

### Question 1: Project Name
**Relay**

### Question 2: One-line Tagline / Elevator Pitch
**A verifiable, multi-tenant knowledge handover platform for engineering teams that reconstructs grounded project intelligence from unstructured sources, resolves gaps with departing developers, and publishes immutable, audience-scoped handovers.**

### Question 3: Team Members & Lead Email
- **Team:** DEV404
- **Members:** Dhanashree S. Hingnekar, Bhakti S. Kote
- **Lead Email:** kotebhakti@gmail.com

### Question 4: Live Production URL
**https://relay2-rho.vercel.app/**

### Question 5: Public GitHub Repository URL
**https://github.com/kotebhakti30/Relay**

### Question 6: Production Commit Hash
**`69472f6`** (Derived from Round 2 tag `stable-round2-final` at `3cadcc9ec66bcf76470c8d37fb19f7a5e50bcd10`)

### Question 7: Complete Feature List (What does the product do?)
1. **Multi-Tenant Accounts & Organizations:** Email and password signup and login with bcrypt hashing ($2a$10$...), sliding-window rate limiting, and signed httpOnly session cookies. Users can create and manage organizations, with strict cross-tenant data isolation.
2. **Project Setup Wizard:** 4-step wizard configuring custom project name, code, departing engineer (name, role, last day), incoming engineer (name, role), and team members. All screens and copy read dynamic database values without hardcoded identities.
3. **Multi-Source Data Ingestion:** Ingests meeting notes (markdown/text, capped at 8,000 chars), live GitHub issues from public repositories via REST API (with paste-JSON fallback and permission snapshots), task boards, and team updates.
4. **Knowledge Extraction & Grounding:** Dual-engine extraction using Google Gemini (`gemini-2.5-flash`) with strict JSON schema when configured with `LLM_API_KEY`, and deterministic heuristic rules as a reliable fallback. Every excerpt is verified verbatim against raw source text; unverifiable citations are discarded.
5. **Knowledge Gap Radar & Continuous Corroboration:** Identifies single points of failure, missing owners, and conflicting states (temporal window: 6 weeks; independent sources >=2 for Supported).
6. **Clarification Loop with Departing Member:** Team leads ask targeted questions on uncertain or conflicting claims. Departing members receive questions in a dedicated inbox (`/#/clarifications`), submit answers that persist as evidence (`CLR-...`), and claims deterministically reset to `Pending Review`.
7. **Human-in-the-Loop Review:** Team leads accept, reject, or leave claims unresolved with required rationale, select the target audience, and confirm information appropriateness before publishing.
8. **Immutable Version Snapshots:** Handover versions and audit history are locked in PostgreSQL with database triggers preventing modification or deletion.
9. **Side-by-Side Version Diff & Staleness Engine:** Compares any two version snapshots, highlighting added, removed, and changed claims with field-level before/after cards. Automatically detects stale draft claims based on answered clarifications, new source notes, or 6-week age expiration.
10. **One-Click Recipient Experience:** "Open as incoming member" button opens an authenticated view in one click, enforcing audience access controls (lead-only and rejected claims return HTTP 403/404). Incoming members inspect the First-Week Plan, record personal task notes, and formally acknowledge or re-acknowledge receipt.
11. **Ask Relay (Evidence-Backed Assistant):** Server-side interactive assistant featuring a 7-step intent classifier (greeting, about_me, about_product, project_question, general_knowledge, restricted, unsafe). Filters unapproved and lead-only data at the database query layer prior to model retrieval.

### Question 8: Architecture & Implementation Summary
- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4, HashRouter, custom state store with dual-session tokens and React ErrorBoundary.
- **Backend:** Node.js serverless functions (`api/relay.js` routing to modular controllers in `server/`).
- **Database:** PostgreSQL on Neon with relational schema (`accounts`, `organisations`, `projects`, `workspaces`, `claims`, `source_records`, `clarification_questions`, `handover_versions`, `audit_log`, `source_permissions`), database-enforced immutability triggers, and strict tenant-scoped queries.
- **AI Integration:** Google Gemini API (`gemini-2.5-flash`) via REST with strict JSON schema enforcement, server-side verbatim excerpt checking, and deterministic regex/heuristic fallback.
- **Security:** bcrypt password hashing (cost factor 10), HMAC-SHA256 session signatures, httpOnly/SameSite session cookies, sliding-window login rate limiting, prompt injection defenses, and strict SQL query-layer audience scoping.

### Question 9: Improvements Completed After Round 2
1. **Improvement 1 (Real Sources & Accounts):** Email and password authentication with bcrypt hashing, rate limiting, httpOnly signed cookies, organization management, 4-step dynamic Project Setup Wizard, tenant isolation guarantees, and live public GitHub repository issues connector.
2. **Improvement 2 (Clarification Loop with Departing Member):** Dedicated clarification inbox (`/#/clarifications`), targeted question creation from gaps, authoritative answer submissions linked as persistent evidence (`CLR-...`), and deterministic re-labelling to `Pending Review`.
3. **Improvement 3 (Handover Versions, Diff & Re-Review):** Side-by-side version comparison viewer (`/#/history`), automated staleness detection (answered clarifications, new sources, 6-week threshold), Version N+1 updated snapshot banner, and recipient re-acknowledgement flow.
4. **Extraction Accuracy Evaluation:** Created `server/accuracy.test.js` and `test-fixtures/ground-truth.json` measuring 100% precision and recall across 3 diverse company contexts with 100% verbatim verification.
5. **UI & Terminology Polish:** Removed all forbidden terminology; added evaluator demo account card (`demo@relay.local`); added React ErrorBoundary; expanded test suite to 25 automated tests in `npm test` running in 1.7s.

### Question 10: Testing Details & Verification Numbers
- **Server Test Suites:** 25 automated tests across 5 files (`rules.test.js`, `reconstruction.test.js`, `chat.test.js`, `tenant.test.js`, `accuracy.test.js`), all passing in 1.7 seconds.
- **Extraction Accuracy:** 9 out of 9 target claims matched across 3 distinct company domains (FinTech, Digital Health, Fleet Logistics) with 100% verbatim quote verification.
- **Browser Acceptance Tests:** 13-step end-to-end handover flow verified live against `https://relay2-rho.vercel.app/` in private incognito sessions with zero console errors.

### Question 11: Future Roadmap
- **Near-Term:** Transactional email integration for self-service password reset and email invitations; OAuth 2.0 app installations for GitHub and Slack.
- **Medium-Term:** AST-level codebase dependency mapping to developer owners; multi-modal handover call transcription with verbatim citation linking; real-time Jira and Linear status synchronization.
- **Long-Term:** Enterprise SAML 2.0 SSO; cross-project organization single-point-of-failure dashboards; pre-departure handover readiness scoring.
