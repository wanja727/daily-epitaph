export const PROJECT_START_DATE = "2026-03-28";
export const PROJECT_DAYS = 40;

export const FLOWER_STAGES = {
  SEEDLING: 1, // 작은 새싹
  BUD: 2, // 줄기가 자란 봉우리
  BLOOM: 3, // 활짝 핀 꽃 (완성)
} as const;

/** 각 단계로 성장하기 위해 필요한 누적 물 횟수 */
export const WATER_THRESHOLDS = {
  [FLOWER_STAGES.BUD]: 1, // 1→2: 물 1회
  [FLOWER_STAGES.BLOOM]: 3, // 2→3: 물 3회 (누적)
} as const;

/** 화면에 표시할 최대 꽃 수 */
export const GARDEN_MAX_VISIBLE = 80;

/**
 * 80개 사전 정의 슬롯 좌표 (% 기반).
 * 10열 × 8행 그리드에 자연스러운 지터를 적용해 유기적 배치를 연출한다.
 * 각 슬롯: { x: %, y: %, scale: 깊이감용 크기 비율 }
 */
export const GARDEN_SLOTS: { x: number; y: number; scale: number }[] =
  (() => {
    // 시드 기반 결정적 난수 (매번 같은 결과)
    function seededRandom(seed: number) {
      const x = Math.sin(seed * 9301 + 49297) * 49979;
      return x - Math.floor(x);
    }

    const cols = 10;
    const rows = 8;
    const slots: { x: number; y: number; scale: number }[] = [];

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const idx = row * cols + col;
        const jitterX = (seededRandom(idx * 2) - 0.5) * 5; // ±2.5%
        const jitterY = (seededRandom(idx * 2 + 1) - 0.5) * 4; // ±2%

        const x = col * 9.5 + 5.5 + jitterX; // 5.5~95.5 범위
        const y = row * 8.5 + 16 + jitterY; // 16~75.5 범위 (상단 여백 + 하단 울타리 위)

        // 위쪽(먼 곳)일수록 작게
        const scale = 0.7 + (row / (rows - 1)) * 0.3;

        slots.push({
          x: Math.round(x * 10) / 10,
          y: Math.round(y * 10) / 10,
          scale: Math.round(scale * 100) / 100,
        });
      }
    }
    return slots;
  })();
