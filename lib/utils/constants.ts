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

export type GardenSlot = {
  x: number; // % 기반 좌표
  y: number;
  scale: number; // 꽃 크기 배율
};

// ─── 유틸 ────────────────────────────────────────────────────────────────────

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function seededRandom(seed: number) {
  const x = Math.sin(seed * 9301 + 49297) * 49979;
  return x - Math.floor(x);
}

function jitter(seed: number, amount: number) {
  return (seededRandom(seed) - 0.5) * amount;
}

// ─── 중심→바깥 정렬 ─────────────────────────────────────────────────────────

/** 슬롯을 중심에서 바깥으로, 좌우 교대로 채워나가는 순서로 정렬 */
function sortCenterOutward(slots: GardenSlot[]): GardenSlot[] {
  const cx = 50;
  const cy = 56;
  const ringSize = 6.8;

  const indexed = slots.map((slot, i) => {
    const dx = slot.x - cx;
    const dy = slot.y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    return {
      i,
      ring: Math.floor(dist / ringSize),
      dist,
      side: slot.x < cx ? "L" : ("R" as "L" | "R"),
      yBias: Math.abs(dy),
    };
  });

  indexed.sort(
    (a, b) => a.ring - b.ring || a.yBias - b.yBias || a.dist - b.dist,
  );

  const result: number[] = [];

  for (let start = 0; start < indexed.length; ) {
    const ring = indexed[start].ring;
    let end = start;
    while (end < indexed.length && indexed[end].ring === ring) end++;

    const band = indexed.slice(start, end);
    const left = band.filter((s) => s.side === "L");
    const right = band.filter((s) => s.side === "R");

    let li = 0;
    let ri = 0;
    let pickLeft = seededRandom(ring * 17) < 0.5;

    while (li < left.length || ri < right.length) {
      const pick =
        pickLeft && li < left.length
          ? left[li++]
          : ri < right.length
            ? right[ri++]
            : left[li++];
      result.push(pick.i);
      pickLeft = !pickLeft;
    }

    start = end;
  }

  return result.map((idx) => slots[idx]);
}

// ─── 슬롯 생성 ──────────────────────────────────────────────────────────────

/**
 * 10×12 벌집 배치, 120개 슬롯 생성.
 * 상단은 작게, 하단은 크게 (원근감).
 */
function buildGardenSlots(): GardenSlot[] {
  const cols = 10;
  const rows = 12;
  const left = 9;
  const right = 91;
  const top = 14;
  const bottom = 92;
  const xStep = (right - left) / (cols - 0.5);
  const yRange = bottom - top;

  const slots: GardenSlot[] = [];

  for (let row = 0; row < rows; row++) {
    const depth = row / (rows - 1); // 0 → 1

    // 선형 20% + 곡선 80% 블렌드 → 상단이 너무 압축되지 않으면서
    // 하단으로 갈수록 행간이 단조 증가
    const perspective = 0.2 * depth + 0.8 * Math.pow(depth, 1.5);

    const offsetX = row % 2 === 1 ? xStep / 2 : 0;

    for (let col = 0; col < cols; col++) {
      const idx = row * cols + col;

      const x = clamp(
        left + col * xStep + offsetX + jitter(idx * 17, 0.6 + perspective * 0.15),
        4,
        96,
      );

      const y = clamp(
        top + perspective * yRange + jitter(idx * 19, 0.45 + perspective * 0.12),
        11,
        95,
      );

      // 상단 0.76 → 하단 1.3, 단일 곡선으로 자연스러운 전환
      const scale = clamp(
        0.76 + Math.pow(depth, 1.8) * 0.54 + jitter(idx * 23, 0.03),
        0.76,
        1.3,
      );

      slots.push({
        x: Math.round(x * 10) / 10,
        y: Math.round(y * 10) / 10,
        scale: Math.round(scale * 100) / 100,
      });
    }
  }

  return sortCenterOutward(slots);
}

export const GARDEN_SLOTS = buildGardenSlots();
