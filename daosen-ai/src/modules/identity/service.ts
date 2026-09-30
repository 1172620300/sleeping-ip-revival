import { compare, hash } from "bcryptjs";
import { createIdentityLimiters } from "./rate-limit";
import { IdentityError, toSafeUser, type IdentityRepository } from "./types";
import { loginSchema, registrationSchema } from "./validation";

const DUMMY_HASH = "$2b$12$oyZ9AMLaXUz24eUTP4X0TuZOwMLVdmK11AUVlgCusE8K6vk9OUhue";
const defaultPasswords = {
  hash: (password: string) => hash(password, 12),
  compare: (password: string, digest: string) => compare(password, digest),
};

export function createIdentityService(
  repository: IdentityRepository,
  passwords = defaultPasswords,
  limiters = createIdentityLimiters(),
) {
  function rateLimited(): never {
    throw new IdentityError("RATE_LIMITED", "尝试过于频繁，请稍后再试", 429);
  }

  return {
    async register(rawInput: unknown) {
      const input = registrationSchema.parse(rawInput);
      if (!limiters.registrationGlobal.consume("register") || !limiters.registrationEmail.consume(input.email)) rateLimited();
      if (await repository.findForLoginByEmail(input.email)) {
        throw new IdentityError("EMAIL_EXISTS", "该邮箱已注册", 409);
      }
      const passwordHash = await passwords.hash(input.password);
      try {
        const user = await repository.createUser({
          name: input.name, email: input.email, passwordHash, role: input.role,
          status: "PENDING", phone: input.phone, purpose: input.purpose,
        });
        return toSafeUser(user);
      } catch (error) {
        if ((error as { code?: string })?.code === "P2002") {
          throw new IdentityError("EMAIL_EXISTS", "该邮箱已注册", 409);
        }
        throw error;
      }
    },

    async authenticate(rawInput: unknown) {
      if (!limiters.loginGlobal.consume("login")) rateLimited();
      const parsed = loginSchema.safeParse(rawInput);
      if (!parsed.success) return null;
      const { email, password } = parsed.data;
      if (!limiters.loginEmail.consume(email)) rateLimited();
      const user = await repository.findForLoginByEmail(email);
      // Equal-cost password comparison for unknown emails, without dereferencing null.
      const valid = await passwords.compare(password, user?.passwordHash ?? DUMMY_HASH);
      if (!user || !valid || user.status === "DISABLED") return null;
      limiters.loginEmail.clear(email);
      return toSafeUser(user);
    },

    async currentUser(id: string) {
      const user = await repository.findPublicById(id);
      return user && user.status !== "DISABLED" ? toSafeUser(user) : null;
    },
  };
}
