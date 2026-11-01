import "dotenv/config";
import { PrismaClient, Prisma, Role } from "../generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not configured.");
}

const adapter = new PrismaPg({
  connectionString
});

export const prisma = new PrismaClient({
  adapter
});

export { Prisma, Role };
export * from "../generated/prisma/enums.js";
