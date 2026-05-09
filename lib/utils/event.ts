import { db } from "@/lib/db";
import { gardenPlots } from "@/lib/db/schema";
import { and, eq, lt, sql } from "drizzle-orm";

// ─── 「Blooming Week」 이벤트 (40일의 마지막 주간) ──────────────────────────────
//
// 운영 중 보상값/임계치를 손쉽게 조정할 수 있도록 모든 상수를 한 파일에 모은다.
// 날짜는 KST `YYYY-MM-DD` 문자열로 비교한다 (DB date 컬럼/`getTodayKST()`와 동일 형식).

export const EVENT_NAME = "🌸 Blooming Week";
export const EVENT_START_DATE = "2026-05-10";
export const EVENT_END_DATE = "2026-05-15";

/** 주일 보너스 — 5/10(일) 작성 시 일괄 지급 */
export const SUNDAY_BOOST_DATE = "2026-05-10";
export const SUNDAY_BOOST_REWARD = 3;

/** 랜덤데이 — 셀 꽃밭 꽃 수에 따라 차등 지급 */
export const RANDOM_DAY_DATE = "2026-05-13";
export const RANDOM_DAY_THRESHOLD = 10; // 셀 꽃밭에 심긴 꽃 ≥ 10
export const RANDOM_DAY_REWARD_AT_OR_ABOVE = 3;
export const RANDOM_DAY_REWARD_BELOW = 6;

/** 평소 보상 (이벤트 기간 외 + 이벤트 기간 내 일반일) */
export const DEFAULT_REWARD = 1;

/** 메인 화면 이벤트 배너의 "오늘 다시 보지 않기" 쿠키 이름 */
export const EVENT_BANNER_COOKIE = "event_banner_dismissed_at";

export type EventReward = {
  reward: number;
  kind: "default" | "sunday-boost" | "random-day";
  /** 랜덤데이일 때만: 차등 판정에 사용한 셀 꽃 수 */
  cellFlowerCount?: number;
  /** 랜덤데이일 때만: 임계치를 넘었는지 (true=적은 보상, false=많은 보상) */
  isAboveThreshold?: boolean;
};

export function isWithinEventPeriod(dateKST: string): boolean {
  return dateKST >= EVENT_START_DATE && dateKST <= EVENT_END_DATE;
}

export function isRandomDay(dateKST: string): boolean {
  return dateKST === RANDOM_DAY_DATE;
}

export function isSundayBoost(dateKST: string): boolean {
  return dateKST === SUNDAY_BOOST_DATE;
}

/** 셀 꽃밭에 심긴(stage=3, gardenPlots) 꽃 수 — 랜덤데이 차등 판정 기준
 *  beforeKstDate("YYYY-MM-DD")가 주어지면 해당 날짜의 KST 자정(00:00) 이전에 심긴 꽃만 센다.
 *  - 랜덤데이 보상이 하루 동안 고정되도록(셀원 모두 같은 보상) 자정 스냅샷 기준으로 판정한다. */
export async function getCellPlacedFlowerCount(
  cellId: string,
  beforeKstDate?: string,
): Promise<number> {
  const whereClause = beforeKstDate
    ? and(
        eq(gardenPlots.cellId, cellId),
        lt(gardenPlots.placedAt, new Date(`${beforeKstDate}T00:00:00+09:00`)),
      )
    : eq(gardenPlots.cellId, cellId);
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(gardenPlots)
    .where(whereClause);
  return row?.count ?? 0;
}

/**
 * 특정 날짜 + 셀에 대한 물 보상값을 계산한다.
 * - 5/10: 모두 +SUNDAY_BOOST_REWARD
 * - 5/13: 셀 꽃 ≥ THRESHOLD → REWARD_AT_OR_ABOVE / 미만 → REWARD_BELOW
 *   (cellId 가 null 이면 임계치 미만으로 간주하여 더 많은 보상)
 * - 그 외: +DEFAULT_REWARD
 */
export async function calculateWaterReward(
  dateKST: string,
  cellId: string | null,
): Promise<EventReward> {
  if (isSundayBoost(dateKST)) {
    return { reward: SUNDAY_BOOST_REWARD, kind: "sunday-boost" };
  }
  if (isRandomDay(dateKST)) {
    // 랜덤데이 당일 자정(KST) 기준 스냅샷으로 판정 — 하루 동안 셀원 모두 동일한 보상.
    const cellFlowerCount = cellId
      ? await getCellPlacedFlowerCount(cellId, RANDOM_DAY_DATE)
      : 0;
    const isAboveThreshold = cellFlowerCount >= RANDOM_DAY_THRESHOLD;
    return {
      reward: isAboveThreshold
        ? RANDOM_DAY_REWARD_AT_OR_ABOVE
        : RANDOM_DAY_REWARD_BELOW,
      kind: "random-day",
      cellFlowerCount,
      isAboveThreshold,
    };
  }
  return { reward: DEFAULT_REWARD, kind: "default" };
}
