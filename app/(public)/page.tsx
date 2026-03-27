import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import CoverContent from "./CoverContent";

export default async function CoverPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.onboardingCompleted) {
    // 온보딩 완료 사용자는 커버를 보여주고, 탭하면 /main으로
  } else {
    redirect("/onboarding");
  }

  return <CoverContent />;
}
