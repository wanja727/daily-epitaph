import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { epitaphs, users } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { redirect } from "next/navigation";
import Link from "next/link";
import Header from "@/app/components/Header";

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

export default async function FeedPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const today = getTodayKST();

  const todayEpitaphs = await db
    .select({
      id: epitaphs.id,
      content: epitaphs.content,
      userId: epitaphs.userId,
      userName: users.name,
      userImage: users.image,
      updatedAt: epitaphs.updatedAt,
    })
    .from(epitaphs)
    .innerJoin(users, eq(epitaphs.userId, users.id))
    .where(eq(epitaphs.date, today))
    .orderBy(desc(epitaphs.updatedAt));

  const myEpitaph = todayEpitaphs.find((e) => e.userId === session.user!.id);

  const todayFormatted = new Date().toLocaleDateString("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  return (
    <div>
      <Header />
      <main className="max-w-xl mx-auto px-4 py-6 space-y-6">
        {/* Date */}
        <div className="text-center space-y-1">
          <p className="text-xs text-stone-400 uppercase tracking-widest">TODAY</p>
          <p className="text-sm text-stone-600">{todayFormatted}</p>
        </div>

        {/* My epitaph CTA */}
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          {myEpitaph ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-stone-400">나의 오늘 묘비명</span>
                <Link
                  href="/write"
                  className="text-xs text-stone-500 hover:text-stone-800 underline underline-offset-2"
                >
                  수정
                </Link>
              </div>
              <p className="text-base font-medium text-stone-800 leading-relaxed">
                &ldquo;{myEpitaph.content}&rdquo;
              </p>
            </div>
          ) : (
            <Link
              href="/write"
              className="flex flex-col items-center py-4 gap-2 text-center group"
            >
              <span className="text-2xl">✍️</span>
              <span className="text-sm font-medium text-stone-700 group-hover:text-stone-900">
                오늘의 묘비명을 작성해 보세요
              </span>
              <span className="text-xs text-stone-400">
                오늘 하루를 한 문장으로 담아보세요
              </span>
            </Link>
          )}
        </div>

        {/* Feed */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-stone-500">
            오늘의 묘비명{todayEpitaphs.length > 0 ? ` · ${todayEpitaphs.length}명` : ""}
          </h2>
          {todayEpitaphs.length === 0 ? (
            <div className="text-center py-12 text-stone-400 text-sm">
              아직 오늘의 묘비명을 작성한 분이 없어요
            </div>
          ) : (
            <ul className="space-y-3">
              {todayEpitaphs.map((epitaph) => (
                <li
                  key={epitaph.id}
                  className="bg-white rounded-2xl border border-stone-200 p-4 space-y-2"
                >
                  <div className="flex items-center gap-2">
                    {epitaph.userImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={epitaph.userImage}
                        alt={epitaph.userName ?? ""}
                        className="w-7 h-7 rounded-full object-cover bg-stone-200"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-stone-200 flex items-center justify-center text-xs text-stone-500">
                        {(epitaph.userName ?? "?")[0]}
                      </div>
                    )}
                    <span className="text-sm font-medium text-stone-700">
                      {epitaph.userName ?? "익명"}
                    </span>
                    {epitaph.userId === session.user!.id && (
                      <span className="text-xs bg-stone-100 text-stone-500 px-1.5 py-0.5 rounded">
                        나
                      </span>
                    )}
                  </div>
                  <p className="text-base text-stone-800 leading-relaxed pl-9">
                    &ldquo;{epitaph.content}&rdquo;
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
