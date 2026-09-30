import type { AccountStatusCode, RoleCode } from "@/server/rbac";

export type SafeUser = {
  id: string;
  name: string;
  email: string;
  role: RoleCode;
  status: AccountStatusCode;
  reviewNote: string | null;
};

export type LoginUser = SafeUser & { passwordHash: string };

export type CreateUser = {
  name: string;
  email: string;
  passwordHash: string;
  role: "DESIGNER" | "STORE_OWNER";
  status: "PENDING";
  phone?: string;
  purpose?: string;
};

export interface IdentityRepository {
  findForLoginByEmail(email: string): Promise<LoginUser | null>;
  findPublicById(id: string): Promise<SafeUser | null>;
  createUser(input: CreateUser): Promise<SafeUser>;
  listPublicUsers(): Promise<SafeUser[]>;
}

export class IdentityError extends Error {
  constructor(public code: string, message: string, public status: number) {
    super(message);
    this.name = "IdentityError";
  }
}

export function toSafeUser(user: LoginUser | SafeUser): SafeUser {
  return { id: user.id, name: user.name, email: user.email, role: user.role, status: user.status, reviewNote: user.reviewNote };
}
