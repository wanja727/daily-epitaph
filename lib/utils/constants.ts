// ─── 공감 반응 타입 ─────────────────────────────────────────────────────────
export const REACTION_TYPES = {
  amen: { emoji: "🤍", label: "아멘" },
  pray: { emoji: "🙏", label: "기도해요" },
  cheer: { emoji: "🔥", label: "응원해요" },
  touch: { emoji: "💧", label: "마음이 닿았어요" },
  smile: { emoji: "😊", label: "미소가 났어요" },
  surprise: { emoji: "👀", label: "놀랐어요" },
} as const;

export type ReactionType = keyof typeof REACTION_TYPES;

export const PROJECT_START_DATE = "2026-04-06";
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
export const GARDEN_MAX_VISIBLE = 120;

type GardenSlot = {
  x: number;
  y: number;
  scale: number;
  zIndex: number;
  opacity: number;
  rotate: number;
};

/** 시드 기반 결정적 난수 */
function seededRandom(seed: number) {
  const x = Math.sin(seed * 9301 + 49297) * 49979;
  return x - Math.floor(x);
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * 중심에서 바깥으로 퍼지되, 좌우 균형을 보장하는 정렬.
 *
 * 1. 중심 거리순 정렬 (가까운 슬롯 먼저)
 * 2. 같은 거리 밴드 안에서 좌/우를 번갈아 선택
 * 3. 약간의 노이즈로 기계적 패턴 방지
 */
function buildCenterOutwardSlots(
  slots: GardenSlot[],
  layoutSeed = 1,
): GardenSlot[] {
  if (slots.length <= 1) return slots;

  const cx = 50; // 화면 중앙 X
  const cy = 55; // 화면 중앙 Y (상단 여백 고려)

  const center = { x: cx, y: cy };

  // 중심 거리 + 약간의 노이즈로 정렬
  const indexed = slots.map((slot, i) => ({
    i,
    dist:
      distance(slot, center) + (seededRandom(layoutSeed + i * 13) - 0.5) * 3,
    side: slot.x < cx ? "L" : ("R" as "L" | "R"),
  }));

  indexed.sort((a, b) => a.dist - b.dist);

  // 거리 밴드(8% 단위)별로 묶어서 좌우 교대 배치
  const bandSize = 8;
  const result: number[] = [];

  for (let start = 0; start < indexed.length; ) {
    const bandDist = indexed[start].dist;
    let end = start;
    while (end < indexed.length && indexed[end].dist - bandDist < bandSize) {
      end++;
    }

    const band = indexed.slice(start, end);
    const left = band.filter((s) => s.side === "L");
    const right = band.filter((s) => s.side === "R");

    // 좌우 교대로 인터리브
    let li = 0,
      ri = 0;
    let pickLeft = seededRandom(layoutSeed + start * 7) < 0.5;
    while (li < left.length || ri < right.length) {
      if (pickLeft && li < left.length) {
        result.push(left[li++].i);
      } else if (!pickLeft && ri < right.length) {
        result.push(right[ri++].i);
      } else if (li < left.length) {
        result.push(left[li++].i);
      } else {
        result.push(right[ri++].i);
      }
      pickLeft = !pickLeft;
    }

    start = end;
  }

  return result.map((idx) => slots[idx]);
}

/**
 * 120개 사전 정의 슬롯 좌표 (% 기반).
 * 10열 × 12행 그리드에 자연스러운 지터를 적용해 유기적 배치를 연출한다.
 * 최종 반환 순서는 "중심에서 바깥으로 퍼지며, 빈 공간을 채우는 순서"로 재정렬된다.
 */
export const GARDEN_SLOTS: GardenSlot[] = (() => {
  const cols = 10;
  const rows = 12;
  const rawSlots: GardenSlot[] = [];

  const minY = 11;
  const maxY = 100; // 울타리 바로 위까지 차도록 하단 범위 확장

  for (let row = 0; row < rows; row++) {
    // 홀수 행은 반 칸 오프셋 → 벌집 배치로 간격 극대화
    const offsetX = row % 2 === 1 ? 5 : 0;

    for (let col = 0; col < cols; col++) {
      const idx = row * cols + col;

      const depth = row / (rows - 1);
      const easedDepth = Math.pow(depth, 1.35);

      const jitterX = (seededRandom(idx * 2) - 0.5) * (2.5 + depth * 1.5);
      const jitterY = (seededRandom(idx * 2 + 1) - 0.5) * (1.8 + depth * 0.8);

      const x = col * 10 + 5 + offsetX + jitterX;

      // 위에서 아래까지 고르게 쓰되, 하단은 울타리 바로 위까지 자연스럽게 확장
      const y = minY + depth * (maxY - minY) + jitterY;

      // 위쪽은 더 작고 아래쪽은 더 크게
      const scale = 0.68 + easedDepth * 0.78;

      // 아주 살짝 기울기
      const rotate = (seededRandom(idx * 7 + row * 13) - 0.5) * 8;

      rawSlots.push({
        x: Math.round(Math.max(2, Math.min(98, x)) * 10) / 10,
        y: Math.round(y * 10) / 10,
        scale: Math.round(scale * 100) / 100,
        zIndex: 10 + row,
        opacity: Math.round((0.62 + easedDepth * 0.38) * 100) / 100,
        rotate: Math.round(rotate * 10) / 10,
      });
    }
  }

  return buildCenterOutwardSlots(rawSlots, 1);
})();
