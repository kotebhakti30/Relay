# Relay · Knowledge Handover for Engineering Teams

A verifiable, multi-tenant knowledge handover platform for engineering teams. A team lead reviews extracted claims against exact source evidence, resolves knowledge gaps with the departing member, publishes immutable handover snapshots, and shares an audience-scoped continuation plan with incoming developers.

* **Production URL:** [https://relay2-rho.vercel.app/](https://relay2-rho.vercel.app/)
* **Public Repository:** [https://github.com/kotebhakti30/Relay](https://github.com/kotebhakti30/Relay)
* **Round 3 Final Commit:** `69472f6`
* **Team:** DEV404 · Dhanashree S. Hingnekar and Bhakti S. Kote (kotebhakti@gmail.com)

---

## 1. Quick Try for Evaluators

You can evaluate Relay in three different ways:
1. **One-Click Demo Account:** On the start screen, click **"Open as Demo Lead (1-click)"** using the pre-seeded evaluator credentials (`demo@relay.local` / `DemoUser2026!`).
2. **Explore Sample Workspace:** Click **"Explore sample workspace"** to start immediately in an isolated sandbox with the CampusConnect dataset.
3. **Create a Brand-New Organization:** Click **"Create Organization"** to sign up with any email and password, launch the Project Setup Wizard, and configure a custom engineering project.

---

## 2. Key Capabilities Built in Round 3

### A. Accounts, Multi-Tenant Organizations & Project Setup Wizard
* **Authentication:** Password signup and login hashed with `bcryptjs` ($2a$10$...), enforcing minimum 8-character complexity and sliding-window rate limiting.
* **Session Security:** Cryptographically signed HMAC-SHA256 tokens transported via `httpOnly`, `SameSite=Lax`, `Secure` cookies.
* **Tenant Isolation:** Every database query is strictly scoped by organization and project. Users from Company A cannot query or read Company B records.
* **Project Setup Wizard:** 4-step wizard to initialize projects with custom names, departing developer details, incoming developer details, and team members without hardcoded identities.
* **Role-Scoped Project Invites:** Expiring, 48-hour HMAC invite links carrying specific roles (`reviewer`, `departing`, `incoming`).

### B. Live Public GitHub Issues Connector
* **Public REST Ingestion:** Ingests issues from any public GitHub repository (`owner/repo`) via the unauthenticated GitHub REST API.
* **Rate-Limit Resilience:** In case of API throttling (HTTP 403/429), an instant "Paste JSON" tab provides zero-friction import.
* **Permission Snapshots:** Records immutable ingestion metadata in `source_permissions`.

### C. Clarification Loop with Departing Member
* **Inbox:** Dedicated inbox at `/#/clarifications` accessible to project members.
* **Targeted Questions:** Leads trigger questions from the Knowledge Gap Radar or candidate claim cards.
* **Evidence Linking:** Departing member answers are saved as immutable `clarification` records (`CLR-...`) and linked to the claim.
* **Deterministic Re-Review:** Answering a question deterministically resets the claim review state to `Pending Review`.

### D. Handover Versions, Side-by-Side Diff, & Staleness Detection
* **Immutable Version Snapshots:** Handover versions are stored in PostgreSQL with triggers preventing modification.
* **Side-by-Side Diff Viewer:** Visual comparison between any two versions (`/#/history`), highlighting added, removed, and changed claims with field-level before/after cards.
* **Staleness Detection:** Automatically flags draft claims with `Needs re-review` when clarifications are answered, new sources are imported, or 6 weeks have elapsed since review.
* **Version N+1 Re-Acknowledgement:** Handover page displays an "Updated Snapshot" banner on revised handovers, prompting the incoming developer to re-acknowledge receipt.

### E. AI-Assisted Extraction & Ask Relay Assistant
* **Google Gemini Integration:** Uses `gemini-2.5-flash` with structured JSON schema when `LLM_API_KEY` is present; deterministic rules fallback.
* **100% Verbatim Verification:** Every excerpt returned by the model is verified verbatim against raw source text; unverifiable citations are discarded.
* **Ask Relay Intent Routing:** Intent classification classifies queries into greeting, about_me, about_product, project_question, general_knowledge, and restricted. Incoming members cannot query lead-only records.

---

## 3. Real versus Stated Scope Limitations

| System Capability | Implementation Status | Implementation Details |
|---|---|---|
| **Multi-Tenant Accounts & Orgs** | **Real** | bcrypt password hashing, session cookies, rate-limiting, tenant-scoped queries. |
| **Project Setup Wizard** | **Real** | Dynamic project wizard storing custom departing, incoming, and team members. |
| **GitHub Issues Connector** | **Real** | Live unauthenticated GitHub REST API import + JSON paste fallback + permission snapshots. |
| **Clarification Loop** | **Real** | Question assignment, answer inbox, evidence linking (`CLR-...`), deterministic reset to Pending Review. |
| **Version Snapshots & Diff** | **Real** | PostgreSQL triggers enforce immutability; visual side-by-side diffing between any two versions. |
| **Staleness Engine** | **Real** | 6-week age threshold, clarification answer triggers, and new note triggers flag claims. |
| **Knowledge Extraction** | **Real** (Gemini / Rules) | `gemini-2.5-flash` with strict schema; 100% verbatim excerpt verification; honest extractor badge. |
| **Ask Relay Q&A Assistant** | **Real** (Server-side) | 7 intent categories; strict SQL-layer audience filtering; verified citations. |
| **Email Verification & Reset** | **Not built** | Self-service email verification and email password reset are not built; accounts managed by Org Admin. |
| **Private Repo Webhooks** | **Not built** | Private repo sync requiring OAuth app installations is omitted; public REST & JSON paste supported. |

---

## 4. Documentation Index
* **[Architecture & Implementation Summary](file:///docs/ARCHITECTURE.md)** (`docs/ARCHITECTURE.md`)
* **[Testing Strategy & Verification Report](file:///docs/TESTING.md)** (`docs/TESTING.md`)
* **[Product & Engineering Roadmap](file:///docs/ROADMAP.md)** (`docs/ROADMAP.md`)
* **[API Specification](file:///docs/API.md)** (`docs/API.md`)
* **[Build Report](file:///BUILD_REPORT.md)** (`BUILD_REPORT.md`)

---

## 5. Local Setup & Verification

```bash
# 1. Install dependencies
npm ci

# 2. Run all server test suites (25 tests in <2s)
npm test

# 3. Build Vite frontend
npm run build

# 4. Start local server
npm start
```

### Environment Variables (.env)
```ini
DATABASE_URL=postgresql://...
SESSION_SECRET=0123456789abcdef0123456789abcdef0123456789abcdef
LLM_PROVIDER=gemini
GEMINI_MODEL=gemini-2.5-flash
```
