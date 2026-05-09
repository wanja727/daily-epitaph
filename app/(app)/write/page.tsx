import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { epitaphs, serviceImpressions } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getTodayKST } from "@/lib/utils/date";
import { calculateWaterReward } from "@/lib/utils/event";
import WriteForm from "./WriteForm";
import EventBanner from "./EventBanner";

export default async function WritePage() {
  const session = await auth();
  const today = getTodayKST();

  const [existing, existingImpression] = await Promise.all([
    db
      .select({
        yesterday: epitaphs.yesterday,
        today: epitaphs.today,
        repentCategories: epitaphs.repentCategories,
        requestScriptureRecommendation: epitaphs.requestScriptureRecommendation,
      })
      .from(epitaphs)
      .where(and(eq(epitaphs.userId, session!.user.id), eq(epitaphs.date, today)))
      .limit(1),
    db
      .select({ id: serviceImpressions.id })
      .from(serviceImpressions)
      .where(eq(serviceImpressions.userId, session!.user.id))
      .limit(1),
  ]);

  const current = existing[0] ?? null;
  const hasImpression = existingImpression.length > 0;
  const cellId = session!.user.cellId ?? null;
  const reward = await calculateWaterReward(today, cellId);

  return (
    <div className="px-5 py-5 space-y-4">
      {/* 헤더 */}
      <div className="text-xs tracking-[0.25em] uppercase text-brown-light">
        Empty Tomb Project
      </div>

      <div>
        <h2 className="text-[28px] leading-[1.1] font-heading font-bold text-brown-dark">
          오늘의 기록
        </h2>
        <p className="mt-2 text-sm text-brown-mid leading-6">
          부활은 과거의 한 사건이 아니라, 오늘 내 삶에 계속되는 이야기여야 한다
        </p>
      </div>

      <EventBanner
        todayDate={today}
        cellId={cellId}
        hasWrittenToday={!!current}
      />

      <WriteForm
        defaultYesterday={current?.yesterday ?? ""}
        defaultToday={current?.today ?? ""}
        defaultRepentCategories={current?.repentCategories ?? []}
        defaultRequestRecommendation={
          (session!.user.scriptureRecommendationEnabled &&
            current?.requestScriptureRecommendation) ||
          false
        }
        isEdit={!!current}
        scriptureRecommendationEnabled={
          session!.user.scriptureRecommendationEnabled
        }
        hasImpression={hasImpression}
        rewardAmount={reward.reward}
      />
    </div>
  );
}
