import {
  EVENT_NAME,
  EVENT_START_DATE,
  EVENT_END_DATE,
  RANDOM_DAY_DATE,
  SUNDAY_BOOST_DATE,
  SUNDAY_BOOST_REWARD,
  isSundayBoost,
  isRandomDay,
  isWithinEventPeriod,
  calculateWaterReward,
} from "@/lib/utils/event";

/** "YYYY-MM-DD" → "M/D" (월/일 leading zero 제거) */
function toMonthDay(dateKST: string): string {
  const [, m, d] = dateKST.split("-");
  return `${parseInt(m, 10)}/${parseInt(d, 10)}`;
}

/**
 * 이벤트 안내 배너 (서버 컴포넌트). 이벤트 기간(5/9~5/15) 외에는 null.
 *
 * variant="main" — 메인 화면 고정 배너:
 *   날짜와 무관하게 항상 동일한 이벤트명 + 두 티저(주일 보너스/랜덤데이)만 노출.
 *
 * variant="write" (기본) — 작성 화면:
 *   - 5/10(주일 보너스): 모두 +2 안내
 *   - 5/13(랜덤데이): 셀 꽃 수에 따라 +3 또는 +6 — 당일에만 노출
 *   - 5/9: 5/10 주일 보너스 + 5/13 랜덤데이 티저
 *   - 5/11~5/12: 5/13 랜덤데이 티저
 *   - 그 외 평일(5/14~15): 평소 보상 + 이벤트명 안내
 */
export default async function EventBanner({
  todayDate,
  cellId,
  hasWrittenToday,
  footer,
  variant = "write",
}: {
  todayDate: string;
  cellId: string | null;
  hasWrittenToday: boolean;
  /** 카드 우하단에 끼워 넣을 액션(예: "오늘 다시 보지 않기" 버튼). 컨텐츠 흐름 안에 자리잡아 티저와 겹치지 않는다. */
  footer?: React.ReactNode;
  variant?: "main" | "write";
}) {
  if (!isWithinEventPeriod(todayDate)) return null;

  const isMainVariant = variant === "main";
  // 메인 배너는 날짜별 분기/보상 계산이 필요 없다 — 항상 정적 안내만 노출.
  const result = isMainVariant
    ? null
    : await calculateWaterReward(todayDate, cellId);

  // 메인 배너는 두 티저를 항상 노출, 작성 배너는 해당 날짜 도래 전까지만.
  const showSundayBoostTeaser =
    isMainVariant ||
    (todayDate < SUNDAY_BOOST_DATE && todayDate >= EVENT_START_DATE);
  const showRandomDayTeaser =
    isMainVariant ||
    (todayDate < RANDOM_DAY_DATE && todayDate >= EVENT_START_DATE);

  // ─── 메인 메시지 ────────────────────────────────────────────────────────────
  // 이벤트 보상이 적용되는 날(주일 보너스/랜덤데이)에만 보상 문구를 노출한다.
  // 평소 보상(+1)인 일반 이벤트 일에는 본문 없이 제목/티저만 보여준다.
  let mainEmoji = "📜";
  let mainTitle: string;
  let mainBody: string | null = null;

  if (!isMainVariant && isSundayBoost(todayDate) && result) {
    mainEmoji = "🌟";
    mainTitle = "주일 보너스";
    mainBody = hasWrittenToday
      ? `오늘의 물뿌리개 +${result.reward}개를 받았어요`
      : `오늘 작성하면 물뿌리개를 ${result.reward}개 받아요`;
  } else if (!isMainVariant && isRandomDay(todayDate) && result) {
    mainEmoji = "🎁";
    mainTitle = "오늘은 랜덤데이!";
    if (hasWrittenToday) {
      mainBody = `오늘의 물뿌리개 +${result.reward}개를 받았어요`;
    } else {
      const cnt = result.cellFlowerCount ?? 0;
      mainBody = result.isAboveThreshold
        ? `우리 셀 꽃밭의 꽃 ${cnt}송이 — 작성하면 물뿌리개 ${result.reward}개를 받아요`
        : `우리 셀 꽃밭의 꽃 ${cnt}송이 — 작성하면 물뿌리개 ${result.reward}개를 받아요!`;
    }
  } else {
    mainEmoji = "📜";
    mainTitle = `「${EVENT_NAME}」 진행중`;
  }

  return (
    <div className="rounded-3xl border border-olive/30 bg-[#F2F4EC] px-4 py-3 shadow-sm">
      <div className="flex items-start gap-2.5">
        <div className="text-xl leading-none mt-0.5">{mainEmoji}</div>
        <div className="flex-1 min-w-0">
          <div className="text-xs uppercase tracking-[0.18em] text-[#7A8B6E]">
            Event · {toMonthDay(EVENT_START_DATE)} ~ {toMonthDay(EVENT_END_DATE)}
          </div>
          <div className="mt-0.5 text-sm font-heading font-bold text-[#516047]">
            {mainTitle}
          </div>
          {mainBody && (
            <p className="mt-1 text-xs text-brown-mid leading-5">{mainBody}</p>
          )}

          {showSundayBoostTeaser && (
            <div className="mt-2 flex items-center gap-1.5 rounded-full bg-white/70 px-2.5 py-1 text-[11px] text-[#7A8B6E] w-fit">
              <span>🌟</span>
              <span>주일 보너스 — 주일날 작성 시 물뿌리개 추가 지급</span>
            </div>
          )}

          {showRandomDayTeaser && (
            <div className="mt-2 flex items-center gap-1.5 rounded-full bg-white/70 px-2.5 py-1 text-[11px] text-[#7A8B6E] w-fit">
              <span>✨</span>
              <span>
                랜덤데이 — 이벤트 기간 중 하루는 평소보다 더 많은 물뿌리개 지급
              </span>
            </div>
          )}

          {footer && <div className="mt-2 flex justify-end">{footer}</div>}
        </div>
      </div>
    </div>
  );
}
