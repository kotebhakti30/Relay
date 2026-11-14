# Relay: Testing Strategy & Verification Report

## 1. Overview
Relay implements a multi-tiered test suite ensuring determinism, safety, multi-tenant isolation, and extraction accuracy. All test numbers in this document reflect actual runs executed via Node.js native test runner (`node --test`) and Playwright.

```bash
npm test
# Runs: server/rules.test.js server/reconstruction.test.js server/chat.test.js server/tenant.test.js server/accuracy.test.js
# Result: 25 tests, 25 pass, 0 fail (duration: ~1.7s)
```

---

## 2. Server-Side Test Suites

### Suite 1: `server/rules.test.js` (Core Evidence & Authority)
- **Exact Quotes:** Whitespace differences normalized; non-verbatim excerpts rejected.
- **Corroboration Ranking:** Contradictions outrank stale and low-authority sources.
- **Publish Safeguards:** Only reviewed, permitted claims can be approved and published.
- **HMAC Signatures:** Rejects tampered role or workspace tokens.
- **State Grounding:** Arbitrary ownership claims and conflicting source records grounded to evidence.
- **Hallucination Prevention:** Provider cannot cite unseen records or fabricate quotations.

### Suite 2: `server/reconstruction.test.js` (Reconstruction Logic)
- **Review Preservation:** Reconstruction preserves existing reviewed identities when new notes arrive.
- **Corroboration Isolation:** Stale notes or repeated imports alone cannot corroborate an ownership claim.
- **Competitor Retention:** Repeated reconstruction keeps competing owners' claims as distinct pending items.

### Suite 3: `server/chat.test.js` (Ask Relay Intent & Guardrails)
- **Greeting Intent:** "hii" returns warm greeting and 3 clickable suggestions without refusal.
- **About Me Intent:** "what is my role" answers from session context without an LLM model call.
- **General Knowledge Intent:** Answers labeled *"General answer, not from your project sources"* with zero project claims in prompt.
- **Audience Privacy:** Incoming member prompts never contain lead-only or unapproved text.
- **Citation Verification:** Discards unverified citations or hallucinated source IDs.
- **Evidence Refusal:** Questions without sufficient evidence return structured refusals with related answerable questions.
- **Injection Neutralization:** Prompt injection embedded in meeting notes or chat questions is neutralized.

### Suite 4: `server/tenant.test.js` (Accounts, Orgs & Round 3 Features)
- **Account & Org Creation:** Signup hashes password with bcrypt, creates organization, assigns Admin.
- **Credential Validation:** Validates email/password and rejects incorrect credentials.
- **Project Setup Wizard:** Creates dynamic project without hardcoded names or identifiers.
- **Tenant Isolation:** User from Company A cannot list, read, or modify Company B projects or claims.
- **Project Invites:** Expiring, role-scoped invite links created by lead and accepted by recipients.
- **GitHub Ingestion:** Public issues imported as source records with permission snapshot.
- **Clarification Loop:** Question creation and answer submission moves claim to `Pending Review`.
- **Version Diff:** Highlights added, removed, and changed claims; excludes restricted data for incoming view.

### Suite 5: `server/accuracy.test.js` (Ground-Truth Extraction Accuracy)
- Evaluates extraction pipeline across **3 diverse company contexts** (FinTech, Digital Health, Fleet Logistics) using `test-fixtures/ground-truth.json`.
- Measures category classification, owner assignment accuracy, and 100% verbatim excerpt verification.

---

## 3. Extraction Accuracy Evaluation Report

The evaluation was executed against 3 independent company contexts with 9 ground-truth claims:

| Company Domain | Ownership Extraction | Decision Extraction | Blocker Extraction | Verbatim Quote Verification |
| :--- | :---: | :---: | :---: | :---: |
| **ApexPay (FinTech)** | 100% (Priya) | 100% (CockroachDB migration) | 100% (Card webhook failure) | 100% Verifiable |
| **HealthBridge (Digital Health)** | 100% (Carlos) | 100% (WebRTC adoption) | 100% (Prescription token expired) | 100% Verifiable |
| **RoutePulse (Fleet Logistics)** | 100% (Sarah) | 100% (Telemetry partitioning)| 100% (Kafka disk pressure) | 100% Verifiable |
| **Overall Metrics** | **3/3 (100%)** | **3/3 (100%)** | **3/3 (100%)** | **9/9 (100%)** |

```
--- Extraction Accuracy Report ---
Evaluated 3 diverse company contexts with 9 target claims:
Total Matched: 9/9 (100.0%)
Ownership Accuracy: 3/3 (100.0%)
Decisions Accuracy: 3/3 (100.0%)
Blockers Accuracy: 3/3 (100.0%)
Verbatim Excerpt Verification Rate: 9/9 (100.0%)
-----------------------------------
```

---

## 4. End-to-End Playwright Acceptance Tests

### 4.1 13-Step Production Handover Flow (`tests/workflow.spec.ts`)
1. **Start Screen:** Open landing page and click "Explore sample workspace".
2. **Sources:** Import a new meeting note regarding ownership transition.
3. **Reconstruction:** Trigger reconstruction and confirm new candidate claim appears with verbatim excerpt.
4. **Evidence Inspection:** Inspect conflicting payment claim, verify two distinct sources cited.
5. **Human Review:** Review and edit candidate claims, set decision states (Accepted, Rejected, Unresolved).
6. **Audience Confirmation:** Select target audience ("Incoming Developer"), confirm appropriateness.
7. **Approval:** Publish immutable Version 1 snapshot.
8. **Incoming Access:** Click "Open as incoming member" in one click.
9. **Role Isolation Check:** Verify incoming member cannot access `/review`, `/sources`, or lead-only claims.
10. **First-Week Plan:** Open continuation plan, inspect tasks, add personal notes, mark task complete.
11. **Receipt Acknowledgment:** Submit formal receipt acknowledgment.
12. **Version History:** Verify activity log and snapshot immutability.
13. **Ask Relay Q&A:** Query project knowledge and verify role-scoped answers.

### 4.2 Round 3 Features Flow (`tests/r3-features.spec.ts`)
- Seeded demo account card visible on landing page with 1-click lead login.
- Clarifications inbox accessible at `/#/clarifications`.
- Side-by-side version comparison accessible at `/#/history`.
- About & limitations page accessible at `/#/about` with clear AI vs. rule-based disclosures and limitation notices.
