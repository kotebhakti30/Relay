import { readFile } from "node:fs/promises";
import { database, transaction } from "../server/db.js";
import { seed } from "../server/seed.js";
if (process.argv[2] === "migrate")
  await database().query(
    await readFile(new URL("../schema.sql", import.meta.url), "utf8"),
  );
else if (process.argv[2] === "seed")
  console.log("Created workspace", await transaction(seed));
else throw Error("Use migrate or seed");
await database().end();
