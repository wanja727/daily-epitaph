import NextAuth from "next-auth";
import Kakao from "next-auth/providers/kakao";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/lib/db";
import {
  accounts,
  sessions,
  users,
  verificationTokens,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers: [
    Kakao({
      clientId: process.env.KAKAO_CLIENT_ID!,
      clientSecret: process.env.KAKAO_CLIENT_SECRET!,
    }),
  ],
  session: {
    strategy: "database",
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async session({ session, user }) {
      // DB에서 커스텀 필드 조회
      const [dbUser] = await db
        .select({
          id: users.id,
          realName: users.realName,
          nickname: users.nickname,
          cellId: users.cellId,
          onboardingCompleted: users.onboardingCompleted,
        })
        .from(users)
        .where(eq(users.id, user.id))
        .limit(1);

      if (dbUser) {
        session.user.id = dbUser.id;
        session.user.realName = dbUser.realName;
        session.user.nickname = dbUser.nickname;
        session.user.cellId = dbUser.cellId;
        session.user.onboardingCompleted = dbUser.onboardingCompleted;
      }

      return session;
    },
  },
});
