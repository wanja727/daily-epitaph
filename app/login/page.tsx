import { signIn } from "@/lib/auth";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function LoginPage() {
  const session = await auth();
  if (session) redirect("/");

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8 text-center">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-stone-900">
            ✝ 오늘의 묘비명
          </h1>
          <p className="text-stone-500 text-sm leading-relaxed">
            신앙 안에서의 하루를
            <br />
            한 문장으로 기록하고 나눕니다
          </p>
        </div>

        {/* Login button */}
        <form
          action={async () => {
            "use server";
            await signIn("kakao", { redirectTo: "/" });
          }}
        >
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-3 bg-[#FEE500] hover:bg-[#F0D800] text-stone-900 font-semibold py-3 px-6 rounded-xl transition-colors"
          >
            <KakaoIcon />
            카카오로 시작하기
          </button>
        </form>

        <p className="text-xs text-stone-400">
          셀 리더 커뮤니티 전용 서비스입니다
        </p>
      </div>
    </div>
  );
}

function KakaoIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 3C6.48 3 2 6.58 2 11c0 2.76 1.67 5.2 4.2 6.74l-.87 3.25a.25.25 0 0 0 .38.27L9.6 18.9c.77.14 1.57.22 2.4.22 5.52 0 10-3.58 10-8S17.52 3 12 3z" />
    </svg>
  );
}
