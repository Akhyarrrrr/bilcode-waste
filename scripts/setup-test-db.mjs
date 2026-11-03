import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
const require = createRequire(
  new URL("../apps/api/package.json", import.meta.url),
);
const { Client } = require("pg");
const database =
  process.env.TEST_DATABASE_URL ??
  "postgresql://bilcode:bilcode@localhost:5433/bilcode_test";
const target = new URL(database);
if (
  !target.pathname.endsWith("_test") ||
  !/^[a-zA-Z0-9_]+$/.test(target.pathname.slice(1))
)
  throw new Error("Refusing non-test database.");
const admin = new URL(database);
admin.pathname = "/postgres";
const client = new Client({ connectionString: admin.toString() });
await client.connect();
try {
  const exists = await client.query(
    "SELECT 1 FROM pg_database WHERE datname=$1",
    [target.pathname.slice(1)],
  );
  if (!exists.rowCount)
    await client.query(`CREATE DATABASE "${target.pathname.slice(1)}"`);
} finally {
  await client.end();
}
const prismaCli = join(
  dirname(require.resolve("prisma/package.json")),
  "build/index.js",
);
const result = spawnSync(process.execPath, [prismaCli, "migrate", "deploy"], {
  cwd: fileURLToPath(new URL("../apps/api", import.meta.url)),
  env: { ...process.env, DATABASE_URL: database, DIRECT_URL: database },
  stdio: "inherit",
});
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
