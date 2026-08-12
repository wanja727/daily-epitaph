import { PROJECT_START_DATE, PROJECT_DAYS } from "./constants";

/**
 * 개발 환경 전용 날짜 고정용 값.
 * `.env.local` 에 `NEXT_PUBLIC_DEV_TODAY=2026-04-20` 처럼 지정하면
 * 모든 화면이 해당 날짜 기준으로 렌더링된다 (캡처/테스트용).
 * 프로덕션 빌드에서는 무시된다.
 */
const DEV_TODAY =
  process.env.NODE_ENV !== "production"
    ? process.env.NEXT_PUBLIC_DEV_TODAY
    : undefined;

/** 오늘 날짜를 KST YYYY-MM-DD 형식으로 반환 */
export function getTodayKST(): string {
  if (DEV_TODAY && /^\d{4}-\d{2}-\d{2}$/.test(DEV_TODAY)) return DEV_TODAY;

  return new Date()
    .toLocaleDateString("ko-KR", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
    .replace(/\. /g, "-")
    .replace(/\.$/, "");
}

/** KST 기준 오늘의 프로젝트 날짜 (1~40). 범위 밖이면 null */
export function getProjectDay(): number | null {
  const today = new Date(getTodayKST());
  const start = new Date(PROJECT_START_DATE);
  const diffMs = today.getTime() - start.getTime();
  const day = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
  if (day < 1 || day > PROJECT_DAYS) return null;
  return day;
}

/** 프로젝트 N일차의 날짜를 YYYY-MM-DD로 반환 */
export function getDateForDay(day: number): string {
  const start = new Date(PROJECT_START_DATE);
  start.setDate(start.getDate() + day - 1);
  return start.toISOString().split("T")[0];
}

/** 프로젝트 종료일(40일차)을 지나면 true. 41일차부터 신규 기록 작성 불가. */
export function isWritingPeriodOver(): boolean {
  const today = getTodayKST();
  const endDate = getDateForDay(PROJECT_DAYS);
  return today > endDate;
}

/** KST 기준 오늘 날짜를 보기 좋게 포맷 */
export function formatDateKR(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });
}
