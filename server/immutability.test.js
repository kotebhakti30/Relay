import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID, randomBytes } from "node:crypto";
import { mkdtemp, readFile, appendFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import EmbeddedPostgres from "embedded-postgres";
import pg from "pg";
test("Database refuses edits and deletion of approved versions and audit events", async () => {
  const dir = await mkdtemp(join(tmpdir(), "relay-immutable-")),
    password = randomBytes(20).toString("hex");
  const db = new EmbeddedPostgres({
    databaseDir: dir,
    user: "relay",
    password,
    port: 55479,
    persistent: false,
    autoRehydrateSymlinks: true,
    onLog: () => {},
  });
  await db.initialise();
  await appendFile(
    join(dir, "postgresql.conf"),
    "\nunix_socket_directories=''\n",
  );
  await db.start();
  const c = new pg.Client({
    host: "127.0.0.1",
    port: 55479,
    user: "relay",
    password,
    database: "postgres",
  });
  try {
    await c.connect();
    await c.query(await readFile("schema.sql", "utf8"));
    const id = randomUUID();
    await c.query("INSERT INTO workspaces(id) VALUES($1)", [id]);
    await c.query(
      "INSERT INTO handover_versions VALUES($1,1,'incoming','{}')",
      [id],
    );
    await c.query(
      "INSERT INTO audit_log(workspace,actor,type,detail) VALUES($1,'Riya','Approved','Version 1')",
      [id],
    );
    for (const q of [
      "UPDATE handover_versions SET snapshot='{}'",
      "DELETE FROM handover_versions",
      "UPDATE audit_log SET detail='changed'",
      "DELETE FROM audit_log",
    ])
      await assert.rejects(c.query(q), /immutable record/);
  } finally {
    try {
      await c.end();
    } catch {}
    try {
      await db.stop();
    } catch {}
    try {
      await rm(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 500 });
    } catch {}
  }
});
