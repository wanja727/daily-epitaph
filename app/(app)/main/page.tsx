import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { epitaphs, users, cells } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { getTodayKST } from "@/lib/utils/date";
import Link from "next/link";
import FeedTabs from "./FeedTabs";

export default async function MainPage() {
  const session = await auth();
  const today = getTodayKST();

  const todayFormatted = new Date().toLocaleDateString("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  // 오늘의 모든 묘비명 + 사용자 정보
  const todayEpitaphs = await db
    .select({
      id: epitaphs.id,
      yesterday: epitaphs.yesterday,
      today: epitaphs.today,
      userId: epitaphs.userId,
      nickname: users.nickname,
      cellId: users.cellId,
      updatedAt: epitaphs.updatedAt,
    })
    .from(epitaphs)
    .innerJoin(users, eq(epitaphs.userId, users.id))
    .where(eq(epitaphs.date, today))
    .orderBy(desc(epitaphs.updatedAt));

  // 내 셀 이름 조회
  let cellName: string | null = null;
  if (session?.user?.cellId) {
    const [cell] = await db
      .select({ name: cells.name })
      .from(cells)
      .where(eq(cells.id, session.user.cellId))
      .limit(1);
    cellName = cell?.name ?? null;
  }

  const myEpitaph = todayEpitaphs.find(
    (e) => e.userId === session?.user?.id
  );

  return (
    <div className="px-4 py-6 space-y-5">
      {/* 날짜 + 인사 */}
      <div className="space-y-1">
        <p className="text-xs text-slate-500 uppercase tracking-widest">
          TODAY
        </p>
        <p className="text-sm text-slate-400">{todayFormatted}</p>
      </div>

      {/* 피드 (클라이언트 컴포넌트에서 필터링) */}
      <FeedTabs
        epitaphs={todayEpitaphs}
        myCellId={session?.user?.cellId ?? null}
        myUserId={session?.user?.id ?? ""}
        cellName={cellName}
        wroteToday={!!myEpitaph}
      />

      {/* 플로팅 작성 버튼 */}
      <Link
        href="/write"
        className="fixed bottom-24 right-6 z-40 w-14 h-14 rounded-full bg-accent hover:bg-accent-bright shadow-lg shadow-accent/30 flex items-center justify-center transition-colors"
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </Link>
    </div>
  );
}
