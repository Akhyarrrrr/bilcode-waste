import Fastify from "fastify";
import { buildApp } from "./build-app.js";
import { config } from "./config.js";
const app = await buildApp({ factory: Fastify });
await app.listen({ port: config.port, host: "0.0.0.0" });
