export const PROJECT_START_DATE = "2026-04-06";
export const PROJECT_DAYS = 40;

export const FLOWER_STAGES = {
  SEEDLING: 1, // 작은 새싹
  BUD: 2, // 줄기가 자란 봉우리
  BLOOM: 3, // 활짝 핀 꽃 (완성)
} as const;

/** 각 단계로 성장하기 위해 필요한 누적 물 횟수 */
export const WATER_THRESHOLDS = {
  [FLOWER_STAGES.BUD]: 3, // 1→2: 물 3회
  [FLOWER_STAGES.BLOOM]: 7, // 2→3: 물 7회 (누적)
} as const;

export const GARDEN_SIZE = 5; // 5×5 그리드
