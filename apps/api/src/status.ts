import type { FastifyInstance } from "fastify";
import { Type } from "@sinclair/typebox";
import { config } from "./config.js";
import { db } from "./db.js";

const started = Date.now();
const REPO_URL = "https://github.com/Akhyarrrrr/bilcode-waste";

interface Check {
  status: "up" | "down";
  latencyMs: number;
  version?: string;
}

async function timed<T>(work: () => Promise<T>) {
  const begin = performance.now();
  const value = await work();
  return { value, latencyMs: Math.round(performance.now() - begin) };
}

async function checkDatabase(): Promise<Check> {
  try {
    const { latencyMs } = await timed(() => db.$queryRaw`SELECT 1`);
    return { status: "up", latencyMs };
  } catch {
    return { status: "down", latencyMs: 0 };
  }
}

async function checkModel(): Promise<Check> {
  try {
    const { value, latencyMs } = await timed(async () => {
      const response = await fetch(`${config.mlUrl}/health`, {
        signal: AbortSignal.timeout(4000),
      });
      return response.ok
        ? ((await response.json()) as { modelVersion?: string })
        : null;
    });
    return value
      ? { status: "up", latencyMs, version: value.modelVersion }
      : { status: "down", latencyMs };
  } catch {
    return { status: "down", latencyMs: 0 };
  }
}

/** Database is required; a missing model only degrades the service (reports can use manual categories). */
export async function readiness() {
  const [database, model] = await Promise.all([checkDatabase(), checkModel()]);
  const status =
    database.status === "down"
      ? "unavailable"
      : model.status === "down"
        ? "degraded"
        : "ready";
  return { status, version: config.version, checks: { database, model } };
}

const check = Type.Object({
  status: Type.Union([Type.Literal("up"), Type.Literal("down")]),
  latencyMs: Type.Integer(),
  version: Type.Optional(Type.String()),
});
const readinessSchema = Type.Object({
  status: Type.Union([
    Type.Literal("ready"),
    Type.Literal("degraded"),
    Type.Literal("unavailable"),
  ]),
  version: Type.String(),
  checks: Type.Object({ database: check, model: check }),
});

const escape = (text: string) =>
  text.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );

function page(state: Awaited<ReturnType<typeof readiness>>) {
  const label = {
    ready: "Semua layanan berjalan",
    degraded: "Berjalan, model AI tidak tersedia",
    unavailable: "Database tidak dapat dihubungi",
  }[state.status];
  const row = (name: string, c: Check, detail: string) =>
    `<li><span class="dot ${c.status}"></span><span>${name}</span><span class="muted">${
      c.status === "up" ? escape(detail) : "tidak tersedia"
    }</span></li>`;
  const links = [
    ["Dokumentasi API (Swagger)", "/docs"],
    ["OpenAPI JSON", "/openapi.json"],
    ["Health check", "/health/ready"],
    ["Website", config.webOrigins[0] ?? "/"],
    ["Kode sumber", REPO_URL],
  ]
    .map(([text, href]) => `<a href="${escape(href!)}">${text}</a>`)
    .join("");
  return `<!doctype html>
<html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Bilcode Waste API</title>
<style>
:root{--bg:#fafafa;--card:#fff;--fg:#18181b;--muted:#71717a;--line:#e4e4e7;--primary:#047857;--up:#047857;--down:#be123c;color-scheme:light dark}
@media (prefers-color-scheme:dark){:root{--bg:#09090b;--card:#18181b;--fg:#fafafa;--muted:#a1a1aa;--line:#27272a;--primary:#34d399;--up:#34d399;--down:#fb7185}}
*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;background:var(--bg);color:var(--fg);font:15px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif}
main{width:100%;max-width:520px;background:var(--card);border:1px solid var(--line);border-radius:12px;padding:28px}
h1{margin:0;font-size:22px;letter-spacing:-.02em}h1 span{color:var(--primary)}
.status{margin:6px 0 20px;color:var(--muted)}
ul{list-style:none;margin:0 0 20px;padding:0;border-top:1px solid var(--line)}
li{display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:center;padding:12px 0;border-bottom:1px solid var(--line)}
.dot{width:9px;height:9px;border-radius:50%}.dot.up{background:var(--up)}.dot.down{background:var(--down)}
.muted{color:var(--muted);font-size:13px}
nav{display:flex;flex-wrap:wrap;gap:8px}a{color:var(--primary);text-decoration:none;border:1px solid var(--line);border-radius:8px;padding:6px 10px;font-size:14px}a:hover{border-color:var(--primary)}
footer{margin-top:20px;color:var(--muted);font-size:12px}
</style></head><body><main>
<h1>Bilcode <span>Waste</span> API</h1>
<p class="status">${label}. Versi ${escape(state.version)}.</p>
<ul>
${row("Database PostgreSQL", state.checks.database, `${state.checks.database.latencyMs} ms`)}
${row("Model klasifikasi", state.checks.model, state.checks.model.version ?? "")}
</ul>
<nav>${links}</nav>
<footer>Technical assessment Fullstack Developer untuk Bilcode Technology. Bukan layanan resmi Bilcode.</footer>
</main></body></html>`;
}

export async function statusRoutes(app: FastifyInstance) {
  app.get("/", { schema: { hide: true } }, async (_req, reply) =>
    reply.type("text/html; charset=utf-8").send(page(await readiness())),
  );
  app.get(
    "/health",
    {
      schema: {
        tags: ["Health"],
        security: [],
        summary: "Liveness: proses API berjalan",
        response: {
          200: Type.Object({
            status: Type.Literal("ok"),
            service: Type.String(),
            version: Type.String(),
            uptimeSeconds: Type.Integer(),
          }),
        },
      },
    },
    () => ({
      status: "ok" as const,
      service: "bilcode-waste-api",
      version: config.version,
      uptimeSeconds: Math.round((Date.now() - started) / 1000),
    }),
  );
  app.get(
    "/health/ready",
    {
      schema: {
        tags: ["Health"],
        security: [],
        summary: "Readiness: database dan model klasifikasi",
        description:
          "200 jika database tersedia (status `degraded` bila hanya model yang tidak tersedia), 503 jika database tidak dapat dihubungi.",
        response: { 200: readinessSchema, 503: readinessSchema },
      },
    },
    async (_req, reply) => {
      const state = await readiness();
      return reply.code(state.status === "unavailable" ? 503 : 200).send(state);
    },
  );
}
