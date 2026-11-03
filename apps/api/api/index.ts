import type { IncomingMessage, ServerResponse } from "node:http";
import { buildApp } from "../src/build-app.js";

const app = buildApp();

export default async function handler(
  request: IncomingMessage,
  response: ServerResponse,
) {
  const fastify = await app;
  fastify.server.emit("request", request, response);
}
