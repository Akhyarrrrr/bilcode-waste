import "dotenv/config";
import { resolve } from "node:path";
const production = process.env.NODE_ENV === "production";
const storage = process.env.STORAGE_DRIVER ?? "local";
const secret =
  process.env.SESSION_SECRET ??
  (production ? "" : "local-development-only-secret-at-least-32-characters");
if (secret.length < 32)
  throw new Error("SESSION_SECRET must contain at least 32 characters.");
if (!["local", "vercel-blob"].includes(storage))
  throw new Error("Unknown STORAGE_DRIVER.");
if (production && storage === "local")
  throw new Error("Production requires private cloud object storage.");
if (storage === "vercel-blob" && !process.env.BLOB_READ_WRITE_TOKEN)
  throw new Error("BLOB_READ_WRITE_TOKEN is required.");
export const config = {
  version: "1.0.0",
  production,
  secret,
  port: Number(process.env.PORT ?? 3001),
  apiUrl: process.env.API_URL ?? "http://localhost:3001",
  webOrigins: (process.env.WEB_ORIGIN ?? "http://localhost:5173")
    .split(",")
    .map((s) => s.trim()),
  databaseUrl:
    process.env.DATABASE_URL ??
    "postgresql://bilcode:bilcode@localhost:5433/bilcode",
  storage,
  blobToken: process.env.BLOB_READ_WRITE_TOKEN ?? "",
  storageDir: resolve(process.env.LOCAL_STORAGE_DIR ?? "../../.local/uploads"),
  mlUrl: process.env.ML_URL ?? "http://localhost:8000",
  mlKey: process.env.ML_API_KEY ?? "",
  // Vercel overwrites X-Forwarded-For at its edge, so the header is only trusted there.
  trustProxy: Boolean(process.env.VERCEL),
  // Defaults to the seeded shared accounts so a deploy cannot forget to lock them.
  demoLockedEmails: (
    process.env.DEMO_LOCKED_EMAILS ??
    "admin@bilcode-waste.test,user@bilcode-waste.test"
  )
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean),
};
