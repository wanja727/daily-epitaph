import { cookies } from "next/headers";
import EventBanner from "@/app/(app)/write/EventBanner";
import {
  EVENT_BANNER_COOKIE,
  isWithinEventPeriod,
} from "@/lib/utils/event";
import { dismissEventBanner } from "./actions";
import MainEventBannerInner from "./MainEventBannerInner";
import DismissForTodayButton from "./DismissForTodayButton";

/**
 * 메인 화면 하단 고정 이벤트 배너 (서버 컴포넌트).
 * - 이벤트 기간이 아니면 null
 * - 쿠키(`EVENT_BANNER_COOKIE`)에 오늘 날짜가 저장돼있으면(= "오늘 다시 보지 않기" 클릭됨) null
 * - 그 외엔 EventBanner 의 footer 슬롯에 dismiss 버튼을 끼우고, 클라이언트 래퍼로 X 버튼/고정 포지션 처리
 */
export default async function MainEventBanner({
  todayDate,
  cellId,
  hasWrittenToday,
}: {
  todayDate: string;
  cellId: string | null;
  hasWrittenToday: boolean;
}) {
  if (!isWithinEventPeriod(todayDate)) return null;

  const cookieStore = await cookies();
  const dismissedAt = cookieStore.get(EVENT_BANNER_COOKIE)?.value;
  if (dismissedAt === todayDate) return null;

  return (
    <MainEventBannerInner>
      <EventBanner
        todayDate={todayDate}
        cellId={cellId}
        hasWrittenToday={hasWrittenToday}
        variant="main"
        footer={<DismissForTodayButton dismissAction={dismissEventBanner} />}
      />
    </MainEventBannerInner>
  );
}
