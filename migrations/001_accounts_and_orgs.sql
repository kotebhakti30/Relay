BEGIN;

-- 1. Accounts & Organizations
CREATE TABLE IF NOT EXISTS accounts (
  id uuid PRIMARY KEY,
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS organisations (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  created_by uuid REFERENCES accounts(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS org_members (
  org_id uuid REFERENCES organisations(id) ON DELETE CASCADE,
  account_id uuid REFERENCES accounts(id) ON DELETE CASCADE,
  role text NOT NULL CHECK(role in ('admin', 'member')),
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY(org_id, account_id)
);

-- 2. Projects & Workspace scoping
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS org_id uuid;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS project_id uuid;

CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY,
  org_id uuid REFERENCES organisations(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text NOT NULL,
  description text NOT NULL,
  departing_name text NOT NULL,
  departing_role text NOT NULL,
  departing_last_day text NOT NULL,
  incoming_name text NOT NULL,
  incoming_role text NOT NULL,
  team_members jsonb NOT NULL DEFAULT '[]'::jsonb,
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS project_members (
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  account_id uuid REFERENCES accounts(id) ON DELETE CASCADE,
  role text NOT NULL CHECK(role in ('admin', 'reviewer', 'departing', 'incoming')),
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY(project_id, account_id)
);

CREATE TABLE IF NOT EXISTS project_invites (
  id uuid PRIMARY KEY,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  token_hash text UNIQUE NOT NULL,
  role text NOT NULL CHECK(role in ('admin', 'reviewer', 'departing', 'incoming')),
  invited_by uuid REFERENCES accounts(id) ON DELETE SET NULL,
  expires_at timestamptz NOT NULL,
  revoked boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- 3. Source Permissions & Provenance Snapshot (GitHub / Connectors)
CREATE TABLE IF NOT EXISTS source_permissions (
  workspace uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  source_id text NOT NULL,
  connected_by text NOT NULL,
  scope text NOT NULL,
  connected_at timestamptz NOT NULL DEFAULT now(),
  meta jsonb DEFAULT '{}'::jsonb,
  PRIMARY KEY(workspace, source_id)
);

-- 4. Clarification Loop (Questions & Answers for departing member)
CREATE TABLE IF NOT EXISTS clarification_questions (
  id uuid PRIMARY KEY,
  workspace uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  claim_id text NOT NULL,
  gap_id text,
  question text NOT NULL,
  assigned_to text NOT NULL,
  due_date text,
  status text NOT NULL CHECK(status in ('open', 'answered', 'closed')),
  created_by text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS clarification_answers (
  id uuid PRIMARY KEY,
  question_id uuid REFERENCES clarification_questions(id) ON DELETE CASCADE,
  answer text NOT NULL,
  answered_by text NOT NULL,
  answered_at timestamptz DEFAULT now()
);

-- 5. Versioning & Stale Tracking
CREATE TABLE IF NOT EXISTS version_stale_flags (
  workspace uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  claim_id text NOT NULL,
  reason text NOT NULL,
  flagged_at timestamptz DEFAULT now(),
  PRIMARY KEY(workspace, claim_id)
);

COMMIT;
