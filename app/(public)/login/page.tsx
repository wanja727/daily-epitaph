import { signIn, auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function LoginPage() {
  const session = await auth();
  if (session) redirect("/");

  return (
    <div className="min-h-screen bg-ivory flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-10 text-center">
        {/* Header */}
        <div className="space-y-4">
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-full bg-linear-to-b from-gold/30 to-sage/20 flex items-center justify-center">
              <span className="text-4xl">🪨</span>
            </div>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-brown">
            빈 무덤 프로젝트
          </h1>
          <p className="text-sm text-brown-light leading-relaxed">
            40일, 매일 죽고 예수로 사는
            <br />
            삶의 실전편
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
            className="w-full flex items-center justify-center gap-3 bg-[#FEE500] hover:bg-[#F0D800] text-stone-900 font-semibold py-3.5 px-6 rounded-2xl transition-colors"
          >
            <KakaoIcon />
            카카오로 시작하기
          </button>
        </form>

        <p className="text-xs text-warm-gray">셀 리더 커뮤니티 전용</p>
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
