import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/admin/login" },
  providers: [
    CredentialsProvider({
      name: "Admin",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        try {
          const { prisma } = await import("@/lib/prisma");
          const admin = await prisma.admin.findUnique({
            where: { email: parsed.data.email }
          });

          if (admin) {
            const isValid = await bcrypt.compare(parsed.data.password, admin.password);
            if (!isValid) return null;
            return { id: admin.id, email: admin.email };
          }
        } catch (error) {
          console.error("Admin DB auth unavailable, trying env fallback:", error);
        }

        const fallbackEmail = process.env.ADMIN_EMAIL;
        const fallbackPassword = process.env.ADMIN_PASSWORD ?? "changeme123";
        if (parsed.data.email !== fallbackEmail) return null;
        if (parsed.data.password !== fallbackPassword) return null;

        return { id: "env-admin", email: parsed.data.email };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) token.sub = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    }
  }
};
