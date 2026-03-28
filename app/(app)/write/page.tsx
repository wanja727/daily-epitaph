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
    })
    .from(epitaphs)
    .where(
      and(eq(epitaphs.userId, session!.user.id), eq(epitaphs.date, today))
    )
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
          어제를 묻고, 오늘을 부활의 순종으로 걸어가는 두 부분의 고백
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
