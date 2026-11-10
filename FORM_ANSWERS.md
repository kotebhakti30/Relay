# Round 2 Form Answers · Relay
Team DEV404 · Dhanashree S. Hingnekar and Bhakti S. Kote

---

## 1. Features completed
* **End-to-End Handover Workflow:** Signed-out visitors can explore an isolated workspace, import markdown/text meeting notes, and reconstruct knowledge claims linked directly to verbatim source excerpts.
* **Evidence & Conflict Grounding:** Contradictory statements across sources (e.g. conflicting issue states or competing owners) are automatically detected and flagged as Conflicting. Corroborated claims from independent records receive a Supported badge.
* **Human-in-the-Loop Review & Immutability:** Leads can review candidate claims (Accept, Reject, Unresolved), edit statements, provide required justifications, and approve an immutable version snapshot protected by database triggers.
* **One-Click Recipient Access:** The lead can open the recipient view in one click with pre-authenticated credentials, or share a revocable secret link and 6-digit access code. Regenerating or revoking access immediately invalidates previous sessions.
* **Recipient Plan & Acknowledgment:** The incoming member sees only approved, permitted records, tracks first-week continuation tasks, records personal notes, and formally acknowledges handover receipt.
* **Real AI Extraction:** Google Gemini (`gemini-2.5-flash`) extraction with structured JSON schemas, server-side verbatim verification, and honest labeling (`Extractor · AI-assisted` vs `Extractor · Rule-based`).
* **Ask Relay (Evidence-Backed Chatbot):** Server-side grounded Q&A with database query-layer role filtering, verified citation checking, honest confidence reporting, and prompt injection defense.
* **About & Limitations Page:** A dedicated, transparent reference on supported sources, role boundaries, and unbuilt features.

---

## 2. Technology details
* **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, Lucide icons, React Router (HashRouter).
* **Backend:** Single-origin Node.js API hosted as serverless functions on Vercel.
* **Database:** PostgreSQL (Neon cloud serverless PostgreSQL with connection pooling and SSL).
* **AI Provider:** Official Google Gemini API (`gemini-2.5-flash`) via REST with strict JSON schema definitions; deterministic heuristic rules fallback.
* **Security & Auth:** HMAC-signed session bearer tokens (7-day validity), secret share URLs with hash-fragment tokens (never transmitted in server HTTP referrers), database query-layer access filtering, and input capping (max 8,000 characters per note, max 500 characters per chat prompt).
* **Database Immutability:** PostgreSQL triggers reject `UPDATE` and `DELETE` queries on approved snapshots (`handover_versions`) and audit trail logs (`audit_log`).
* **Testing:** 16 server-side unit tests (`node --test`), plus end-to-end browser tests (`@playwright/test`) testing 8-step live journeys, mobile upload, and 6 live chatbot intent queries against production.

---

## 3. Changes since Round 1
* **Single-Origin Deployment:** Consolidated the application into a unified React/Vite and Node.js deployment on Vercel backed by PostgreSQL, eliminating external microservice dependencies.
* **One-Click Incoming Member Flow:** Added a direct "Open as incoming member" button for seamless evaluator inspection alongside manual link/code sharing.
* **Real Gemini Extraction & Verbatim Checks:** Implemented live Gemini integration with strict JSON schema generation, rigorous verbatim excerpt verification, and honest extractor labeling.
* **Ask Relay Chatbot:** Built an evidence-grounded chatbot with query-layer role permissions, citation verification, and prompt injection hardening.
* **Clean Production UI:** Completely removed hackathon/demo wording from user-facing screens and added a small "Sample" tag and a comprehensive "About & limitations" reference.

---

## 4. What does not work yet
* **Self-Service User Signup:** Email/password account creation, organization switching, and tenant onboarding are not built; workspaces use isolated cryptographic session tokens.
* **Email Verification & Recovery:** No transactional email provider is connected; email verification and email password resets are unavailable.
* **Live External Webhooks:** Real-time two-way synchronization with live GitHub, Jira, or Slack workspaces is not built; records are ingested via text/markdown note import and structured sample records.
