import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client.js";
import { config } from "./config.js";
export const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: config.databaseUrl, max: 3 }),
  // A sleeping cloud database can take longer than Prisma's 2s acquisition default.
  transactionOptions: { maxWait: 10000, timeout: 15000 },
});
