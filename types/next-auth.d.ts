import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      realName?: string | null;
      nickname?: string | null;
      cellId?: string | null;
      onboardingCompleted: boolean;
      isAdmin: boolean;
    };
  }
}
