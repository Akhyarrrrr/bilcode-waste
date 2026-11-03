import { createHash } from "node:crypto";
import { Type } from "@sinclair/typebox";
import sharp from "sharp";
import type { FastifyInstance } from "fastify";
import { categories, MAX_IMAGE_BYTES } from "@bilcode/contracts";
import type { Category } from "@bilcode/contracts";
import { db } from "./db.js";
import { requireAuth } from "./auth.js";
import { config } from "./config.js";
import { HttpError, notFound } from "./errors.js";
import { consumeRateLimit } from "./rate-limit.js";
import {
  prediction as predictionSchema,
  upload as uploadSchema,
} from "./schemas.js";
import {
  storeImage,
  imageUrl,
  imageBytes,
  removeImage,
  validImageSignature,
} from "./storage.js";

export async function mediaRoutes(app: FastifyInstance) {
  app.post(
    "/uploads",
    {
      preHandler: requireAuth,
      schema: {
        tags: ["Media"],
        consumes: ["multipart/form-data"],
        description: "Unggah satu foto JPEG, PNG, atau WebP, maksimal 3 MiB.",
        response: { 201: uploadSchema },
      },
    },
    async (req, reply) => {
      await consumeRateLimit(`upload:${req.authUser.id}`, 20, 60000);
      const file = await req.file({
        limits: { fileSize: MAX_IMAGE_BYTES, files: 1, fields: 0 },
      });
      if (!file)
        throw new HttpError(
          400,
          "IMAGE_REQUIRED",
          "Pilih foto terlebih dahulu.",
        );
      const raw = await file.toBuffer();
      if (file.file.truncated)
        throw new HttpError(413, "IMAGE_TOO_LARGE", "Foto maksimal 3 MiB.");
      let normalized: Buffer;
      try {
        const image = sharp(raw, {
          limitInputPixels: 20000000,
          failOn: "error",
        });
        const meta = await image.metadata();
        if (
          !["jpeg", "png", "webp"].includes(meta.format ?? "") ||
          (meta.pages ?? 1) > 1
        )
          throw new Error("Unsupported image");
        normalized = await image
          .rotate()
          .resize({
            width: 1600,
            height: 1600,
            fit: "inside",
            withoutEnlargement: true,
          })
          .webp({ quality: 82 })
          .toBuffer();
      } catch {
        throw new HttpError(
          400,
          "INVALID_IMAGE",
          "Foto harus berupa gambar JPEG, PNG, atau WebP yang valid.",
        );
      }
      const key = await storeImage(normalized);
      try {
        const upload = await db.upload.create({
          data: {
            ownerId: req.authUser.id,
            objectKey: key,
            bytes: normalized.length,
            sha256: createHash("sha256").update(normalized).digest("hex"),
          },
        });
        reply.code(201);
        return { id: upload.id, url: await imageUrl(upload) };
      } catch (error) {
        await removeImage(key).catch((e) =>
          req.log.error(e, "Upload cleanup failed"),
        );
        throw error;
      }
    },
  );
  app.get<{
    Params: { id: string };
    Querystring: { expires?: string; signature?: string };
  }>(
    "/uploads/:id/image",
    {
      schema: {
        tags: ["Media"],
        security: [],
        description:
          "Akses foto dengan URL bertanda tangan yang diterbitkan setelah pemeriksaan izin. Bearer token tidak menggantikan signature.",
        params: Type.Object({ id: Type.String({ format: "uuid" }) }),
        querystring: Type.Object({
          expires: Type.Optional(
            Type.String({
              description: "Unix timestamp dari URL yang diterbitkan server.",
            }),
          ),
          signature: Type.Optional(
            Type.String({
              description:
                "Tanda tangan HMAC dari URL yang diterbitkan server.",
            }),
          ),
        }),
      },
    },
    async (req, reply) => {
      if (
        !validImageSignature(
          req.params.id,
          Number(req.query.expires),
          req.query.signature ?? "",
        )
      )
        throw new HttpError(
          403,
          "INVALID_SIGNATURE",
          "Tautan foto tidak berlaku.",
        );
      const upload = await db.upload.findUnique({
        where: { id: req.params.id },
      });
      if (!upload) throw notFound();
      return reply
        .type("image/webp")
        .header("Cross-Origin-Resource-Policy", "cross-origin")
        .header("Cache-Control", "private, max-age=60")
        .send(await imageBytes(upload.objectKey));
    },
  );
  app.post<{ Body: { uploadId: string } }>(
    "/predictions",
    {
      preHandler: requireAuth,
      schema: {
        tags: ["AI"],
        body: Type.Object(
          { uploadId: Type.String({ format: "uuid" }) },
          { additionalProperties: false },
        ),
        response: { 201: predictionSchema },
      },
    },
    async (req, reply) => {
      const upload = await db.upload.findFirst({
        where: { id: req.body.uploadId, ownerId: req.authUser.id },
      });
      if (!upload) throw notFound();
      await consumeRateLimit(`prediction:${req.authUser.id}`, 10, 60000);
      let result: {
        category: Category;
        confidence: number;
        scores: Record<Category, number>;
        modelVersion: string;
        durationMs: number;
      };
      try {
        const bytes = await imageBytes(upload.objectKey);
        const form = new FormData();
        form.append(
          "file",
          new Blob([new Uint8Array(bytes)], { type: "image/webp" }),
          "report.webp",
        );
        const response = await fetch(`${config.mlUrl}/predict`, {
          method: "POST",
          headers: { "X-API-Key": config.mlKey },
          body: form,
          signal: AbortSignal.timeout(75000),
        });
        if (!response.ok)
          throw new Error(`Inference status ${response.status}`);
        result = (await response.json()) as typeof result;
        const scores = categories.map((c) => result.scores?.[c]);
        if (
          !categories.includes(result.category) ||
          !Number.isFinite(result.confidence) ||
          result.confidence < 0 ||
          result.confidence > 1 ||
          scores.some((s) => !Number.isFinite(s) || s < 0 || s > 1) ||
          Math.abs(scores.reduce((a, b) => a + b, 0) - 1) > 0.01 ||
          !result.modelVersion ||
          result.modelVersion.length > 150 ||
          !Number.isFinite(result.durationMs) ||
          result.durationMs < 0
        )
          throw new Error("Invalid inference response");
      } catch (error) {
        req.log.warn(
          {
            error: error instanceof Error ? error.message : "Inference failed",
          },
          "Inference unavailable",
        );
        throw new HttpError(
          503,
          "AI_UNAVAILABLE",
          "Analisis belum tersedia. Coba lagi atau pilih kategori secara manual.",
        );
      }
      const prediction = await db.prediction.create({
        data: {
          uploadId: upload.id,
          category: result.category,
          confidence: result.confidence,
          scores: {
            ORGANIC: result.scores.ORGANIC,
            PLASTIC: result.scores.PLASTIC,
            PAPER: result.scores.PAPER,
          },
          modelVersion: result.modelVersion,
          durationMs: result.durationMs,
        },
      });
      reply.code(201);
      return prediction;
    },
  );
}
