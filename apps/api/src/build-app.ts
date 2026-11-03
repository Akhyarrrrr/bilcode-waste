import Fastify from "fastify";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import multipart from "@fastify/multipart";
import swagger from "@fastify/swagger";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { MAX_IMAGE_BYTES } from "@bilcode/contracts";
import { config } from "./config.js";
import { authRoutes } from "./auth.js";
import { reportRoutes } from "./reports.js";
import { mediaRoutes } from "./media.js";
import { userRoutes } from "./users.js";
import { HttpError } from "./errors.js";
import { registerErrorSchemas } from "./schemas.js";
import { statusRoutes } from "./status.js";
export async function buildApp(
  options: { logger?: boolean; factory?: typeof Fastify } = {},
) {
  const app = (options.factory ?? Fastify)({
    logger:
      options.logger === false
        ? false
        : {
            redact: [
              "req.headers.authorization",
              "req.headers.cookie",
              'res.headers["set-cookie"]',
            ],
          },
    bodyLimit: MAX_IMAGE_BYTES + 65536,
    trustProxy: config.trustProxy,
    ajv: { customOptions: { removeAdditional: false } },
  });
  await app.register(cookie);
  await app.register(cors, { origin: config.webOrigins, credentials: true });
  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(multipart, {
    limits: { fileSize: MAX_IMAGE_BYTES, files: 1, fields: 0 },
  });
  await app.register(swagger, {
    openapi: {
      info: {
        title: "Bilcode Waste API",
        version: config.version,
        description: [
          "API sistem pelaporan dan penanganan sampah: laporan dengan foto dan GPS, saran kategori dari model klasifikasi, alur status, statistik, dan manajemen pengguna.",
          "",
          '**Autentikasi.** Web memakai cookie HttpOnly `bw_session`. Mobile dan klien API mengirim `"client": "mobile"` saat login atau daftar untuk menerima token, lalu memakai header `Authorization: Bearer <token>`. Token bukan JWT; server hanya menyimpan hash-nya.',
          "",
          "**Alur status.** `PENDING → IN_PROGRESS → COMPLETED`, atau `PENDING`/`IN_PROGRESS → REJECTED` dengan catatan wajib.",
          "",
          "**Error.** Semua error berbentuk `{ error: { code, message, requestId } }` dengan pesan berbahasa Indonesia.",
          "",
          "Akun demo: `admin@bilcode-waste.test` / `BilcodeAdmin2026!` dan `user@bilcode-waste.test` / `BilcodeUser2026!`.",
        ].join("\n"),
      },
      servers: [{ url: config.apiUrl }],
      tags: [
        { name: "Auth", description: "Daftar, masuk, keluar, dan profil" },
        { name: "Reports", description: "Laporan, status, dan export CSV" },
        { name: "Dashboard", description: "Statistik laporan" },
        { name: "Media", description: "Unggah dan akses foto" },
        { name: "AI", description: "Prediksi kategori dari foto" },
        { name: "Users", description: "Manajemen pengguna (admin)" },
        { name: "Health", description: "Status layanan" },
      ],
      components: {
        securitySchemes: {
          session: {
            type: "http",
            scheme: "bearer",
            description: "Opaque session token, bukan JWT.",
          },
        },
      },
      security: [{ session: [] }],
    },
  });
  const require = createRequire(import.meta.url);
  const docsAssets = [
    [
      "swagger-ui.css",
      "text/css",
      require.resolve("@fastify/swagger-ui/static/swagger-ui.css"),
    ],
    [
      "swagger-ui-bundle.js",
      "application/javascript",
      require.resolve("@fastify/swagger-ui/static/swagger-ui-bundle.js"),
    ],
  ] as const;
  for (const [name, contentType, path] of docsAssets) {
    const bytes = readFileSync(path);
    app.get(`/docs/assets/${name}`, { schema: { hide: true } }, (_req, reply) =>
      reply.type(contentType).send(bytes),
    );
  }
  app.get("/docs", { schema: { hide: true } }, (_req, reply) =>
    reply
      .type("text/html")
      .send(
        `<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Dokumentasi API · Bilcode Waste</title><link rel="stylesheet" href="/docs/assets/swagger-ui.css"></head><body><div id="swagger-ui"></div><script src="/docs/assets/swagger-ui-bundle.js"></script><script>SwaggerUIBundle({url:'/openapi.json',dom_id:'#swagger-ui',persistAuthorization:false,docExpansion:'list',defaultModelsExpandDepth:-1,displayRequestDuration:true});</script></body></html>`,
      ),
  );
  registerErrorSchemas(app);
  app.decorateRequest("authUser");
  app.addHook("onRequest", async (req) => {
    if (
      ["POST", "PUT", "PATCH", "DELETE"].includes(req.method) &&
      req.cookies.bw_session &&
      !req.headers.authorization
    ) {
      if (
        !req.headers.origin ||
        ![...config.webOrigins, new URL(config.apiUrl).origin].includes(
          req.headers.origin,
        )
      )
        throw new HttpError(
          403,
          "INVALID_ORIGIN",
          "Origin permintaan tidak diizinkan.",
        );
    }
  });
  app.addHook("onSend", async (_req, reply) => {
    // Default to no-store; routes that set their own policy (signed images) keep it.
    if (!reply.hasHeader("Cache-Control"))
      reply.header("Cache-Control", "no-store");
  });
  app.setErrorHandler((error, req, reply) => {
    const e = error as Error & {
      statusCode?: number;
      code?: string;
      validation?: unknown;
    };
    if (e.validation)
      return reply.code(400).send({
        error: {
          code: "INVALID_INPUT",
          message: "Periksa isian. Format atau nilai data belum sesuai.",
          requestId: req.id,
        },
      });
    if (e.code === "P2002")
      return reply.code(409).send({
        error: {
          code: "DUPLICATE",
          message:
            "Data sudah digunakan. Periksa email atau laporan yang dikirim.",
          requestId: req.id,
        },
      });
    const status =
      e.statusCode && e.statusCode >= 400 && e.statusCode < 500
        ? e.statusCode
        : e instanceof HttpError
          ? e.statusCode
          : 500;
    if (status >= 500) req.log.error(error);
    return reply.code(status).send({
      error: {
        code:
          e instanceof HttpError
            ? e.code
            : status === 413
              ? "IMAGE_TOO_LARGE"
              : "SERVER_ERROR",
        message:
          e instanceof HttpError
            ? e.message
            : status === 413
              ? "Foto maksimal 3 MiB."
              : status < 500
                ? "Permintaan tidak dapat diproses."
                : "Terjadi gangguan server. Coba kembali.",
        requestId: req.id,
      },
    });
  });
  await statusRoutes(app);
  await app.register(
    async (api) => {
      await authRoutes(api);
      await reportRoutes(api);
      await userRoutes(api);
      await mediaRoutes(api);
    },
    { prefix: "/api/v1" },
  );
  app.get("/openapi.json", { schema: { hide: true } }, () => app.swagger());
  await app.ready();
  return app;
}
