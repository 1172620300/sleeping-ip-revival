import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SafeUser } from "@/modules/identity/types";

const mocks = vi.hoisted(() => ({ currentUser: vi.fn(), register: vi.fn(), listUsers: vi.fn() }));
vi.mock("@/server/auth", () => ({ currentUser: mocks.currentUser }));
vi.mock("@/modules/identity", () => ({ identity: { register: mocks.register } }));
vi.mock("@/modules/identity/repository", () => ({ identityRepository: { listPublicUsers: mocks.listUsers } }));

import { POST as register } from "@/app/api/platform/register/route";
import { GET as session } from "@/app/api/platform/session/route";
import { GET as users } from "@/app/api/platform/users/route";

const user: SafeUser = { id: "one", name: "演示用户", email: "one@demo.daosen.ai", role: "DESIGNER", status: "APPROVED", reviewNote: null };
const valid = { name: "演示用户", email: "one@demo.daosen.ai", password: "Demo-password-2026!", role: "DESIGNER" };
const request = (payload: unknown, origin = "http://localhost:3000") => new Request("http://localhost:3000/api/platform/register", {
  method: "POST", headers: { "content-type": "application/json", origin }, body: JSON.stringify(payload),
});

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("NEXTAUTH_URL", "http://localhost:3000");
  mocks.currentUser.mockResolvedValue(user);
  mocks.register.mockResolvedValue({ ...user, status: "PENDING" });
  mocks.listUsers.mockResolvedValue([user]);
});
afterEach(() => { vi.unstubAllEnvs(); });

describe("identity API contracts (mocked repository boundary)", () => {
  it("creates a PENDING registration with 201 and safe payload", async () => {
    const response = await register(request(valid));
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ user: { ...user, status: "PENDING" } });
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it.each([{ status: "APPROVED" }, { role: "ADMIN" }, { role: "STAFF" }, { password: "short" }])("rejects illegal fields %j before service invocation", async (override) => {
    const response = await register(request({ ...valid, ...override }));
    expect(response.status).toBe(400);
    expect(mocks.register).not.toHaveBeenCalled();
  });

  it("rejects cross-site registration before reading/writing users", async () => {
    const response = await register(request(valid, "https://malicious.example"));
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ code: "INVALID_ORIGIN" });
    expect(mocks.register).not.toHaveBeenCalled();
  });

  it("maps concurrent duplicate registration to conflict", async () => {
    mocks.register.mockRejectedValue({ code: "P2002" });
    const response = await register(request(valid));
    expect(response.status).toBe(409);
  });

  it("exposes only the authenticated account, never a supplied user identifier", async () => {
    const response = await session();
    expect(await response.json()).toEqual({ user });
    expect(mocks.currentUser).toHaveBeenCalledWith();
  });

  it("anonymous/deleted/disabled session returns user null", async () => {
    mocks.currentUser.mockResolvedValue(null);
    const response = await session();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ user: null });
  });

  it("denies anonymous access to the directory", async () => {
    mocks.currentUser.mockResolvedValue(null);
    const response = await users();
    expect(response.status).toBe(401);
    expect(mocks.listUsers).not.toHaveBeenCalled();
  });

  it.each(["DESIGNER", "STORE_OWNER", "STAFF"])("denies %s access to other accounts", async (role) => {
    mocks.currentUser.mockResolvedValue({ ...user, role });
    const response = await users();
    expect(response.status).toBe(403);
    expect(mocks.listUsers).not.toHaveBeenCalled();
  });

  it.each(["PENDING", "REJECTED", "DISABLED"])("denies %s ADMIN access", async (status) => {
    mocks.currentUser.mockResolvedValue({ ...user, role: "ADMIN", status });
    expect((await users()).status).toBe(403);
    expect(mocks.listUsers).not.toHaveBeenCalled();
  });

  it("allows APPROVED ADMIN to read a safe list", async () => {
    mocks.currentUser.mockResolvedValue({ ...user, role: "ADMIN" });
    const response = await users();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ users: [user] });
  });
});
