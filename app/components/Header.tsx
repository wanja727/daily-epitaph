import { auth, signOut } from "@/lib/auth";
import Link from "next/link";

export default async function Header() {
  const session = await auth();

  return (
    <header className="border-b border-stone-200 bg-white sticky top-0 z-10">
      <div className="max-w-xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="font-bold text-stone-900 tracking-tight">
          ✝ 묘비명
        </Link>
        <nav className="flex items-center gap-1">
          <Link
            href="/"
            className="text-sm px-3 py-1.5 rounded-lg hover:bg-stone-100 text-stone-600 transition-colors"
          >
            오늘
          </Link>
          <Link
            href="/history"
            className="text-sm px-3 py-1.5 rounded-lg hover:bg-stone-100 text-stone-600 transition-colors"
          >
            내 기록
          </Link>
          {session?.user && (
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <button
                type="submit"
                className="text-sm px-3 py-1.5 rounded-lg hover:bg-stone-100 text-stone-400 transition-colors"
              >
                로그아웃
              </button>
            </form>
          )}
        </nav>
      </div>
    </header>
  );
}
