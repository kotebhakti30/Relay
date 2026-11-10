# Relay
Knowledge handover for teams. A lead reviews claims against their exact source text, publishes a handover and shares a first-week plan with the incoming member.

**Production:** https://relay2-rho.vercel.app/ · [Public source](https://github.com/kotebhakti30/Relay).

## Open a handover
1. Choose **Explore sample workspace** to start with fictional project data.
2. Import a note in **Data Sources** and run **Reconstruction**. Open a claim to inspect its quotation. **Add supporting note** imports another source and reruns matching.
3. In **Review & Approval**, record a decision and reason for every candidate. Select the recipient, confirm suitability and approve.
4. On **Handover**, select **Open as incoming member** to open the recipient view in one click, paste the access link into a private window, or redeem the access code on the landing page. Complete a task and acknowledge receipt. Review the result in **Activity History**.
5. Use **Ask Relay** from anywhere in the workspace to ask evidence-backed questions. Incoming members receive answers strictly restricted to approved, permitted records.

## Real versus Simulated Architecture

| System capability | Real | Simulated / Not built | Implementation detail |
|---|---|---|---|
| **Handover Snapshots & Immutability** | Real | — | PostgreSQL triggers strictly reject `UPDATE` and `DELETE` on published versions and audit logs; verified live. |
| **Source Ingestion** | Real | — | Text input and file upload (.md/.txt), capped at 8,000 chars per note, validated and persisted to database. |
| **Third-Party Connectors** | — | Simulated | Repository commits, task boards, and chat channels are pre-seeded sample records; live GitHub/Slack/Jira OAuth webhooks are not built. |
| **Knowledge Extraction** | Real (AI / Rules) | — | Google Gemini (`gemini-2.5-flash`) with structured JSON schema when `LLM_API_KEY` is configured; deterministic heuristic rules as reliable fallback. Excerpts are verified verbatim against source text; unverified citations are rejected. |
| **Evidence & Corroboration** | Real | — | Deterministic evaluation of temporal window (6 weeks), independent source counts (>=2 for Supported), and conflicting stance detection. |
| **Review & Approvals** | Real | — | Human-in-the-loop review, required justifications, audience tagging, immutable version snapshotting. |
| **Scoped Recipient Access** | Real | — | Cryptographically signed bearer tokens, one-click recipient launch, secret link and 6-digit short code exchange, instant revocation. |
| **Ask Relay (Evidence-Backed Chatbot)** | Real (Server-side) | — | Server-side Gemini grounding with strict database query-layer role filtering; incoming members cannot access lead-only records; verified citation checks discard ungrounded IDs. |
| **User Accounts & Multi-tenancy** | — | Not built | Organization sign-up, user password hashing, and email recovery are omitted in favor of isolated sample workspaces with cryptographic session tokens. |

## Local quick start
Use Node 22.12+ or 24, npm, and a PostgreSQL database. On Windows run the commands in PowerShell. Never put real company or personal data in the sample workspace.

```sh
npm ci
```

Copy `.env.example` to `.env` locally. On Windows use `Copy-Item .env.example .env`. Generate a signing secret locally with `node -e "console.log(require('node:crypto').randomBytes(36).toString('hex'))"`. Keep the result private.

| Server variable | Value |
|---|---|
| DATABASE_URL | Neon PostgreSQL connection string with TLS, or a local PostgreSQL URL |
| SESSION_SECRET | Random private value of at least 32 characters |
| LLM_API_KEY | Optional provider key |
| LLM_PROVIDER | Set to gemini or groq only when configuring a key |
| GEMINI_MODEL | Optional model name (defaults to gemini-2.5-flash) |

```sh
npm run migrate
npm run dev
```

Open http://127.0.0.1:5173. The local command builds Vite and serves its output and the same API handler together. The migration is safe to repeat. Each visit creates sample data on demand when the visitor clicks Explore sample workspace.

## Production setup on Vercel
1. In Neon, create a project. In **SQL Editor**, run `schema.sql` (or run `npm run migrate` using DATABASE_URL).
2. In Vercel connect the GitHub repository **kotebhakti30/Relay** on production branch **main**. Build command: `node scripts/production-migrate.js && npm run build`, output directory: `dist`.
3. Under **Settings → Environment Variables**, add `DATABASE_URL` and `SESSION_SECRET` to Production. Add `LLM_API_KEY` and `LLM_PROVIDER=gemini` to enable Gemini extraction and Ask Relay chatbot. If omitted, Relay runs on tested deterministic rules.
4. Deployments deploy automatically on push to main.

## Tests
```sh
npm test
npm run test:e2e
```
