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
    <div className="px-5 py-5 space-y-4">
      {/* 헤더 */}
      <div className="text-xs tracking-[0.25em] uppercase text-brown-light">
        Empty Tomb Project
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-[28px] leading-[1.1] font-heading font-bold text-brown-dark">
            나의 여정
          </h2>
          <div className="mt-2 flex items-center gap-2 text-sm text-brown-mid">
            {session!.user.nickname ?? session!.user.name ?? "익명"}
            {session!.user.realName && (
              <span className="text-brown-light">
                · {session!.user.realName}
              </span>
            )}
            {cellName && <span className="text-brown-light">· {cellName}</span>}
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
            className="text-xs text-brown-light hover:text-brown px-3 py-1.5 rounded-full border border-stone hover:bg-sand transition-colors"
          >
            로그아웃
          </button>
        </form>
      </div>

      {/* 40일 출석 */}
      <div className="rounded-[28px] border border-stone bg-white/70 backdrop-blur-sm shadow-sm p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.18em] text-brown-light">
              Participation tracker
            </div>
            <div className="mt-1 text-2xl font-heading font-bold text-brown-dark">
              {attendedDates.size}일 참여
            </div>
          </div>
          <span className="inline-flex rounded-full px-3 py-1 text-xs bg-gold-light text-[#7A6841]">
            {attendedDates.size}/{PROJECT_DAYS} complete
          </span>
        </div>
        <div className="mt-4">
          <AttendanceGrid
            startDate={PROJECT_START_DATE}
            totalDays={PROJECT_DAYS}
            attendedDates={attendedDates}
          />
        </div>
      </div>

      {/* 내 묘비명 히스토리 */}
      <div className="rounded-[28px] border border-stone bg-white/70 backdrop-blur-sm shadow-sm p-4">
        <div className="text-xs uppercase tracking-[0.18em] text-brown-light">
          Recent archive
        </div>
        {myEpitaphs.length === 0 ? (
          <div className="text-center py-8 text-brown-light text-sm">
            아직 작성한 기록이 없어요
          </div>
        ) : (
          <div className="mt-3 space-y-3">
            {myEpitaphs.map((e) => (
              <div key={e.id} className="rounded-2xl bg-[#F8F4EC] p-3">
                <div className="text-sm text-brown-dark">
                  {formatDateKR(e.date)}
                </div>
                <div className="mt-2 space-y-1.5">
                  <p className="text-xs text-brown-mid leading-5 whitespace-pre-line">
                    {e.yesterday}
                  </p>
                  <p className="text-xs text-[#4D5B46] leading-5 whitespace-pre-line">
                    {e.today}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
