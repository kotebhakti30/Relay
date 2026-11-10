import { readFile } from "node:fs/promises";
import { database } from "../server/db.js";

// The relay2 production build runs this before Vite. schema.sql is transactional.
const sql = await readFile(new URL("../schema.sql", import.meta.url), "utf8");
try {
  await database().query(sql);
} finally {
  await database().end();
}
