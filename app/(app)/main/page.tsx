import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  epitaphs,
  users,
  cells,
  epitaphReactions,
  scriptureRecommendations,
  dailyVideos,
  serviceImpressions,
  serviceImpressionReactions,
} from "@/lib/db/schema";
import { eq, and, desc, sql, inArray, lte } from "drizzle-orm";
import {
  getTodayKST,
  getProjectDay,
  isWritingPeriodOver,
} from "@/lib/utils/date";
import { PROJECT_DAYS } from "@/lib/utils/constants";
import Link from "next/link";
import FeedTabs from "./FeedTabs";
import PinnedVideoCard from "./PinnedVideoCard";
import MainEventBanner from "./MainEventBanner";
import FinalDayBanner from "./FinalDayBanner";

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
  const isLastDay = projectDay === PROJECT_DAYS;
  const writingOver = isWritingPeriodOver();

  // 오늘의 모든 묘비명 + 사용자 정보
  const todayEpitaphs = await db
    .select({
      id: epitaphs.id,
      yesterday: epitaphs.yesterday,
      today: epitaphs.today,
      repentCategories: epitaphs.repentCategories,
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

  // 빈무덤 소감 — 모든 구성원의 소감을 날짜와 무관하게 노출. 별도 탭에서만 보인다.
  const impressionRows = await db
    .select({
      id: serviceImpressions.id,
      content: serviceImpressions.content,
      userId: serviceImpressions.userId,
      nickname: users.nickname,
      cellId: users.cellId,
      createdAt: serviceImpressions.createdAt,
    })
    .from(serviceImpressions)
    .innerJoin(users, eq(serviceImpressions.userId, users.id))
    .orderBy(desc(serviceImpressions.createdAt));

  const impressionIds = impressionRows.map((i) => i.id);
  let impressionReactionCounts: {
    impressionId: string;
    type: string;
    count: number;
  }[] = [];
  let myImpressionReactionRows: { impressionId: string; type: string }[] = [];

  if (impressionIds.length > 0) {
    [impressionReactionCounts, myImpressionReactionRows] = await Promise.all([
      db
        .select({
          impressionId: serviceImpressionReactions.impressionId,
          type: serviceImpressionReactions.type,
          count: sql<number>`count(*)::int`.as("count"),
        })
        .from(serviceImpressionReactions)
        .where(inArray(serviceImpressionReactions.impressionId, impressionIds))
        .groupBy(
          serviceImpressionReactions.impressionId,
          serviceImpressionReactions.type,
        ),
      db
        .select({
          impressionId: serviceImpressionReactions.impressionId,
          type: serviceImpressionReactions.type,
        })
        .from(serviceImpressionReactions)
        .where(
          and(
            inArray(serviceImpressionReactions.impressionId, impressionIds),
            eq(serviceImpressionReactions.userId, myUserId),
          ),
        ),
    ]);
  }

  const impressionReactionMap = new Map<string, Record<string, number>>();
  for (const r of impressionReactionCounts) {
    if (!impressionReactionMap.has(r.impressionId))
      impressionReactionMap.set(r.impressionId, {});
    impressionReactionMap.get(r.impressionId)![r.type] = r.count;
  }
  const myImpressionReactionMap = new Map<string, string>();
  for (const r of myImpressionReactionRows) {
    myImpressionReactionMap.set(r.impressionId, r.type);
  }

  const enrichedImpressions = impressionRows.map((i) => ({
    ...i,
    reactions: impressionReactionMap.get(i.id) ?? {},
    myReaction: myImpressionReactionMap.get(i.id) ?? null,
  }));

  // 메인 피드 상단 고정 영상: 오늘 날짜 등록분이 있으면 그것, 없으면 가장 최근 등록분.
  const [pinnedVideo] = await db
    .select({
      date: dailyVideos.date,
      youtubeVideoId: dailyVideos.youtubeVideoId,
      title: dailyVideos.title,
    })
    .from(dailyVideos)
    .where(lte(dailyVideos.date, today))
    .orderBy(desc(dailyVideos.date))
    .limit(1);

  // ─────────────────────────────────────────────────────────────────────
  // 부활의 말씀(Scripture Recommendation) — 작성자 본인에게만 노출.
  // 공개 피드 응답에는 절대 포함하지 않는다. 본인이 본인 카드에 한해 조회.
  // ─────────────────────────────────────────────────────────────────────
  type RecPayload = {
    themes: string[];
    situationTags: string[];
    emotionTags: string[];
    recommendations: Array<{ reference: string; reason: string; deepLinkUrl: string }>;
  };

  let myRecommendation: RecPayload | null = null;
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

      {/* 마지막 날 안내 배너 (40일차에만 노출, Blooming Week 배너 대체) */}
      {isLastDay && <FinalDayBanner />}

      {/* 오늘의 묵상 영상 (관리자 등록 시) */}
      {pinnedVideo && (
        <PinnedVideoCard
          videoId={pinnedVideo.youtubeVideoId}
          title={pinnedVideo.title}
          date={pinnedVideo.date}
        />
      )}

      {/* 피드 — 부활의 말씀은 작성자 본인 카드에만 표시된다. */}
      <FeedTabs
        epitaphs={enrichedEpitaphs}
        impressions={enrichedImpressions}
        myCellId={session?.user?.cellId ?? null}
        myUserId={myUserId}
        cellName={cellName}
        wroteToday={!!myEpitaph}
        myRecommendation={myRecommendation}
      />

      {/* 이벤트 배너 — 이벤트 기간 + 쿠키 미dismiss 일 때만 노출 (마지막 날엔 FinalDayBanner 가 대체) */}
      {!isLastDay && (
        <MainEventBanner
          todayDate={today}
          cellId={session?.user?.cellId ?? null}
          hasWrittenToday={!!myEpitaph}
        />
      )}

      {/* 플로팅 작성 버튼 (작성 기간 종료 시 비활성화) */}
      {writingOver ? (
        <div
          aria-disabled="true"
          title="작성 기간 종료"
          className="fixed bottom-24 right-6 z-40 w-14 h-14 rounded-full bg-stone shadow-sm flex items-center justify-center cursor-not-allowed"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#8a786a"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="5" y="11" width="14" height="9" rx="2" />
            <path d="M8 11V8a4 4 0 0 1 8 0v3" />
          </svg>
        </div>
      ) : (
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
      )}
    </div>
  );
}
