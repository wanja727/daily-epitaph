/**
 * Gemini 전송 전 최소 sanitize.
 * 이메일/전화번호/URL/장문의 숫자열을 플레이스홀더로 마스킹한다.
 */
export function sanitizeCardText(input: string): string {
  if (!input) return "";
  let out = input;

  // URL (http/https/www)
  out = out.replace(/\b(?:https?:\/\/|www\.)\S+/gi, "[URL]");

  // Email
  out = out.replace(
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
    "[EMAIL]"
  );

  // Phone (한국 휴대전화/일반 전화 포함한 느슨한 패턴)
  out = out.replace(
    /\b0\d{1,2}[-.\s]?\d{3,4}[-.\s]?\d{4}\b/g,
    "[PHONE]"
  );
  out = out.replace(/\b\+?\d{1,3}[-.\s]?\d{2,4}[-.\s]?\d{3,4}[-.\s]?\d{4}\b/g, "[PHONE]");

  // 긴 숫자열(주민번호/계좌/카드 등 개인식별 가능성)
  out = out.replace(/\b\d{6,}\b/g, "[NUMBER]");

  return out;
}

export function buildCardText(yesterday: string, today: string): string {
  return `어제를 돌아보며\n${yesterday.trim()}\n\n오늘을 기대하며\n${today.trim()}`;
}

/**
 * epitaph 카드 → Gemini Embedding / 생성 모델에 동일하게 전달되는 텍스트.
 * 추천 정확도를 위해 섹션 라벨을 포함한 정규 포맷을 사용한다.
 */
export function buildEpitaphRecommendationText(input: {
  yesterday: string;
  today: string;
}): string {
  return [
    "어제를 돌아보며",
    input.yesterday.trim(),
    "",
    "오늘을 기대하며",
    input.today.trim(),
  ].join("\n");
}

/**
 * Gemini 전송 직전에 호출하는 sanitize alias.
 * 의미적으로 "Gemini 에 보내기 전 처리"임을 코드에서 명확히 하기 위한 별칭.
 */
export { sanitizeCardText as sanitizeForGemini };
