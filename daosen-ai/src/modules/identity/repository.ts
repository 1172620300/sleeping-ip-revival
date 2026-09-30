import { db } from "@/server/db";
import type { IdentityRepository } from "./types";

export const publicUserSelect = {
  id: true, name: true, email: true, role: true, status: true, reviewNote: true,
} as const;

export const identityRepository: IdentityRepository = {
  findForLoginByEmail: (email) => db.user.findUnique({ where: { email }, select: { ...publicUserSelect, passwordHash: true } }),
  findPublicById: (id) => db.user.findUnique({ where: { id }, select: publicUserSelect }),
  createUser: (input) => db.user.create({ data: input, select: publicUserSelect }),
  listPublicUsers: () => db.user.findMany({ select: publicUserSelect, orderBy: { createdAt: "desc" }, take: 100 }),
};
