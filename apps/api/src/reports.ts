import { Type } from "@sinclair/typebox";
import type { FastifyInstance, FastifyRequest } from "fastify";
import {
  canTransition,
  categories,
  categoryLabels,
  reportCode,
  reportLabels,
  statuses,
} from "@bilcode/contracts";
import type { ReportInput, Status } from "@bilcode/contracts";
import type { Prisma } from "./generated/prisma/client.js";
import { db } from "./db.js";
import { requireAdmin, requireAuth } from "./auth.js";
import { HttpError, conflict, notFound } from "./errors.js";
import { imageUrl } from "./storage.js";
import { page, report as reportSchema, statistics } from "./schemas.js";

// Indonesia has no DST, so WIB is a fixed UTC+7 offset.
const WIB_OFFSET = "+07:00";
const wibDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" });
const wibDateTime = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Asia/Jakarta",
  dateStyle: "short",
  timeStyle: "short",
});
const DAY_MS = 86400000;
const TREND_DAYS = 30;
const EXPORT_LIMIT = 5000;

const enumSchema = <T extends string>(values: readonly T[]) =>
  Type.Union(values.map((v) => Type.Literal(v)));
const uuid = Type.String({ format: "uuid" });
const editable = {
  title: Type.String({ minLength: 3, maxLength: 120 }),
  description: Type.String({ minLength: 10, maxLength: 2000 }),
  category: enumSchema(categories),
  latitude: Type.Number({ minimum: -90, maximum: 90 }),
  longitude: Type.Number({ minimum: -180, maximum: 180 }),
  locationLabel: Type.String({ minLength: 2, maxLength: 200 }),
  locationAccuracy: Type.Optional(
    Type.Union([Type.Number({ minimum: 0, maximum: 100000 }), Type.Null()]),
  ),
  uploadId: uuid,
  predictionId: Type.Optional(Type.Union([uuid, Type.Null()])),
};
export const idParams = Type.Object({ id: uuid });
export const paginationSchema = {
  page: Type.Optional(
    Type.Integer({ minimum: 1, maximum: 100000, default: 1 }),
  ),
  pageSize: Type.Optional(
    Type.Integer({ minimum: 1, maximum: 100, default: 20 }),
  ),
  q: Type.Optional(Type.String({ maxLength: 120 })),
};
export interface Filters {
  page?: number;
  pageSize?: number;
  q?: string;
  status?: Status;
  category?: (typeof categories)[number];
  from?: string;
  to?: string;
}
const scopeFilters = {
  q: paginationSchema.q,
  status: Type.Optional(enumSchema(statuses)),
  category: Type.Optional(enumSchema(categories)),
  from: Type.Optional(Type.String({ format: "date" })),
  to: Type.Optional(Type.String({ format: "date" })),
};
const filtersSchema = Type.Object(
  { ...paginationSchema, ...scopeFilters },
  { additionalProperties: false },
);
/** Same filters as the list, without pagination (dashboard and export). */
const scopeSchema = Type.Object(scopeFilters, { additionalProperties: false });
export const includeReport = {
  reporter: { select: { id: true, name: true } },
  upload: true,
  prediction: true,
  history: {
    include: { actor: { select: { id: true, name: true } } },
    orderBy: [{ createdAt: "asc" as const }, { id: "asc" as const }],
  },
} satisfies Prisma.ReportInclude;
type FullReport = Prisma.ReportGetPayload<{ include: typeof includeReport }>;
export async function reportDto(report: FullReport) {
  const {
    upload,
    deletedAt: _deleted,
    reporterId: _reporterId,
    uploadId: _uploadId,
    predictionId: _predictionId,
    clientRequestId: _requestId,
    ...rest
  } = report;
  return {
    ...rest,
    photo: { id: upload.id, url: await imageUrl(upload) },
    createdAt: report.createdAt.toISOString(),
    updatedAt: report.updatedAt.toISOString(),
  };
}
export function reportWhere(
  req: FastifyRequest,
  query: Filters,
): Prisma.ReportWhereInput {
  const createdAt: Prisma.DateTimeFilter = {};
  if (query.from)
    createdAt.gte = new Date(`${query.from}T00:00:00${WIB_OFFSET}`);
  if (query.to)
    createdAt.lt = new Date(
      new Date(`${query.to}T00:00:00${WIB_OFFSET}`).getTime() + DAY_MS,
    );
  if (query.from && query.to && query.from > query.to)
    throw new HttpError(
      400,
      "INVALID_DATE_RANGE",
      "Tanggal awal harus sebelum tanggal akhir.",
    );
  const q = query.q?.trim();
  return {
    deletedAt: null,
    ...(req.authUser.role !== "ADMIN" ? { reporterId: req.authUser.id } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.category ? { category: query.category } : {}),
    ...(query.from || query.to ? { createdAt } : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
            ...(/^\d+$/.test(q) && Number(q) >= 1 && Number(q) <= 2147483647
              ? [{ number: Number(q) }]
              : []),
          ],
        }
      : {}),
  };
}
export async function visibleReport(id: string, req: FastifyRequest) {
  const report = await db.report.findFirst({
    where: { id, ...reportWhere(req, {}) },
    include: includeReport,
  });
  if (!report) throw notFound();
  return report;
}
async function validateMedia(
  input: { uploadId: string; predictionId?: string | null },
  ownerId?: string,
) {
  const upload = await db.upload.findFirst({
    where: { id: input.uploadId, ...(ownerId ? { ownerId } : {}) },
  });
  if (!upload) throw notFound();
  if (
    input.predictionId &&
    !(await db.prediction.findFirst({
      where: { id: input.predictionId, uploadId: upload.id },
    }))
  )
    throw new HttpError(
      400,
      "PREDICTION_MISMATCH",
      "Hasil analisis tidak sesuai dengan foto. Analisis ulang foto ini.",
    );
}
const clean = (body: ReportInput) => {
  if (
    body.title.trim().length < 3 ||
    body.description.trim().length < 10 ||
    body.locationLabel.trim().length < 2
  )
    throw new HttpError(
      400,
      "INVALID_INPUT",
      "Judul, deskripsi, dan lokasi tidak boleh hanya berisi spasi.",
    );
  return {
    title: body.title.trim(),
    description: body.description.trim(),
    category: body.category,
    latitude: body.latitude,
    longitude: body.longitude,
    locationLabel: body.locationLabel.trim(),
    locationAccuracy: body.locationAccuracy ?? null,
    uploadId: body.uploadId,
    predictionId: body.predictionId ?? null,
  };
};
export async function reportRoutes(app: FastifyInstance) {
  app.get<{ Querystring: Filters }>(
    "/reports",
    {
      preHandler: requireAuth,
      schema: {
        tags: ["Reports"],
        querystring: filtersSchema,
        response: { 200: page(reportSchema) },
      },
    },
    async (req) => {
      const page = req.query.page ?? 1,
        pageSize = req.query.pageSize ?? 20;
      const where = reportWhere(req, req.query);
      const [total, rows] = await db.$transaction([
        db.report.count({ where }),
        db.report.findMany({
          where,
          include: includeReport,
          skip: (page - 1) * pageSize,
          take: pageSize,
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        }),
      ]);
      return {
        items: await Promise.all(rows.map(reportDto)),
        total,
        page,
        pageSize,
        pages: Math.ceil(total / pageSize),
      };
    },
  );
  app.post<{ Body: ReportInput }>(
    "/reports",
    {
      preHandler: requireAuth,
      schema: {
        tags: ["Reports"],
        body: Type.Object(
          { ...editable, clientRequestId: uuid },
          { additionalProperties: false },
        ),
        // 200 replays an idempotent submit, 201 creates it.
        response: { 200: reportSchema, 201: reportSchema },
      },
    },
    async (req, reply) => {
      const existing = await db.report.findUnique({
        where: {
          reporterId_clientRequestId: {
            reporterId: req.authUser.id,
            clientRequestId: req.body.clientRequestId,
          },
        },
        include: includeReport,
      });
      if (existing) {
        if (existing.deletedAt) throw conflict();
        return reportDto(existing);
      }
      await validateMedia(req.body, req.authUser.id);
      const data = clean(req.body);
      try {
        const report = await db.report.create({
          data: {
            ...data,
            reporterId: req.authUser.id,
            clientRequestId: req.body.clientRequestId,
            history: {
              create: { actorId: req.authUser.id, toStatus: "PENDING" },
            },
          },
          include: includeReport,
        });
        reply.code(201);
        return reportDto(report);
      } catch (error) {
        if ((error as { code?: string }).code === "P2002") {
          const report = await db.report.findUnique({
            where: {
              reporterId_clientRequestId: {
                reporterId: req.authUser.id,
                clientRequestId: req.body.clientRequestId,
              },
            },
            include: includeReport,
          });
          if (report && !report.deletedAt) return reportDto(report);
        }
        throw error;
      }
    },
  );
  app.get<{ Params: { id: string } }>(
    "/reports/:id",
    {
      preHandler: requireAuth,
      schema: {
        tags: ["Reports"],
        params: idParams,
        response: { 200: reportSchema },
      },
    },
    async (req) => reportDto(await visibleReport(req.params.id, req)),
  );
  app.put<{ Params: { id: string }; Body: ReportInput & { version: number } }>(
    "/reports/:id",
    {
      preHandler: requireAuth,
      schema: {
        tags: ["Reports"],
        params: idParams,
        body: Type.Object(
          { ...editable, version: Type.Integer({ minimum: 1 }) },
          { additionalProperties: false },
        ),
        response: { 200: reportSchema },
      },
    },
    async (req) => {
      const report = await visibleReport(req.params.id, req);
      if (req.authUser.role !== "ADMIN" && report.status !== "PENDING")
        throw new HttpError(
          403,
          "REPORT_LOCKED",
          "Laporan yang sedang diproses tidak dapat diubah.",
        );
      await validateMedia(
        req.body,
        req.body.uploadId === report.uploadId ? undefined : req.authUser.id,
      );
      const result = await db.report.updateMany({
        where: {
          id: report.id,
          version: req.body.version,
          deletedAt: null,
          ...(req.authUser.role === "USER" ? { status: "PENDING" } : {}),
        },
        data: { ...clean(req.body), version: { increment: 1 } },
      });
      if (result.count !== 1) throw conflict();
      return reportDto(await visibleReport(report.id, req));
    },
  );
  app.delete<{ Params: { id: string }; Body: { version: number } }>(
    "/reports/:id",
    {
      preHandler: requireAuth,
      schema: {
        tags: ["Reports"],
        params: idParams,
        body: Type.Object(
          { version: Type.Integer({ minimum: 1 }) },
          { additionalProperties: false },
        ),
      },
    },
    async (req, reply) => {
      const report = await visibleReport(req.params.id, req);
      if (req.authUser.role !== "ADMIN" && report.status !== "PENDING")
        throw new HttpError(
          403,
          "REPORT_LOCKED",
          "Hanya laporan yang masih menunggu yang dapat dihapus.",
        );
      const result = await db.report.updateMany({
        where: {
          id: report.id,
          version: req.body.version,
          deletedAt: null,
          ...(req.authUser.role === "USER" ? { status: "PENDING" } : {}),
        },
        data: { deletedAt: new Date(), version: { increment: 1 } },
      });
      if (result.count !== 1) throw conflict();
      return reply.code(204).send();
    },
  );
  app.patch<{
    Params: { id: string };
    Body: { status: Status; version: number; note?: string };
  }>(
    "/reports/:id/status",
    {
      preHandler: [requireAuth, requireAdmin],
      schema: {
        tags: ["Reports"],
        params: idParams,
        body: Type.Object(
          {
            status: enumSchema(statuses),
            version: Type.Integer({ minimum: 1 }),
            note: Type.Optional(Type.String({ maxLength: 500 })),
          },
          { additionalProperties: false },
        ),
        response: { 200: reportSchema },
      },
    },
    async (req) => {
      await db.$transaction(async (tx) => {
        const report = await tx.report.findFirst({
          where: { id: req.params.id, deletedAt: null },
        });
        if (!report) throw notFound();
        if (
          report.version !== req.body.version ||
          !canTransition(report.status, req.body.status)
        )
          throw conflict();
        const note = req.body.note?.trim();
        if (req.body.status === "REJECTED" && !note)
          throw new HttpError(
            400,
            "REASON_REQUIRED",
            "Tuliskan alasan penolakan agar pelapor dapat memahaminya.",
          );
        const updated = await tx.report.updateMany({
          where: { id: report.id, version: req.body.version, deletedAt: null },
          data: { status: req.body.status, version: { increment: 1 } },
        });
        if (updated.count !== 1) throw conflict();
        await tx.reportStatusHistory.create({
          data: {
            reportId: report.id,
            actorId: req.authUser.id,
            fromStatus: report.status,
            toStatus: req.body.status,
            note: note || null,
          },
        });
      });
      return reportDto(await visibleReport(req.params.id, req));
    },
  );
  app.get<{ Querystring: Filters }>(
    "/dashboard",
    {
      preHandler: requireAuth,
      schema: {
        tags: ["Dashboard"],
        querystring: scopeSchema,
        response: { 200: statistics },
      },
    },
    async (req) => {
      const where = reportWhere(req, req.query);
      const days = Array.from({ length: TREND_DAYS }, (_, i) =>
        wibDate.format(new Date(Date.now() - (TREND_DAYS - 1 - i) * DAY_MS)),
      );
      const since = new Date(`${days[0]}T00:00:00${WIB_OFFSET}`);
      const [byStatus, byCategory, recent, predicted, matched, completed] =
        await Promise.all([
          db.report.groupBy({ by: ["status"], where, _count: { _all: true } }),
          db.report.groupBy({
            by: ["category"],
            where,
            _count: { _all: true },
          }),
          db.report.findMany({
            where: { AND: [where, { createdAt: { gte: since } }] },
            select: { createdAt: true },
          }),
          db.report.count({
            where: { AND: [where, { predictionId: { not: null } }] },
          }),
          db.report.count({
            where: {
              AND: [
                where,
                {
                  OR: categories.map((c) => ({
                    category: c,
                    prediction: { category: c },
                  })),
                },
              ],
            },
          }),
          // shortcut: averages completed rows in JS; switch to SQL AVG() once volume grows.
          db.reportStatusHistory.findMany({
            where: { toStatus: "COMPLETED", report: where },
            select: {
              createdAt: true,
              report: { select: { createdAt: true } },
            },
          }),
        ]);
      const counts = { PENDING: 0, IN_PROGRESS: 0, COMPLETED: 0, REJECTED: 0 };
      for (const row of byStatus) counts[row.status] = row._count._all;
      const distribution = { ORGANIC: 0, PLASTIC: 0, PAPER: 0 };
      for (const row of byCategory)
        distribution[row.category] = row._count._all;
      const perDay = new Map(days.map((day) => [day, 0]));
      for (const { createdAt } of recent) {
        const day = wibDate.format(createdAt);
        if (perDay.has(day)) perDay.set(day, perDay.get(day)! + 1);
      }
      const hours = completed.map(
        (h) => (h.createdAt.getTime() - h.report.createdAt.getTime()) / 3600000,
      );
      return {
        total: Object.values(counts).reduce((a, b) => a + b, 0),
        counts,
        categories: distribution,
        trend: [...perDay].map(([date, count]) => ({ date, count })),
        aiAgreement: { matched, total: predicted },
        avgResolutionHours: hours.length
          ? Math.round((hours.reduce((a, b) => a + b, 0) / hours.length) * 10) /
            10
          : null,
      };
    },
  );
  app.get<{ Querystring: Filters }>(
    "/reports/export",
    {
      preHandler: [requireAuth, requireAdmin],
      schema: {
        tags: ["Reports"],
        description: `CSV laporan sesuai filter aktif (maksimal ${EXPORT_LIMIT} baris). UTF-8 dengan BOM agar karakter terbaca benar di Excel.`,
        querystring: scopeSchema,
        produces: ["text/csv"],
      },
    },
    async (req, reply) => {
      const rows = await db.report.findMany({
        where: reportWhere(req, req.query),
        include: {
          reporter: { select: { name: true } },
          prediction: { select: { category: true, confidence: true } },
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: EXPORT_LIMIT,
      });
      const header = [
        "Nomor",
        "Judul",
        "Kategori",
        "Status",
        "Pelapor",
        "Lokasi",
        "Latitude",
        "Longitude",
        "Saran AI",
        "Keyakinan AI (%)",
        "Dibuat (WIB)",
        "Diperbarui (WIB)",
      ];
      const lines = rows.map((r) =>
        [
          reportCode(r.number),
          r.title,
          categoryLabels[r.category],
          reportLabels[r.status],
          r.reporter.name,
          r.locationLabel,
          r.latitude,
          r.longitude,
          r.prediction ? categoryLabels[r.prediction.category] : "",
          r.prediction ? Math.round(r.prediction.confidence * 1000) / 10 : "",
          wibDateTime.format(r.createdAt),
          wibDateTime.format(r.updatedAt),
        ]
          .map(csvCell)
          .join(","),
      );
      reply
        .type("text/csv; charset=utf-8")
        .header(
          "Content-Disposition",
          `attachment; filename="laporan-bilcode-waste-${wibDate.format(new Date())}.csv"`,
        );
      return `\uFEFF${[header.join(","), ...lines].join("\r\n")}\r\n`;
    },
  );
}

/** RFC 4180 quoting, plus a leading quote on text a spreadsheet would run as a formula. */
export function csvCell(value: string | number) {
  if (typeof value === "number") return String(value);
  const text = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}
