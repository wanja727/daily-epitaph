import { signIn, auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function LoginPage() {
  const session = await auth();
  if (session) redirect("/");

  return (
    <div className="min-h-screen bg-ivory relative overflow-hidden flex flex-col items-center justify-center px-6">
      {/* 배경 글로우 */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 h-48 w-48 rounded-full bg-gold/30 blur-3xl" />

      <div className="relative z-10 w-full max-w-sm space-y-10 text-center">
        {/* Header */}
        <div className="space-y-4">
          <span className="inline-flex rounded-full px-3 py-1 text-xs bg-gold-light text-[#7A6841]">
            Daily Resurrection
          </span>
          <h1 className="text-[36px] leading-[0.95] font-heading font-bold text-brown-dark">
            빈 무덤
            <br />
            프로젝트
          </h1>
          <p className="text-sm text-brown-mid leading-relaxed">
            40일, 나는 죽고 예수로 사는
            <br />
            삶의 실전편
          </p>
        </div>

        {/* Login card */}
        <div className="rounded-[28px] border border-stone bg-white/60 backdrop-blur-sm shadow-sm p-5">
          <div className="text-xs uppercase tracking-[0.22em] text-brown-light">
            포드처치 청년캠프1 전용
          </div>
          <form
            action={async () => {
              "use server";
              await signIn("kakao", { redirectTo: "/" });
            }}
            className="mt-4"
          >
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-3 bg-[#FEE500] hover:bg-[#F0D800] text-stone-900 font-semibold py-3.5 px-6 rounded-[20px] transition-colors"
            >
              <KakaoIcon />
              카카오로 시작하기
            </button>
          </form>
        </div>
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
