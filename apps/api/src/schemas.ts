import { Type, type TSchema } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { categories, statuses } from "@bilcode/contracts";

// Response schemas double as serializers: fields not listed here never leave the API.
const id = Type.String({ format: "uuid" }),
  date = Type.String({ format: "date-time" });
const category = Type.Union(categories.map((c) => Type.Literal(c))),
  status = Type.Union(statuses.map((s) => Type.Literal(s)));
const person = Type.Object({ id, name: Type.String() });
const perCategory = Type.Object({
  ORGANIC: Type.Number(),
  PLASTIC: Type.Number(),
  PAPER: Type.Number(),
});
export const user = Type.Object({
  id,
  name: Type.String(),
  email: Type.String({ format: "email" }),
  role: Type.Union([Type.Literal("ADMIN"), Type.Literal("USER")]),
  isActive: Type.Boolean(),
  isLocked: Type.Boolean(),
  createdAt: date,
});
export const upload = Type.Object({ id, url: Type.String() });
export const prediction = Type.Object({
  id,
  uploadId: id,
  category,
  confidence: Type.Number(),
  scores: perCategory,
  modelVersion: Type.String(),
  durationMs: Type.Number(),
});
export const report = Type.Object({
  id,
  number: Type.Integer(),
  title: Type.String(),
  description: Type.String(),
  category,
  status,
  latitude: Type.Number(),
  longitude: Type.Number(),
  locationLabel: Type.String(),
  locationAccuracy: Type.Union([Type.Number(), Type.Null()]),
  version: Type.Integer(),
  isDemo: Type.Boolean(),
  createdAt: date,
  updatedAt: date,
  reporter: person,
  photo: upload,
  prediction: Type.Union([prediction, Type.Null()]),
  history: Type.Array(
    Type.Object({
      id,
      fromStatus: Type.Union([status, Type.Null()]),
      toStatus: status,
      note: Type.Union([Type.String(), Type.Null()]),
      createdAt: date,
      actor: person,
    }),
  ),
});
export const page = (item: TSchema) =>
  Type.Object({
    items: Type.Array(item),
    total: Type.Integer(),
    page: Type.Integer(),
    pageSize: Type.Integer(),
    pages: Type.Integer(),
  });
export const authResult = Type.Object({
  user,
  token: Type.Optional(Type.String()),
});
export const statistics = Type.Object({
  total: Type.Integer(),
  counts: Type.Object({
    PENDING: Type.Integer(),
    IN_PROGRESS: Type.Integer(),
    COMPLETED: Type.Integer(),
    REJECTED: Type.Integer(),
  }),
  categories: perCategory,
  trend: Type.Array(
    Type.Object({ date: Type.String(), count: Type.Integer() }),
  ),
  aiAgreement: Type.Object({
    matched: Type.Integer(),
    total: Type.Integer(),
  }),
  avgResolutionHours: Type.Union([Type.Number(), Type.Null()]),
});
const error = Type.Object({
  error: Type.Object({
    code: Type.String(),
    message: Type.String(),
    requestId: Type.String(),
  }),
});
const errorStatuses = [400, 401, 403, 404, 409, 413, 429, 500, 503];

/** Every versioned route shares the same error envelope; success schemas live on each route. */
export function registerErrorSchemas(app: FastifyInstance) {
  app.addHook("onRoute", (route) => {
    if (!route.url.startsWith("/api/v1")) return;
    const response = (route.schema?.response ?? {}) as Record<number, TSchema>;
    route.schema = {
      ...route.schema,
      response: {
        ...Object.fromEntries(errorStatuses.map((code) => [code, error])),
        ...response,
      },
    };
  });
}
