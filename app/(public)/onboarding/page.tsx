import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { generateFlowerNickname } from "@/lib/utils/flower-names";
import OnboardingForm from "./OnboardingForm";

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (session.user.onboardingCompleted) redirect("/main");

  const suggestedNickname = generateFlowerNickname();

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-3">
          <div className="text-4xl">🌱</div>
          <h1 className="text-xl font-bold text-white">프로필 설정</h1>
          <p className="text-sm text-slate-400">
            빈 무덤 프로젝트에 오신 것을 환영합니다
          </p>
        </div>
        <OnboardingForm
          suggestedNickname={suggestedNickname}
          kakaoName={session.user.name ?? ""}
        />
      </div>
    </div>
  );
}
