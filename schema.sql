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
COMMIT;
