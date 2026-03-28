import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import BottomNav from "@/app/components/BottomNav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (!session.user.onboardingCompleted) redirect("/onboarding");

  return (
    <div className="min-h-screen max-w-lg mx-auto relative bg-ivory">
      <main className="pb-24">{children}</main>
      <BottomNav />
    </div>
  );
}
