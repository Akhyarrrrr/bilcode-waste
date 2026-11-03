import { writeFile } from "node:fs/promises";
import { buildApp } from "../src/build-app.js";
import { db } from "../src/db.js";

const app = await buildApp({ logger: false });
await app.ready();
await writeFile(
  new URL("../../../docs/openapi.json", import.meta.url),
  JSON.stringify(app.swagger(), null, 2) + "\n",
);
await app.close();
await db.$disconnect();
console.log("docs/openapi.json regenerated from route schemas.");
