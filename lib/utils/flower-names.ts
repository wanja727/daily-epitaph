const adjectives = [
  "싱그러운",
  "은은한",
  "포근한",
  "반짝이는",
  "고요한",
  "따스한",
  "설레는",
  "맑은",
  "부드러운",
  "향기로운",
  "산뜻한",
  "눈부신",
  "아름다운",
  "청초한",
  "사랑스러운",
];

const flowers = [
  "튤립",
  "수국",
  "장미",
  "백합",
  "해바라기",
  "라벤더",
  "데이지",
  "코스모스",
  "프리지아",
  "카네이션",
  "벚꽃",
  "목련",
  "수선화",
  "은방울꽃",
  "안개꽃",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** 랜덤 꽃 닉네임 생성 (ex: "싱그러운 튤립 07") */
export function generateFlowerNickname(): string {
  const adj = pick(adjectives);
  const flower = pick(flowers);
  const num = String(Math.floor(Math.random() * 100)).padStart(2, "0");
  return `${adj} ${flower} ${num}`;
}
