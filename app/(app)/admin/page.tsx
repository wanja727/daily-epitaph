import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { users, epitaphs, cells, dailyVisits } from "@/lib/db/schema";
import { eq, sql, and, count, countDistinct } from "drizzle-orm";
import { getTodayKST } from "@/lib/utils/date";
import { PROJECT_START_DATE } from "@/lib/utils/constants";

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user?.isAdmin) redirect("/main");

  const today = getTodayKST();

  // 전체 참여자 수 (온보딩 완료한 사용자)
  const [{ totalUsers }] = await db
    .select({ totalUsers: count() })
    .from(users)
    .where(eq(users.onboardingCompleted, true));

  // 오늘 방문자 수 (daily_visit 테이블 기반)
  const [{ todayVisitors }] = await db
    .select({ todayVisitors: count() })
    .from(dailyVisits)
    .where(eq(dailyVisits.date, today));

  // 오늘 작성자 수
  const [{ todayWriters }] = await db
    .select({ todayWriters: count() })
    .from(epitaphs)
    .where(eq(epitaphs.date, today));

  // 작성률
  const writeRate =
    totalUsers > 0 ? Math.round((todayWriters / totalUsers) * 100) : 0;

  // 셀별 참여율 (오늘)
  const cellStatsToday = await db
    .select({
      cellId: cells.id,
      cellName: cells.name,
      memberCount: countDistinct(users.id),
      writerCount: countDistinct(epitaphs.userId),
    })
    .from(cells)
    .leftJoin(
      users,
      and(eq(users.cellId, cells.id), eq(users.onboardingCompleted, true))
    )
    .leftJoin(
      epitaphs,
      and(eq(epitaphs.userId, users.id), eq(epitaphs.date, today))
    )
    .groupBy(cells.id, cells.name);

  // 참여율 내림차순 정렬
  cellStatsToday.sort((a, b) => {
    const rateA = a.memberCount > 0 ? a.writerCount / a.memberCount : 0;
    const rateB = b.memberCount > 0 ? b.writerCount / b.memberCount : 0;
    return rateB - rateA;
  });

  // 셀별 참여율 (전체 기간) — 셀 멤버 수 × 경과일 대비 총 작성 건수
  const daysSinceStart = Math.max(
    1,
    Math.floor(
      (new Date(today).getTime() - new Date(PROJECT_START_DATE).getTime()) /
        (1000 * 60 * 60 * 24)
    ) + 1
  );

  const cellStatsAll = await db
    .select({
      cellId: cells.id,
      cellName: cells.name,
      memberCount: countDistinct(users.id),
      totalWriteDays: count(epitaphs.date),
    })
    .from(cells)
    .leftJoin(
      users,
      and(eq(users.cellId, cells.id), eq(users.onboardingCompleted, true))
    )
    .leftJoin(epitaphs, eq(epitaphs.userId, users.id))
    .groupBy(cells.id, cells.name);

  // 참여율 내림차순 정렬
  cellStatsAll.sort((a, b) => {
    const maxA = a.memberCount * daysSinceStart;
    const maxB = b.memberCount * daysSinceStart;
    const rateA = maxA > 0 ? a.totalWriteDays / maxA : 0;
    const rateB = maxB > 0 ? b.totalWriteDays / maxB : 0;
    return rateB - rateA;
  });

  // 개인별 참여율
  const userStats = await db
    .select({
      userId: users.id,
      nickname: users.nickname,
      realName: users.realName,
      cellName: cells.name,
      writeDays: countDistinct(epitaphs.date),
    })
    .from(users)
    .leftJoin(epitaphs, eq(epitaphs.userId, users.id))
    .leftJoin(cells, eq(users.cellId, cells.id))
    .where(eq(users.onboardingCompleted, true))
    .groupBy(users.id, users.nickname, users.realName, cells.name)
    .orderBy(sql`count(DISTINCT ${epitaphs.date}) DESC`);

  return (
    <div className="px-5 py-5 space-y-6">
      {/* 헤더 */}
      <div>
        <div className="text-xs tracking-[0.25em] uppercase text-brown-light">
          Admin Dashboard
        </div>
        <h2 className="mt-1 text-[28px] leading-[1.1] font-heading font-bold text-brown-dark">
          서비스 지표
        </h2>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="전체 참여자" value={totalUsers} unit="명" />
        <StatCard label="오늘 방문자" value={todayVisitors} unit="명" />
        <StatCard label="오늘 작성자" value={todayWriters} unit="명" />
        <StatCard label="오늘 작성률" value={writeRate} unit="%" />
      </div>

      {/* 셀별 참여율 (오늘) */}
      <section>
        <h3 className="text-lg font-heading font-bold text-brown-dark mb-3">
          셀별 참여율 (오늘)
        </h3>
        <div className="space-y-2">
          {cellStatsToday.map((cell) => {
            const rate =
              cell.memberCount > 0
                ? Math.round((cell.writerCount / cell.memberCount) * 100)
                : 0;
            return (
              <CellBar
                key={cell.cellId}
                name={cell.cellName}
                current={cell.writerCount}
                total={cell.memberCount}
                rate={rate}
                unit="명"
              />
            );
          })}
        </div>
      </section>

      {/* 셀별 참여율 (전체 기간) */}
      <section>
        <h3 className="text-lg font-heading font-bold text-brown-dark mb-3">
          셀별 참여율 (전체 기간)
        </h3>
        <p className="text-xs text-brown-mid mb-2">
          프로젝트 {daysSinceStart}일 경과 · 멤버 수 × 경과일 대비 총 작성 건수
        </p>
        <div className="space-y-2">
          {cellStatsAll.map((cell) => {
            const maxWrites = cell.memberCount * daysSinceStart;
            const rate =
              maxWrites > 0
                ? Math.round((cell.totalWriteDays / maxWrites) * 100)
                : 0;
            return (
              <CellBar
                key={cell.cellId}
                name={cell.cellName}
                current={cell.totalWriteDays}
                total={maxWrites}
                rate={rate}
                unit="건"
              />
            );
          })}
        </div>
      </section>

      {/* 개인별 참여율 */}
      <section>
        <h3 className="text-lg font-heading font-bold text-brown-dark mb-3">
          개인별 참여율 (전체 기간)
        </h3>
        <div className="bg-white/60 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone/30">
                <th className="text-left px-4 py-2 text-brown-mid font-medium">
                  이름
                </th>
                <th className="text-left px-4 py-2 text-brown-mid font-medium">
                  셀
                </th>
                <th className="text-right px-4 py-2 text-brown-mid font-medium">
                  작성일
                </th>
                <th className="text-right px-4 py-2 text-brown-mid font-medium">
                  참여율
                </th>
              </tr>
            </thead>
            <tbody>
              {userStats.map((u) => {
                const rate = Math.round(
                  (Number(u.writeDays) / daysSinceStart) * 100
                );
                return (
                  <tr
                    key={u.userId}
                    className="border-b border-stone/10 last:border-0"
                  >
                    <td className="px-4 py-2 text-brown-dark">
                      {u.nickname || u.realName}
                    </td>
                    <td className="px-4 py-2 text-brown-mid">
                      {u.cellName || "-"}
                    </td>
                    <td className="text-right px-4 py-2 text-brown-mid">
                      {Number(u.writeDays)}/{daysSinceStart}
                    </td>
                    <td className="text-right px-4 py-2">
                      <span
                        className={`font-medium ${
                          rate >= 80
                            ? "text-olive"
                            : rate >= 50
                              ? "text-brown-dark"
                              : "text-rose-500"
                        }`}
                      >
                        {rate}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  unit,
}: {
  label: string;
  value: number;
  unit: string;
}) {
  return (
    <div className="bg-white/60 rounded-xl px-4 py-4">
      <div className="text-xs text-brown-mid mb-1">{label}</div>
      <div className="text-2xl font-heading font-bold text-brown-dark">
        {value}
        <span className="text-sm font-normal text-brown-mid ml-1">{unit}</span>
      </div>
    </div>
  );
}

function CellBar({
  name,
  current,
  total,
  rate,
  unit,
}: {
  name: string;
  current: number;
  total: number;
  rate: number;
  unit: string;
}) {
  return (
    <div className="bg-white/60 rounded-xl px-4 py-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-brown-dark">{name}</span>
        <span className="text-sm text-brown-mid">
          {current}/{total}
          {unit} ({rate}%)
        </span>
      </div>
      <div className="w-full bg-stone/30 rounded-full h-2">
        <div
          className="bg-olive rounded-full h-2 transition-all"
          style={{ width: `${Math.min(rate, 100)}%` }}
        />
      </div>
    </div>
  );
}
