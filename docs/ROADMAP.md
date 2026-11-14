# Relay: Product & Engineering Roadmap

## Vision
To establish Relay as the standard knowledge continuity protocol for high-velocity software engineering organizations, transforming fragile, unstructured handover conversations into grounded, verifiable, and permanent team intelligence.

---

## Phase 1: Production Hardening & Ecosystem Connectors (Q1 2027)

### 1. Transactional Email & User Lifecycle
- **Self-Service Password Reset:** Integrate transactional email via Resend or Postmark with cryptographically signed, single-use token links.
- **Email Verification:** Verify corporate email addresses on signup to prevent typo-squatting and identity spoofing.
- **Organization Invitations by Email:** One-click team invitations dispatched directly to inbox with automated workspace provisioning.

### 2. Deep Developer Tool Integrations
- **GitHub App & OAuth Flow:** Transition from unauthenticated public REST polling to an official GitHub App supporting private repositories, pull request review discussions, and commit blame analysis.
- **Slack & Discord Bot:** Ingest pinned messages, architectural thread discussions, and incident retrospectives with strict role-based channel scoping.
- **Linear & Jira Sync:** Real-time bidirectional status synchronization for ongoing tasks, epics, and ownership transitions.

---

## Phase 2: Advanced Semantic Architecture & Visual Diffing (Q2 2027)

### 1. Codebase Dependency Graphing
- **AST-Level Ownership Mapping:** Automatically map codebase files, microservices, and infrastructure modules to identified developer owners using git blame and pull request authorship.
- **Architectural Blast Radius:** Detect when a departing developer's ownership area affects downstream microservices or shared database schemas.

### 2. Multi-Modal Handover Sessions
- **Audio & Video Ingestion:** Ingest handover video calls (e.g. Zoom, Google Meet) with automated speech-to-text, speaker diarization, and timestamped verbatim quotation linking.
- **Architecture Diagram OCR:** Parse whiteboard diagrams and architecture sketches, extracting components into candidate knowledge claims.

---

## Phase 3: Enterprise Scale & Governance (Q3–Q4 2027)

### 1. Enterprise Identity & Compliance
- **SAML 2.0 & SCIM Provisioning:** Okta, Azure AD, and Google Workspace SSO integration with automatic deprovisioning on employee offboarding.
- **SOC 2 Type II Compliance & Audit Export:** Comprehensive SIEM event forwarding, cryptographic immutable audit ledger verification, and GDPR data export/deletion.

### 2. Cross-Project Organization Knowledge Graphs
- **Portfolio-Level Gaps:** Cross-project dashboard highlighting key-person dependencies and organizational single points of failure across an entire engineering department.
- **Automated Handover Readiness Score:** Pre-departure score assessing whether critical dependencies, blockers, and vendor contacts have verified successors before the developer's last day.
