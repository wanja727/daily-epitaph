import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { epitaphs } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { redirect } from "next/navigation";
import Header from "@/app/components/Header";

export default async function HistoryPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const myEpitaphs = await db
    .select({
      id: epitaphs.id,
      content: epitaphs.content,
      date: epitaphs.date,
    })
    .from(epitaphs)
    .where(eq(epitaphs.userId, session.user.id))
    .orderBy(desc(epitaphs.date));

  return (
    <div>
      <Header />
      <main className="max-w-xl mx-auto px-4 py-6 space-y-6">
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-stone-900">나의 묘비명 기록</h1>
          <p className="text-sm text-stone-500">
            {myEpitaphs.length > 0
              ? `총 ${myEpitaphs.length}일의 기록이 있어요`
              : "아직 작성한 묘비명이 없어요"}
          </p>
        </div>

        {myEpitaphs.length === 0 ? (
          <div className="text-center py-16 text-stone-400 text-sm">
            <p>✍️</p>
            <p className="mt-2">오늘의 묘비명을 작성해 보세요</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {myEpitaphs.map((epitaph) => {
              const dateObj = new Date(epitaph.date + "T00:00:00");
              const formatted = dateObj.toLocaleDateString("ko-KR", {
                year: "numeric",
                month: "long",
                day: "numeric",
                weekday: "short",
              });

              return (
                <li
                  key={epitaph.id}
                  className="bg-white rounded-2xl border border-stone-200 p-4 space-y-2"
                >
                  <span className="text-xs text-stone-400">{formatted}</span>
                  <p className="text-base text-stone-800 leading-relaxed">
                    &ldquo;{epitaph.content}&rdquo;
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
