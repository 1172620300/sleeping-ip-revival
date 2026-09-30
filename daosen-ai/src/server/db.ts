import { PrismaClient } from "@prisma/client";

const globals = globalThis as unknown as { daosenDb?: PrismaClient };
export const db = globals.daosenDb ?? new PrismaClient({ errorFormat: "minimal" });
if (process.env.NODE_ENV !== "production") globals.daosenDb = db;
