import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import BottomNav from "@/app/components/BottomNav";
import { recordDailyVisit } from "./actions";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (!session.user.onboardingCompleted) redirect("/onboarding");

  // 오늘 방문 기록 (중복 무시)
  recordDailyVisit(session.user.id);

  return (
    <div className="min-h-screen max-w-lg mx-auto relative bg-ivory">
      <main className="pb-24">{children}</main>
      <BottomNav isAdmin={session.user.isAdmin} />
    </div>
  );
}
