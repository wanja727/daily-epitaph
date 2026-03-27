import { PROJECT_START_DATE, PROJECT_DAYS } from "./constants";

/** 오늘 날짜를 KST YYYY-MM-DD 형식으로 반환 */
export function getTodayKST(): string {
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
