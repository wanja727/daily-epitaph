import { auth, signOut } from "@/lib/auth";
import { db } from "@/lib/db";
import { epitaphs, cells } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { PROJECT_START_DATE, PROJECT_DAYS } from "@/lib/utils/constants";
import { formatDateKR } from "@/lib/utils/date";
import AttendanceGrid from "./AttendanceGrid";

export default async function MyPage() {
  const session = await auth();
  const userId = session!.user.id;

  // 셀 이름
  let cellName: string | null = null;
  if (session!.user.cellId) {
    const [cell] = await db
      .select({ name: cells.name })
      .from(cells)
      .where(eq(cells.id, session!.user.cellId))
      .limit(1);
    cellName = cell?.name ?? null;
  }

  // 내 묘비명 전체 조회
  const myEpitaphs = await db
    .select({
      id: epitaphs.id,
      yesterday: epitaphs.yesterday,
      today: epitaphs.today,
      date: epitaphs.date,
    })
    .from(epitaphs)
    .where(eq(epitaphs.userId, userId))
    .orderBy(desc(epitaphs.date));

  // 참석일 Set
  const attendedDates = new Set(myEpitaphs.map((e) => e.date));

  return (
    <div className="px-4 py-6 space-y-6">
      {/* 프로필 */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-lg font-bold text-brown">
            {session!.user.nickname ?? session!.user.name ?? "익명"}
          </h1>
          <div className="flex items-center gap-2 text-xs text-warm-gray">
            {session!.user.realName && (
              <span>{session!.user.realName}</span>
            )}
            {cellName && (
              <>
                <span>·</span>
                <span>{cellName}</span>
              </>
            )}
          </div>
        </div>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button
            type="submit"
            className="text-xs text-warm-gray hover:text-brown px-3 py-1.5 rounded-lg border border-warm-gray/30 hover:bg-brown/5 transition-colors"
          >
            로그아웃
          </button>
        </form>
      </div>

      {/* 40일 출석 */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-brown-light">
          40일 참여 현황
          <span className="ml-2 text-olive">
            {attendedDates.size}/{PROJECT_DAYS}일
          </span>
        </h2>
        <AttendanceGrid
          startDate={PROJECT_START_DATE}
          totalDays={PROJECT_DAYS}
          attendedDates={attendedDates}
        />
      </div>

      {/* 내 묘비명 히스토리 */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-brown-light">
          나의 묘비명 기록
          {myEpitaphs.length > 0 && ` (${myEpitaphs.length})`}
        </h2>
        {myEpitaphs.length === 0 ? (
          <div className="text-center py-12 text-warm-gray text-sm">
            아직 작성한 묘비명이 없어요
          </div>
        ) : (
          <ul className="space-y-3">
            {myEpitaphs.map((e) => (
              <li
                key={e.id}
                className="rounded-2xl bg-white border border-warm-gray/30 p-4 space-y-3"
              >
                <span className="text-xs text-warm-gray">
                  {formatDateKR(e.date)}
                </span>
                <div className="space-y-2">
                  <div>
                    <p className="text-[10px] text-warm-gray uppercase tracking-wider mb-0.5">
                      어제를 돌아보며
                    </p>
                    <p className="text-sm text-brown-light leading-relaxed whitespace-pre-line">
                      {e.yesterday}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-warm-gray uppercase tracking-wider mb-0.5">
                      오늘을 기대하며
                    </p>
                    <p className="text-sm text-brown-light leading-relaxed whitespace-pre-line">
                      {e.today}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
