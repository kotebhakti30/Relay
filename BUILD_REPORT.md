# Relay build report
Team DEV404 · Dhanashree S. Hingnekar and Bhakti S. Kote

[Open Relay](https://relay2-rho.vercel.app/) · [Public source](https://github.com/kotebhakti30/Relay)

## Changes since Round 1
The original proposal described a separate Python service and vector search. The shipped application keeps React and Vite and runs extraction, citation checks and approval through a same-origin Node API. PostgreSQL retains source records, evidence, decisions, handover versions, tasks and receipts. This reduces deployment dependencies and makes direct permission checks testable. The current scope supports anonymous sample workspaces and revocable recipient access. Repository, board and chat records are synthetic.

## Worked handover and live baseline
On 10 November 2026, a signed-out production visitor imported a nightly-digest ownership note. A confirmation submitted from **Add supporting note** produced two exact citations on the same reviewed claim. Its label changed from Insufficient Evidence to Supported. Neither an unrelated note nor a restricted note increased that count. A competing assignment produced Conflicting on the lead draft while the incoming session retained its approved version. An incoming member completed a task and acknowledged receipt. Separate private sessions redeemed the invitation and short code. Regenerating access invalidated the previous session and code. The lead revoked the replacement.

The verified baseline commit is `bc4b61f7a780c5af0b65030405ec995ffe5462f7`. Product-copy changes use project data for participant names, role labels and task ownership. The landing page offers one-click sample access. The workspace includes a four-step tour, limitations and the short build hash.

## Verification scope
Ten automated checks and two production-build browser scenarios passed before publication of the product-copy changes. The tests cover the eight-step sample workflow, mobile upload and direct access to restricted resources. The live baseline above used real requests on the public domain. Hosted LLM calls have not been independently verified. Company accounts, organisation switching, project setup, expiring membership invites and public GitHub imports are outside this release. No new tenant or identity migration was applied.

## Public acceptance results · 10 November 2026
Both committed Playwright journeys passed against https://relay2-rho.vercel.app/ on application commit `fe74401e794f4c11429ea5d14a7fa60212acc876`. The live eight-step test took 3.5 minutes. The mobile Markdown upload test took 16.5 seconds.

| Sample workflow step | Production result |
|---|---|
| Signed-out visitor opens an isolated workspace | Pass |
| Import a typed source and see the imported record | Pass |
| Reconstruct a new ownership claim and read its exact quotation | Pass |
| Inspect contradictory sources, correct a claim and refresh | Pass |
| Accept, reject and mark unresolved with reasons, choose the audience and approve | Pass |
| Open the incoming link in a clean session and deny restricted, rejected and pending IDs | Pass |
| Save a task note, mark complete, reload and acknowledge receipt | Pass |
| Read the acknowledgement and review events in lead history and inspect the approved version | Pass |

The additional live corroboration exercise passed on the same commit, including unchanged counts after unrelated and restricted sources, label history after review, and preservation of both owners after a repeated reconstruction. No database schema or environment changes were required. The separate new-company acceptance journey was **not run** because this release does not implement company registration, custom projects or account-based roles.
