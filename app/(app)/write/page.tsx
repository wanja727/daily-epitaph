import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { epitaphs } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getTodayKST } from "@/lib/utils/date";
import WriteForm from "./WriteForm";

export default async function WritePage() {
  const session = await auth();
  const today = getTodayKST();

  // 오늘 이미 작성한 내용 조회
  const existing = await db
    .select({
      yesterday: epitaphs.yesterday,
      today: epitaphs.today,
    })
    .from(epitaphs)
    .where(
      and(eq(epitaphs.userId, session!.user.id), eq(epitaphs.date, today))
    )
    .limit(1);

  const current = existing[0] ?? null;

  return (
    <div className="px-4 py-6 space-y-6">
      {/* 헤더 이미지 영역 */}
      <div className="text-center space-y-3">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-linear-to-b from-gold/20 to-sage/10 flex items-center justify-center">
            <span className="text-3xl">🪨</span>
          </div>
        </div>
        <h1 className="text-lg font-bold text-brown">빈 무덤 프로젝트</h1>
        <p className="text-xs text-warm-gray italic">
          &ldquo;부활은 과거의 한 사건이 아니라,
          <br />
          매일 우리의 삶에서 계속되는 이야기여야 한다.&rdquo;
        </p>
      </div>

      <WriteForm
        defaultYesterday={current?.yesterday ?? ""}
        defaultToday={current?.today ?? ""}
        isEdit={!!current}
      />
    </div>
  );
}
