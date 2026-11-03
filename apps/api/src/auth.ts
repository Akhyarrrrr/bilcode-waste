import { createHash, randomBytes } from "node:crypto";
import argon2 from "argon2";
import { Type } from "@sinclair/typebox";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { User } from "./generated/prisma/client.js";
import { db } from "./db.js";
import { config } from "./config.js";
import { HttpError } from "./errors.js";
import { consumeRateLimit } from "./rate-limit.js";
import { authResult, user as userSchema } from "./schemas.js";

declare module "fastify" {
  interface FastifyRequest {
    authUser: User;
    sessionHash?: string;
  }
}
const SESSION_DAYS = 7;
const sessionCookie = {
  httpOnly: true,
  secure: config.production,
  sameSite: "lax" as const,
  path: "/",
};
export const tokenHash = (token: string) =>
  createHash("sha256").update(token).digest("hex");
export const isLocked = (u: Pick<User, "email">) =>
  config.demoLockedEmails.includes(u.email);
export function assertUnlocked(u: Pick<User, "email">) {
  if (isLocked(u))
    throw new HttpError(
      403,
      "DEMO_ACCOUNT_LOCKED",
      "Akun demo dikunci agar tetap dapat dipakai penilai lain. Daftarkan akun baru untuk mencoba perubahan ini.",
    );
}
export const publicUser = (u: User) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  role: u.role,
  isActive: u.isActive,
  isLocked: isLocked(u),
  createdAt: u.createdAt.toISOString(),
});
export function cleanName(name: string) {
  const trimmed = name.trim();
  if (trimmed.length < 2)
    throw new HttpError(
      400,
      "INVALID_NAME",
      "Nama minimal 2 karakter dan tidak boleh hanya spasi.",
    );
  return trimmed;
}
export async function requireAuth(req: FastifyRequest) {
  const token = req.headers.authorization?.startsWith("Bearer ")
    ? req.headers.authorization.slice(7)
    : req.cookies.bw_session;
  if (!token || token.length > 128)
    throw new HttpError(
      401,
      "UNAUTHENTICATED",
      "Silakan masuk untuk melanjutkan.",
    );
  const hashed = tokenHash(token);
  const session = await db.session.findUnique({
    where: { tokenHash: hashed },
    include: { user: true },
  });
  if (!session || session.expiresAt <= new Date() || !session.user.isActive)
    throw new HttpError(
      401,
      "SESSION_EXPIRED",
      "Sesi berakhir. Silakan masuk kembali.",
    );
  req.authUser = session.user;
  req.sessionHash = hashed;
}
export async function requireAdmin(req: FastifyRequest) {
  if (req.authUser.role !== "ADMIN")
    throw new HttpError(
      403,
      "FORBIDDEN",
      "Hanya admin yang dapat melakukan tindakan ini.",
    );
}
const account = {
  email: Type.String({ format: "email", maxLength: 254 }),
  password: Type.String({ minLength: 8, maxLength: 128 }),
  client: Type.Optional(
    Type.Union([Type.Literal("web"), Type.Literal("mobile")]),
  ),
};
const AUTH_WINDOW_MS = 10 * 60 * 1000;
/**
 * Per-email limit stops password guessing; per-IP limit stops spraying many emails.
 * Locked demo accounts skip the email bucket: their passwords are public, so the limit
 * would only lock out reviewers sharing them. The IP cap is generous because users behind
 * one NAT (or a proxy hop) can share an address.
 */
async function throttle(req: FastifyRequest, email: string) {
  if (!isLocked({ email }))
    await consumeRateLimit(`auth:${email}`, 10, AUTH_WINDOW_MS);
  await consumeRateLimit(`auth-ip:${req.ip}`, 100, AUTH_WINDOW_MS);
}
async function establish(
  user: User,
  client: string | undefined,
  reply: FastifyReply,
) {
  const token = randomBytes(32).toString("base64url");
  await db.$transaction([
    db.session.deleteMany({
      where: { userId: user.id, expiresAt: { lte: new Date() } },
    }),
    db.session.create({
      data: {
        userId: user.id,
        tokenHash: tokenHash(token),
        expiresAt: new Date(Date.now() + SESSION_DAYS * 86400000),
      },
    }),
  ]);
  if (client !== "mobile")
    reply.setCookie("bw_session", token, {
      ...sessionCookie,
      maxAge: SESSION_DAYS * 86400,
    });
  return { user: publicUser(user), ...(client === "mobile" ? { token } : {}) };
}
export async function authRoutes(app: FastifyInstance) {
  app.post<{
    Body: { name: string; email: string; password: string; client?: string };
  }>(
    "/auth/register",
    {
      schema: {
        tags: ["Auth"],
        security: [],
        body: Type.Object(
          { ...account, name: Type.String({ minLength: 2, maxLength: 100 }) },
          { additionalProperties: false },
        ),
        response: { 201: authResult },
      },
    },
    async (req, reply) => {
      const email = req.body.email.trim().toLowerCase();
      await throttle(req, email);
      const user = await db.user.create({
        data: {
          name: cleanName(req.body.name),
          email,
          passwordHash: await argon2.hash(req.body.password, {
            type: argon2.argon2id,
          }),
          role: "USER",
        },
      });
      reply.code(201);
      return establish(user, req.body.client, reply);
    },
  );
  app.post<{ Body: { email: string; password: string; client?: string } }>(
    "/auth/login",
    {
      schema: {
        tags: ["Auth"],
        security: [],
        body: Type.Object(account, { additionalProperties: false }),
        response: { 200: authResult },
      },
    },
    async (req, reply) => {
      const email = req.body.email.trim().toLowerCase();
      await throttle(req, email);
      const user = await db.user.findUnique({ where: { email } });
      const valid = user
        ? await argon2.verify(user.passwordHash, req.body.password)
        : (await argon2.hash(req.body.password), false);
      if (!user || !valid || !user.isActive)
        throw new HttpError(
          401,
          "INVALID_CREDENTIALS",
          "Email atau kata sandi tidak sesuai.",
        );
      return establish(user, req.body.client, reply);
    },
  );
  app.get(
    "/auth/me",
    {
      preHandler: requireAuth,
      schema: { tags: ["Auth"], response: { 200: userSchema } },
    },
    (req) => publicUser(req.authUser),
  );
  app.post(
    "/auth/logout",
    { preHandler: requireAuth, schema: { tags: ["Auth"] } },
    async (req, reply) => {
      await db.session.deleteMany({ where: { tokenHash: req.sessionHash! } });
      reply.clearCookie("bw_session", sessionCookie);
      return reply.code(204).send();
    },
  );
  app.patch<{
    Body: { name?: string; password?: string; currentPassword?: string };
  }>(
    "/auth/me",
    {
      preHandler: requireAuth,
      schema: {
        tags: ["Auth"],
        body: Type.Object(
          {
            name: Type.Optional(Type.String({ minLength: 2, maxLength: 100 })),
            password: Type.Optional(
              Type.String({ minLength: 8, maxLength: 128 }),
            ),
            currentPassword: Type.Optional(Type.String({ maxLength: 128 })),
          },
          { additionalProperties: false },
        ),
        response: { 200: userSchema },
      },
    },
    async (req, reply) => {
      assertUnlocked(req.authUser);
      const { name, password, currentPassword } = req.body;
      if (
        password &&
        (!currentPassword ||
          !(await argon2.verify(req.authUser.passwordHash, currentPassword)))
      )
        throw new HttpError(
          400,
          "INVALID_PASSWORD",
          "Kata sandi saat ini tidak sesuai.",
        );
      const user = await db.$transaction(async (tx) => {
        const updated = await tx.user.update({
          where: { id: req.authUser.id },
          data: {
            ...(name !== undefined ? { name: cleanName(name) } : {}),
            ...(password ? { passwordHash: await argon2.hash(password) } : {}),
          },
        });
        if (password)
          await tx.session.deleteMany({ where: { userId: updated.id } });
        return updated;
      });
      if (password) reply.clearCookie("bw_session", sessionCookie);
      return publicUser(user);
    },
  );
}
