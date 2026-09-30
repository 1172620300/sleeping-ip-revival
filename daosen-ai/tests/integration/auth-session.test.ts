import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CredentialsConfig } from "next-auth/providers/credentials";
import type { SafeUser } from "@/modules/identity/types";

const mocks = vi.hoisted(() => ({ session: vi.fn(), authenticate: vi.fn(), currentUser: vi.fn() }));
vi.mock("next-auth", () => ({ getServerSession: mocks.session }));
vi.mock("@/modules/identity", () => ({ identity: { authenticate: mocks.authenticate, currentUser: mocks.currentUser } }));

import { authOptions, currentUser } from "@/server/auth";

const user: SafeUser = { id: "user-one", name: "演示用户", email: "one@demo.daosen.ai", role: "DESIGNER", status: "APPROVED", reviewNote: null };
// NextAuth merges each provider's options into its default config at runtime.
const provider = { ...authOptions.providers[0], ...authOptions.providers[0].options } as CredentialsConfig;
const sessionCallback = authOptions.callbacks!.session!;

beforeEach(() => {
  vi.resetAllMocks();
  mocks.authenticate.mockResolvedValue(user);
  mocks.currentUser.mockResolvedValue(user);
  mocks.session.mockResolvedValue({ user: { id: user.id } });
});

describe("NextAuth Credentials and fresh-session boundary", () => {
  it("authenticates only safe identity fields into the JWT subject", async () => {
    const result = await provider.authorize({ email: user.email, password: "Daosen@2026!" }, {});
    expect(result).toEqual({ id: user.id, name: user.name, email: user.email });
    expect(result).not.toHaveProperty("passwordHash");
  });

  it("returns the same failed-login result for invalid input and service failures", async () => {
    mocks.authenticate.mockResolvedValueOnce(null);
    expect(await provider.authorize(undefined, {})).toBeNull();
    mocks.authenticate.mockRejectedValueOnce(new Error("sensitive database error"));
    expect(await provider.authorize({}, {})).toBeNull();
  });

  it("ignores stale role data and reloads session projection from the DB boundary", async () => {
    const args = {
      session: { expires: "future", user: { id: user.id, name: "old", role: "ADMIN" } },
      token: { sub: user.id, role: "ADMIN" },
    } as unknown as Parameters<typeof sessionCallback>[0];
    expect(await sessionCallback(args)).toEqual({ expires: "future", user });
    expect(mocks.currentUser).toHaveBeenCalledWith(user.id);
  });

  it("removes a disabled/deleted identity from existing sessions", async () => {
    mocks.currentUser.mockResolvedValue(null);
    const args = {
      session: { expires: "future", user: { id: user.id, name: "old" } },
      token: { sub: user.id },
    } as unknown as Parameters<typeof sessionCallback>[0];
    expect((await sessionCallback(args)).user).toBeUndefined();
  });

  it("returns no account for anonymous sessions without querying another user", async () => {
    mocks.session.mockResolvedValue(null);
    expect(await currentUser()).toBeNull();
    expect(mocks.currentUser).not.toHaveBeenCalled();
  });

  it("checks the current session's exact subject again at every protected read", async () => {
    expect(await currentUser()).toEqual(user);
    mocks.currentUser.mockResolvedValueOnce(null);
    expect(await currentUser()).toBeNull();
    expect(mocks.currentUser).toHaveBeenNthCalledWith(1, user.id);
    expect(mocks.currentUser).toHaveBeenNthCalledWith(2, user.id);
  });
});
