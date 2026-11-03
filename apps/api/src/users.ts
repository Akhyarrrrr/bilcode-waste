import argon2 from "argon2";
import { Type } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import type { Role } from "@bilcode/contracts";
import { db } from "./db.js";
import {
  assertUnlocked,
  cleanName,
  publicUser,
  requireAdmin,
  requireAuth,
} from "./auth.js";
import { HttpError, notFound } from "./errors.js";
import { idParams, paginationSchema } from "./reports.js";
import { page as pageOf, user } from "./schemas.js";
import type { Prisma } from "./generated/prisma/client.js";
const role = Type.Union([Type.Literal("ADMIN"), Type.Literal("USER")]);
const fields = {
  name: Type.String({ minLength: 2, maxLength: 100 }),
  email: Type.String({ format: "email", maxLength: 254 }),
  password: Type.String({ minLength: 8, maxLength: 128 }),
  role,
  isActive: Type.Boolean(),
};
interface UserFilters {
  page?: number;
  pageSize?: number;
  q?: string;
  role?: Role;
  active?: boolean;
}
export async function userRoutes(app: FastifyInstance) {
  app.get<{ Querystring: UserFilters }>(
    "/users",
    {
      preHandler: [requireAuth, requireAdmin],
      schema: {
        tags: ["Users"],
        querystring: Type.Object(
          {
            ...paginationSchema,
            role: Type.Optional(role),
            active: Type.Optional(Type.Boolean()),
          },
          { additionalProperties: false },
        ),
        response: { 200: pageOf(user) },
      },
    },
    async (req) => {
      const page = req.query.page ?? 1,
        pageSize = req.query.pageSize ?? 20,
        q = req.query.q?.trim();
      const where: Prisma.UserWhereInput = {
        ...(req.query.role ? { role: req.query.role } : {}),
        ...(req.query.active !== undefined
          ? { isActive: req.query.active }
          : {}),
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { email: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      };
      const [total, rows] = await db.$transaction([
        db.user.count({ where }),
        db.user.findMany({
          where,
          skip: (page - 1) * pageSize,
          take: pageSize,
          orderBy: { createdAt: "desc" },
        }),
      ]);
      return {
        total,
        items: rows.map(publicUser),
        page,
        pageSize,
        pages: Math.ceil(total / pageSize),
      };
    },
  );
  app.post<{
    Body: {
      name: string;
      email: string;
      password: string;
      role: Role;
      isActive?: boolean;
    };
  }>(
    "/users",
    {
      preHandler: [requireAuth, requireAdmin],
      schema: {
        tags: ["Users"],
        body: Type.Object(
          { ...fields, isActive: Type.Optional(fields.isActive) },
          { additionalProperties: false },
        ),
        response: { 201: user },
      },
    },
    async (req, reply) => {
      const user = await db.user.create({
        data: {
          name: cleanName(req.body.name),
          email: req.body.email.trim().toLowerCase(),
          role: req.body.role,
          isActive: req.body.isActive ?? true,
          passwordHash: await argon2.hash(req.body.password),
        },
      });
      reply.code(201);
      return publicUser(user);
    },
  );
  app.patch<{
    Params: { id: string };
    Body: {
      name?: string;
      email?: string;
      password?: string;
      role?: Role;
      isActive?: boolean;
    };
  }>(
    "/users/:id",
    {
      preHandler: [requireAuth, requireAdmin],
      schema: {
        tags: ["Users"],
        params: idParams,
        body: Type.Partial(
          Type.Object(fields, { additionalProperties: false }),
        ),
        response: { 200: user },
      },
    },
    async (req) => {
      const user = await db.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(19861101)`;
        const existing = await tx.user.findUnique({
          where: { id: req.params.id },
        });
        if (!existing) throw notFound();
        assertUnlocked(existing);
        const removesAdmin =
          existing.role === "ADMIN" &&
          existing.isActive &&
          (req.body.role === "USER" || req.body.isActive === false);
        if (
          removesAdmin &&
          (await tx.user.count({ where: { role: "ADMIN", isActive: true } })) <=
            1
        )
          throw new HttpError(
            409,
            "LAST_ADMIN",
            "Setidaknya satu admin aktif harus tetap tersedia.",
          );
        const { password, ...fields } = req.body;
        const updated = await tx.user.update({
          where: { id: existing.id },
          data: {
            ...fields,
            ...(fields.name !== undefined
              ? { name: cleanName(fields.name) }
              : {}),
            ...(fields.email
              ? { email: fields.email.trim().toLowerCase() }
              : {}),
            ...(password ? { passwordHash: await argon2.hash(password) } : {}),
          },
        });
        if (
          password ||
          (req.body.role !== undefined && req.body.role !== existing.role) ||
          (req.body.isActive !== undefined &&
            req.body.isActive !== existing.isActive) ||
          (req.body.email !== undefined &&
            req.body.email.trim().toLowerCase() !== existing.email)
        )
          await tx.session.deleteMany({ where: { userId: existing.id } });
        return updated;
      });
      return publicUser(user);
    },
  );
}
