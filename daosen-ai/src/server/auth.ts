import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { identity } from "@/modules/identity";
import type { SafeUser } from "@/modules/identity/types";

export type { SafeUser } from "@/modules/identity/types";

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 },
  pages: { signIn: "/login" },
  providers: [Credentials({
    name: "道森账号",
    credentials: {
      email: { label: "邮箱", type: "email" },
      password: { label: "密码", type: "password" },
    },
    async authorize(credentials) {
      try {
        const user = await identity.authenticate(credentials);
        return user ? { id: user.id, name: user.name, email: user.email } : null;
      } catch {
        // Do not return database details or distinguish disabled/unknown accounts.
        return null;
      }
    },
  })],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.sub = user.id;
      return token;
    },
    async session({ session, token }) {
      // Never authorize using role/status embedded in a long-lived JWT.
      const user = token.sub ? await identity.currentUser(token.sub) : null;
      return { ...session, user: user ?? undefined };
    },
  },
};

export async function currentUser(): Promise<SafeUser | null> {
  const session = await getServerSession(authOptions);
  const id = (session?.user as { id?: string } | undefined)?.id;
  if (!id) return null;
  // Recheck at the protected operation even if a caller supplies a cached session.
  return identity.currentUser(id);
}
