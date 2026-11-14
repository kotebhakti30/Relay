BEGIN;
CREATE TABLE IF NOT EXISTS workspaces(id uuid PRIMARY KEY, run int NOT NULL DEFAULT 0, dirty boolean NOT NULL DEFAULT false, active boolean NOT NULL DEFAULT true, created_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS users(workspace uuid REFERENCES workspaces, role text CHECK(role in ('reviewer','incoming')), name text NOT NULL, PRIMARY KEY(workspace,role));
CREATE TABLE IF NOT EXISTS source_records(workspace uuid REFERENCES workspaces,id text,title text NOT NULL,type text NOT NULL,author text NOT NULL, recorded_at timestamptz NOT NULL, text text NOT NULL,visibility text CHECK(visibility in ('all','lead_only')),PRIMARY KEY(workspace,id));
CREATE TABLE IF NOT EXISTS claims(workspace uuid REFERENCES workspaces,id text, data jsonb NOT NULL,PRIMARY KEY(workspace,id));
CREATE TABLE IF NOT EXISTS evidence_links(workspace uuid,claim_id text,source_id text,exact_excerpt text NOT NULL,PRIMARY KEY(workspace,claim_id,source_id),FOREIGN KEY(workspace,claim_id) REFERENCES claims ON DELETE CASCADE,FOREIGN KEY(workspace,source_id) REFERENCES source_records);
CREATE TABLE IF NOT EXISTS review_actions(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,workspace uuid REFERENCES workspaces,data jsonb NOT NULL);
CREATE TABLE IF NOT EXISTS handover_versions(workspace uuid REFERENCES workspaces,id int,audience text NOT NULL CHECK(audience='incoming'),snapshot jsonb NOT NULL,PRIMARY KEY(workspace,id));
CREATE TABLE IF NOT EXISTS tasks(workspace uuid,version int,id text,done boolean NOT NULL DEFAULT false,note text NOT NULL DEFAULT '',PRIMARY KEY(workspace,version,id),FOREIGN KEY(workspace,version) REFERENCES handover_versions);
CREATE TABLE IF NOT EXISTS acknowledgements(workspace uuid,version int,at timestamptz DEFAULT now(),PRIMARY KEY(workspace,version),FOREIGN KEY(workspace,version) REFERENCES handover_versions);
CREATE TABLE IF NOT EXISTS audit_log(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,workspace uuid REFERENCES workspaces,at timestamptz NOT NULL DEFAULT clock_timestamp(),actor text NOT NULL,type text NOT NULL,detail text NOT NULL,claim_id text);
CREATE TABLE IF NOT EXISTS rate_limits(bucket text,minute_bucket bigint,hits int NOT NULL,PRIMARY KEY(bucket,minute_bucket));
CREATE OR REPLACE FUNCTION relay_immutable() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'immutable record'; END $$;
DO $$ DECLARE t text; BEGIN FOREACH t IN ARRAY ARRAY['handover_versions','audit_log','review_actions'] LOOP
EXECUTE format('DROP TRIGGER IF EXISTS immutable ON %I',t);
EXECUTE format('CREATE TRIGGER immutable BEFORE UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION relay_immutable()',t);
END LOOP; END $$;
CREATE TABLE IF NOT EXISTS relay_shares(workspace uuid PRIMARY KEY REFERENCES workspaces, generation text NOT NULL, link_hash text UNIQUE, code_hash text UNIQUE, active boolean NOT NULL);

ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS org_id uuid;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS project_id uuid;

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

CREATE TABLE IF NOT EXISTS source_permissions (
  workspace uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  source_id text NOT NULL,
  connected_by text NOT NULL,
  scope text NOT NULL,
  connected_at timestamptz NOT NULL DEFAULT now(),
  meta jsonb DEFAULT '{}'::jsonb,
  PRIMARY KEY(workspace, source_id)
);

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

CREATE TABLE IF NOT EXISTS version_stale_flags (
  workspace uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  claim_id text NOT NULL,
  reason text NOT NULL,
  flagged_at timestamptz DEFAULT now(),
  PRIMARY KEY(workspace, claim_id)
);

COMMIT;
