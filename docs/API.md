# Relay: API Specification & Contracts

## Base Endpoint
All API requests are routed through the serverless handler at:
`/api/relay?action={action}`

Requests accept authentication via:
1. `Cookie: relay_session={token}` (httpOnly session cookie)
2. `Authorization: Bearer {token}` (HMAC-SHA256 signed bearer token)

---

## 1. Authentication & Organization Endpoints

### `POST /api/relay?action=auth/signup`
Creates a user account, initializes an organization, assigns the user as Admin, and returns a signed session token.
- **Request Body:**
  ```json
  {
    "email": "user@example.com",
    "password": "Password123!",
    "name": "Alex Lead",
    "orgName": "Acme Corp"
  }
  ```
- **Response (200):**
  ```json
  {
    "token": "...",
    "user": { "id": "uuid", "email": "user@example.com", "name": "Alex Lead" },
    "org": { "id": "uuid", "name": "Acme Corp" }
  }
  ```

### `POST /api/relay?action=auth/login`
Validates credentials against bcrypt password hash, enforces rate limiting, and issues a session token.
- **Request Body:**
  ```json
  {
    "email": "user@example.com",
    "password": "Password123!"
  }
  ```
- **Response (200):** Returns session token and user profile.

### `POST /api/relay?action=auth/demo-login`
One-click evaluator login initializing the seeded demo administrator account (`demo@relay.local`).

### `POST /api/relay?action=auth/logout`
Clears the `relay_session` cookie and invalidates client session state.

### `GET /api/relay?action=auth/me`
Returns current authenticated user details, organization memberships, and role assignments.

---

## 2. Project Wizard & Membership Endpoints

### `POST /api/relay?action=projects`
Initializes a new isolated project within the caller's organization.
- **Request Body:**
  ```json
  {
    "name": "Payment Gateway v2",
    "code": "PGW",
    "description": "Next-gen checkout service",
    "departing": { "name": "Carlos", "role": "Senior Engineer", "lastDay": "2026-12-01" },
    "incoming": { "name": "Aarav", "role": "Staff Engineer" },
    "people": [
      { "name": "Sarah", "role": "Tech Lead" }
    ]
  }
  ```

### `GET /api/relay?action=projects`
Lists all projects accessible within the caller's organization.

### `POST /api/relay?action=invites`
Generates a time-limited (48-hour), cryptographically secure invite link carrying a designated role.
- **Request Body:**
  ```json
  {
    "projectId": "uuid",
    "role": "reviewer"
  }
  ```

---

## 3. Data Ingestion & GitHub Connector

### `POST /api/relay?action=sources/import`
Ingests a Markdown or plain-text meeting note.
- **Request Body:**
  ```json
  {
    "title": "Architecture Sync 24",
    "text": "Note contents (up to 8,000 characters)...",
    "visibility": "all"
  }
  ```

### `POST /api/relay?action=sources/github`
Imports issues from a public GitHub repository or JSON payload.
- **Request Body:**
  ```json
  {
    "repo": "owner/repo",
    "pasteJson": "[optional array of raw GitHub issue objects]"
  }
  ```
- **Response (200):** Records permission snapshot and returns count of imported issues.

---

## 4. Clarification Loop Endpoints

### `POST /api/relay?action=questions`
Creates a clarification question linked to a candidate claim or knowledge gap.
- **Request Body:**
  ```json
  {
    "claimId": "CLM-001",
    "question": "Who will own the nightly reconciliation cron job?",
    "assignedTo": "Carlos",
    "dueDate": "2026-11-20"
  }
  ```

### `GET /api/relay?action=questions`
Lists all clarification questions for the current workspace. Filterable by status (`open`, `answered`).

### `POST /api/relay?action=questions/:id/answers`
Submits an answer authored by the departing member.
- **Request Body:**
  ```json
  {
    "answer": "Priya will own the reconciliation worker starting next Monday."
  }
  ```
- **Behavior:** Deterministically creates source record `CLR-...`, links to claim, and resets claim review state to `Pending Review`.

---

## 5. Handover Snapshot & Version Diff Endpoints

### `POST /api/relay?action=approve`
Publishes an immutable handover version for the designated audience.
- **Request Body:**
  ```json
  {
    "audience": "incoming",
    "appropriate": true
  }
  ```

### `GET /api/relay?action=versions/diff&from=1&to=2`
Returns side-by-side structured diff between two snapshot versions.
- **Response (200):**
  ```json
  {
    "fromVersion": 1,
    "toVersion": 2,
    "added": [...],
    "removed": [...],
    "changed": [
      {
        "id": "CLM-001",
        "statement": "...",
        "changes": [{ "field": "owner", "before": "Carlos", "after": "Priya" }]
      }
    ],
    "hasMaterialChanges": true,
    "summary": "1 added, 0 removed, 1 changed"
  }
  ```

### `GET /api/relay?action=versions/stale`
Identifies candidate claims flagged with `Needs re-review` due to answered clarifications, new source notes, or 6-week age expiration.

---

## 6. Ask Relay Q&A Endpoint

### `POST /api/relay?action=chat`
Interactive natural-language query engine.
- **Request Body:**
  ```json
  {
    "question": "Who owns the nightly cron job?"
  }
  ```
- **Response (200):**
  ```json
  {
    "intent": "project_question",
    "answer": "The nightly cron job is owned by Priya.",
    "citations": [
      { "id": "CLM-001", "sourceId": "REC-01", "quote": "Priya owns the payment retry queue..." }
    ]
  }
  ```
