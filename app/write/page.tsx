import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { epitaphs } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { redirect } from "next/navigation";
import Link from "next/link";
import Header from "@/app/components/Header";
import { upsertEpitaph } from "./actions";
import WriteArea from "./WriteArea";

function getTodayKST(): string {
  return new Date()
    .toLocaleDateString("ko-KR", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
    .replace(/\. /g, "-")
    .replace(/\.$/, "");
}

export default async function WritePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const today = getTodayKST();

  const existing = await db
    .select({ content: epitaphs.content })
    .from(epitaphs)
    .where(
      and(
        eq(epitaphs.userId, session.user.id),
        eq(epitaphs.date, today)
      )
    )
    .limit(1);

  const currentContent = existing[0]?.content ?? "";

  return (
    <div>
      <Header />
      <main className="max-w-xl mx-auto px-4 py-6">
        <div className="space-y-6">
          {/* Title */}
          <div className="space-y-1">
            <h1 className="text-xl font-bold text-stone-900">
              {currentContent ? "오늘의 묘비명 수정" : "오늘의 묘비명 작성"}
            </h1>
            <p className="text-sm text-stone-500">
              만약 오늘이 마지막 날이라면, 어떤 문장을 남기고 싶으신가요?
            </p>
          </div>

          {/* Form */}
          <form action={upsertEpitaph} className="space-y-4">
            <div className="space-y-2">
              <WriteArea defaultValue={currentContent} />
            </div>
            <div className="flex gap-3">
              <Link
                href="/"
                className="flex-1 text-center py-3 rounded-xl border border-stone-200 text-stone-600 text-sm font-medium hover:bg-stone-50 transition-colors"
              >
                취소
              </Link>
              <button
                type="submit"
                className="flex-1 py-3 rounded-xl bg-stone-900 text-white text-sm font-medium hover:bg-stone-700 transition-colors"
              >
                {currentContent ? "수정하기" : "작성하기"}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}

