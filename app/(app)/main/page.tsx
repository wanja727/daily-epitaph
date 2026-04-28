import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  epitaphs,
  users,
  cells,
  epitaphReactions,
  scriptureRecommendations,
} from "@/lib/db/schema";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import { getTodayKST, getProjectDay } from "@/lib/utils/date";
import Link from "next/link";
import FeedTabs from "./FeedTabs";

export default async function MainPage() {
  const session = await auth();
  const today = getTodayKST();
  const projectDay = getProjectDay();

  const todayFormatted = new Date().toLocaleDateString("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  const myUserId = session?.user?.id ?? "";

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

  // 반응 집계: epitaphId별 type별 count + 내 반응
  const epitaphIds = todayEpitaphs.map((e) => e.id);
  let reactionCounts: { epitaphId: string; type: string; count: number }[] = [];
  let myReactionRows: { epitaphId: string; type: string }[] = [];

  if (epitaphIds.length > 0) {
    [reactionCounts, myReactionRows] = await Promise.all([
      db
        .select({
          epitaphId: epitaphReactions.epitaphId,
          type: epitaphReactions.type,
          count: sql<number>`count(*)::int`.as("count"),
        })
        .from(epitaphReactions)
        .where(inArray(epitaphReactions.epitaphId, epitaphIds))
        .groupBy(epitaphReactions.epitaphId, epitaphReactions.type),
      db
        .select({
          epitaphId: epitaphReactions.epitaphId,
          type: epitaphReactions.type,
        })
        .from(epitaphReactions)
        .where(
          and(
            inArray(epitaphReactions.epitaphId, epitaphIds),
            eq(epitaphReactions.userId, myUserId),
          ),
        ),
    ]);
  }

  // 병합
  const reactionMap = new Map<string, Record<string, number>>();
  for (const r of reactionCounts) {
    if (!reactionMap.has(r.epitaphId)) reactionMap.set(r.epitaphId, {});
    reactionMap.get(r.epitaphId)![r.type] = r.count;
  }

  const myReactionMap = new Map<string, string>();
  for (const r of myReactionRows) {
    myReactionMap.set(r.epitaphId, r.type);
  }

  const enrichedEpitaphs = todayEpitaphs.map((e) => ({
    ...e,
    reactions: reactionMap.get(e.id) ?? {},
    myReaction: myReactionMap.get(e.id) ?? null,
  }));

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

  const myEpitaph = todayEpitaphs.find((e) => e.userId === myUserId);

  // 본인 카드 추천 — 피드에 절대 포함되지 않는다.
  let myRecommendation: {
    themes: string[];
    situationTags: string[];
    emotionTags: string[];
    recommendations: Array<{ reference: string; reason: string; deepLinkUrl: string }>;
  } | null = null;

  if (myEpitaph) {
    const [r] = await db
      .select({
        themes: scriptureRecommendations.themes,
        situationTags: scriptureRecommendations.situationTags,
        emotionTags: scriptureRecommendations.emotionTags,
        recommendations: scriptureRecommendations.recommendations,
      })
      .from(scriptureRecommendations)
      .where(eq(scriptureRecommendations.epitaphId, myEpitaph.id))
      .limit(1);

    if (r && r.recommendations.length > 0) {
      myRecommendation = {
        themes: r.themes,
        situationTags: r.situationTags,
        emotionTags: r.emotionTags,
        recommendations: r.recommendations,
      };
    }
  }

  return (
    <div className="px-5 py-5 space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="text-xs tracking-[0.25em] uppercase text-brown-light">
          Empty Tomb Project
        </div>
      </div>

      <div>
        <div className="flex items-baseline gap-3">
          <h2 className="text-[28px] leading-[1.1] font-heading font-bold text-brown-dark">
            오늘의 기록
          </h2>
          {projectDay !== null && (
            <span className="ml-auto text-[28px] leading-[1.1] font-heading font-bold text-olive">
              Day {projectDay}
            </span>
          )}
        </div>
        <p className="mt-2 text-sm text-brown-mid leading-6">
          {todayFormatted}
        </p>
      </div>

      {/* 피드 — 본인 카드 안에 부활의 말씀이 함께 노출된다. */}
      <FeedTabs
        epitaphs={enrichedEpitaphs}
        myCellId={session?.user?.cellId ?? null}
        myUserId={myUserId}
        cellName={cellName}
        wroteToday={!!myEpitaph}
        myRecommendation={myRecommendation}
      />

      {/* 플로팅 작성 버튼 */}
      <Link
        href="/write"
        className="fixed bottom-24 right-6 z-40 w-14 h-14 rounded-full bg-olive hover:bg-sage shadow-lg shadow-olive/20 flex items-center justify-center transition-colors"
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#F8F3EA"
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
