import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { epitaphs } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getTodayKST } from "@/lib/utils/date";
import WriteForm from "./WriteForm";

export default async function WritePage() {
  const session = await auth();
  const today = getTodayKST();

  const existing = await db
    .select({
      yesterday: epitaphs.yesterday,
      today: epitaphs.today,
      requestScriptureRecommendation: epitaphs.requestScriptureRecommendation,
    })
    .from(epitaphs)
    .where(and(eq(epitaphs.userId, session!.user.id), eq(epitaphs.date, today)))
    .limit(1);

  const current = existing[0] ?? null;

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

      <WriteForm
        defaultYesterday={current?.yesterday ?? ""}
        defaultToday={current?.today ?? ""}
        defaultRequestRecommendation={
          current?.requestScriptureRecommendation ?? false
        }
        isEdit={!!current}
      />
    </div>
  );
}
