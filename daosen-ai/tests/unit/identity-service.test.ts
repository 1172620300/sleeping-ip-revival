import { describe, expect, it, vi } from "vitest";
import { createIdentityService } from "@/modules/identity/service";
import { createIdentityLimiters } from "@/modules/identity/rate-limit";
import type { IdentityRepository, LoginUser, SafeUser } from "@/modules/identity/types";

const actor: SafeUser = {
  id: "test-user", name: "演示用户", email: "person@demo.daosen.ai",
  role: "DESIGNER", status: "APPROVED", reviewNote: null,
};
const credentialUser: LoginUser = { ...actor, passwordHash: "hashed-demo-password" };
const input = { name: "演示用户", email: "PERSON@demo.daosen.ai", password: "Demo-password-2026!", role: "DESIGNER" };

function setup() {
  const repository = {
    findForLoginByEmail: vi.fn<IdentityRepository["findForLoginByEmail"]>().mockResolvedValue(null),
    findPublicById: vi.fn<IdentityRepository["findPublicById"]>().mockResolvedValue(actor),
    createUser: vi.fn<IdentityRepository["createUser"]>().mockResolvedValue({ ...actor, status: "PENDING" }),
    listPublicUsers: vi.fn<IdentityRepository["listPublicUsers"]>().mockResolvedValue([actor]),
  };
  const passwords = { hash: vi.fn().mockResolvedValue("hashed-demo-password"), compare: vi.fn().mockResolvedValue(true) };
  const service = createIdentityService(repository, passwords, createIdentityLimiters());
  return { repository, passwords, service };
}

describe("identity service", () => {
  it("uses real bcrypt cost 12 and compares the stored hash on login", async () => {
    const { repository } = setup();
    const service = createIdentityService(repository);
    await service.register(input);
    const digest = repository.createUser.mock.calls[0][0].passwordHash;
    expect(digest).not.toBe(input.password);
    expect(digest).toMatch(/^\$2[aby]\$12\$/);
    repository.findForLoginByEmail.mockResolvedValue({ ...actor, passwordHash: digest });
    expect(await service.authenticate(input)).toEqual(actor);
    expect(await service.authenticate({ ...input, password: "Different-password-2026!" })).toBeNull();
  });

  it("creates a normalized PENDING user with a password hash and no leaked hash", async () => {
    const { service, repository, passwords } = setup();
    const result = await service.register(input);
    expect(passwords.hash).toHaveBeenCalledWith(input.password);
    expect(repository.createUser).toHaveBeenCalledWith(expect.objectContaining({
      email: "person@demo.daosen.ai", passwordHash: "hashed-demo-password", status: "PENDING", role: "DESIGNER",
    }));
    expect(result).not.toHaveProperty("passwordHash");
    expect(result.status).toBe("PENDING");
  });

  it("fails duplicate email before hashing and handles a concurrent unique-key race", async () => {
    const first = setup();
    first.repository.findForLoginByEmail.mockResolvedValue(credentialUser);
    await expect(first.service.register(input)).rejects.toMatchObject({ status: 409, code: "EMAIL_EXISTS" });
    expect(first.passwords.hash).not.toHaveBeenCalled();
    const second = setup();
    second.repository.createUser.mockRejectedValue({ code: "P2002" });
    await expect(second.service.register(input)).rejects.toMatchObject({ status: 409, code: "EMAIL_EXISTS" });
  });

  it("rejects injection before any repository writes", async () => {
    const { service, repository } = setup();
    await expect(service.register({ ...input, status: "APPROVED" })).rejects.toThrow();
    expect(repository.createUser).not.toHaveBeenCalled();
  });

  it("unknown-email login returns null without a null dereference and still compares", async () => {
    const { service, passwords } = setup();
    expect(await service.authenticate(input)).toBeNull();
    expect(passwords.compare).toHaveBeenCalledWith(input.password, expect.stringMatching(/^\$2b\$12\$/));
  });

  it("valid login returns a safe projection and normalizes email", async () => {
    const { service, repository } = setup();
    repository.findForLoginByEmail.mockResolvedValue(credentialUser);
    expect(await service.authenticate(input)).toEqual(actor);
    expect(repository.findForLoginByEmail).toHaveBeenCalledWith("person@demo.daosen.ai");
  });

  it("wrong password and disabled users cannot authenticate", async () => {
    const invalid = setup();
    invalid.repository.findForLoginByEmail.mockResolvedValue(credentialUser);
    invalid.passwords.compare.mockResolvedValue(false);
    expect(await invalid.service.authenticate(input)).toBeNull();
    const disabled = setup();
    disabled.repository.findForLoginByEmail.mockResolvedValue({ ...credentialUser, status: "DISABLED" });
    expect(await disabled.service.authenticate(input)).toBeNull();
  });

  it.each(["PENDING", "REJECTED"] as const)("permits %s authentication for own status only", async (status) => {
    const { service, repository } = setup();
    repository.findForLoginByEmail.mockResolvedValue({ ...credentialUser, status });
    expect(await service.authenticate(input)).toMatchObject({ status });
  });

  it("invalid credentials never query the repository", async () => {
    const { service, repository } = setup();
    expect(await service.authenticate({ email: "invalid", password: "short" })).toBeNull();
    expect(repository.findForLoginByEmail).not.toHaveBeenCalled();
  });

  it("limits a normalized email to eight failed attempts", async () => {
    const { service, repository } = setup();
    for (let i = 0; i < 8; i += 1) await service.authenticate(input);
    await expect(service.authenticate({ ...input, email: input.email.toLowerCase() })).rejects.toMatchObject({ code: "RATE_LIMITED", status: 429 });
    expect(repository.findForLoginByEmail).toHaveBeenCalledTimes(8);
  });

  it("applies a global login budget even when attacker changes emails", async () => {
    const { service, repository } = setup();
    for (let i = 0; i < 80; i += 1) await service.authenticate({ ...input, email: `person-${i}@demo.daosen.ai` });
    await expect(service.authenticate({ ...input, email: "next@demo.daosen.ai" })).rejects.toMatchObject({ code: "RATE_LIMITED" });
    expect(repository.findForLoginByEmail).toHaveBeenCalledTimes(80);
  });

  it("limits repeat registration attempts", async () => {
    const { service } = setup();
    for (let i = 0; i < 3; i += 1) await service.register(input);
    await expect(service.register(input)).rejects.toMatchObject({ code: "RATE_LIMITED", status: 429 });
  });

  it("reloads role/status every time and invalidates deleted or disabled users", async () => {
    const { service, repository } = setup();
    expect(await service.currentUser(actor.id)).toEqual(actor);
    repository.findPublicById.mockResolvedValueOnce({ ...actor, role: "ADMIN" });
    expect(await service.currentUser(actor.id)).toMatchObject({ role: "ADMIN" });
    repository.findPublicById.mockResolvedValueOnce({ ...actor, status: "DISABLED" });
    expect(await service.currentUser(actor.id)).toBeNull();
    repository.findPublicById.mockResolvedValueOnce(null);
    expect(await service.currentUser(actor.id)).toBeNull();
    expect(repository.findPublicById).toHaveBeenCalledTimes(4);
  });
});
