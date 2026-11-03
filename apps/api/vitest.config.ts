import { defineConfig } from "vitest/config";
const database =
  process.env.TEST_DATABASE_URL ??
  "postgresql://bilcode:bilcode@localhost:5433/bilcode_test";
if (!new URL(database).pathname.endsWith("_test"))
  throw new Error("Tests require a dedicated database ending in _test.");
export default defineConfig({
  test: {
    env: {
      DATABASE_URL: database,
      DIRECT_URL: database,
      STORAGE_DRIVER: "local",
      LOCAL_STORAGE_DIR: "../../.local/test-uploads",
      NODE_ENV: "test",
      DEMO_LOCKED_EMAILS: "demo-locked@example.test",
      // Nothing listens here, so model-dependent tests see a deterministic outage.
      ML_URL: "http://127.0.0.1:9",
    },
    fileParallelism: false,
  },
});
