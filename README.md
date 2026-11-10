# Relay · DEV404
An evidence-aware handover for CampusConnect. A lead imports notes, checks quotations and publishes a version for Neha. Her access link opens an independent session with only the permitted snapshot and its first-week plan.

**Production:** https://relay2-rho.vercel.app/ · [Public source](https://github.com/kotebhakti30/Relay).

## Try it
1. Click **Try CampusConnect**. Five fictional source records are created in a fresh workspace.
2. Under **Data Sources**, paste “Kabir will own the nightly digest cron job after Aarav leaves.” Import the note, run **Reconstruction**, and inspect its exact quotation.
3. Open **Evidence Explorer**. Compare the staging chat and Issue #34. In **Review & Approval**, correct the payment statement and supply a reason and verification outcome. Accept, reject or mark each candidate unresolved. Choose Neha, confirm and approve.
4. Under **Share with Neha**, open the link in a private window or enter the 12-character access code on the start screen. Regenerate or revoke access from the lead panel. Both actions invalidate previously issued incoming sessions. Complete a first-week task, add a note (saved on leaving the field) and acknowledge receipt. Return to the lead’s **Activity History**. The lead’s session refreshes on window focus, or refresh the page.

## Local quick start
Use Node 22.12+ or 24, npm, and a PostgreSQL database. On Windows run the commands in PowerShell. Never put real company or personal data in this demonstration.

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

```sh
npm run migrate
npm run dev
```

Open http://127.0.0.1:5173. The local command builds Vite and serves its output and the same API handler together. Re-run after editing. The migration is safe to repeat. Each visit creates sample data on demand when the visitor presses Start. The optional `npm run seed` script inserts a fresh sample workspace and prints its ID for database inspection.

## Production setup on Vercel
1. In Neon, create a **Free** project. Choose **Connect**, select the database and role, and copy its pooled connection string. In **SQL Editor**, run the entire repository file `schema.sql`. Alternatively use the migration command above against the same database.
2. In Vercel select **dev407 → relay2 → Settings → Git**. Verify the connected repository is **kotebhakti30/Relay** and the production branch is **main**. The application root is the repository root. Use Vite, build command `npm run build`, and output directory `dist`.
3. Under **Settings → Environment Variables**, add DATABASE_URL and SESSION_SECRET to **Production**. Add LLM_API_KEY and LLM_PROVIDER together only when you intend to use a provider within your free allowance. Omitting both selects the tested rules path. Save. A changed signing secret invalidates existing links.
4. Open **Deployments**, choose the latest main build, select **Redeploy**, and wait for **Ready**. Use **Visit** or **Settings → Domains** to copy the production website address. Open it signed out in a private window. If the production domain prompts for Vercel sign-in, review **Settings → Deployment Protection** for production access.
5. Run the eight-step test on that domain. On Windows PowerShell use the following. Every test run creates new isolated sample workspaces.
```powershell
npm ci
npx playwright install chromium
$env:RELAY_TEST_URL = "https://YOUR-PRODUCTION-DOMAIN"
npm run test:e2e
Remove-Item Env:RELAY_TEST_URL
```

## Architecture and boundaries
React/Vite retains the original navigation, Evidence Explorer, Gap Radar, review console, handover, plan and activity screens. Vercel rewrites /api/* to one Node handler. PostgreSQL transactions serialize workspace changes; database triggers reject updates and deletes to published snapshots, reviews and audit events. Acknowledgements and task progress are separate mutable records. A reset retires only the caller’s workspace and issues a new one.

Server-signed, seven-day bearer links identify the workspace and role. The server verifies the signature and active membership before every authenticated operation. Workspace creation bootstraps the lead session. The incoming session queries only the latest audience snapshot and its tasks. Its claim and source detail endpoints use that same view. The workspace token is kept in session storage; invitation links carry an opaque credential in the URL fragment that the server exchanges for an incoming-only session. Anyone with that link can act as the recipient. Use synthetic data.

Reconstruction separates source batches by visibility. A configured model selects categories and verbatim sentences through a structured response. Deterministic checks accept only known source IDs and matching text after whitespace normalization. The statement uses the selected quotation. Rules compute evidence labels; human review starts at Pending Review. Contradiction matching covers opposite status descriptions for matching subjects. Supported requires two independent records no more than six weeks old. Identical imported text cannot corroborate itself. Contradictory current ownership or status evidence takes precedence. Lead-only records are grouped separately. Reviewer decisions and evidence-label history remain distinct. This is bounded extraction and does not detect all natural-language contradictions.

| Capability | Implementation |
|---|---|
| Workspace, note paste and .txt/.md upload | Real PostgreSQL writes with server-side limits; new user text is processed |
| Repository, task-board and chat examples | Clearly labelled synthetic records seeded per workspace; external connectors are outside this release |
| Extraction | Rules run without keys. Optional Gemini or Groq uses a network call and schema validation. Provider failure selects rules and logs the fallback |
| Evidence and approval | Verified source excerpts, mandatory review reasons, preserved versions, role-filtered access |
| Identity | Simplified signed anonymous access links; no OAuth or independent identity verification |
| First-week tasks | Generated per included claim, saved by version; task notes and receipt survive refresh |
| Provider and deployment verification | See BUILD_REPORT.md for exactly what was exercised |

## Tests
```sh
npm test
npx playwright install chromium
npm run test:e2e
```
The default E2E run starts an isolated real PostgreSQL cluster and serves the production build. No Neon account or model key is required for these local tests. Use a normal non-root user. The runner uses local TCP ports 5173, 55478 and 55479. Optional test-runner settings are RELAY_TEST_URL and PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH; these are not application credentials.

## Team
Dhanashree S. Hingnekar and Bhakti S. Kote · DEV404 · CodersInPune. [Build report](BUILD_REPORT.md) · [Form draft](FORM_ANSWERS.md).
