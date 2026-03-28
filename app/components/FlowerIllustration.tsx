"use client";

/**
 * SVG로 그린 꽃 일러스트레이션
 *
 * 4가지 시각 단계 (waterCount 기반):
 *   0: 씨앗 — 흙에 묻힌 작은 씨앗
 *   1: 새싹 — 짧은 줄기 + 두 장의 떡잎
 *   2: 봉우리 — 중간 줄기 + 잎 + 닫힌 봉우리
 *   3: 만개 — 긴 줄기 + 잎 + 활짝 핀 꽃잎 + 금빛 중심
 *
 * size="lg": 상세 보기 (화분 포함)
 * size="sm": 꽃밭 그리드용 (화분 없이)
 */

interface Props {
  waterCount: number;
  size?: "lg" | "sm";
  animate?: boolean;
  delay?: number;
}

export default function FlowerIllustration({
  waterCount,
  size = "lg",
  animate = true,
  delay = 0,
}: Props) {
  const stage = Math.min(Math.max(waterCount, 0), 3);
  const isLarge = size === "lg";

  return (
    <div
      className={isLarge ? "w-52 h-64 mx-auto" : "w-full h-full"}
      style={
        animate && stage > 0
          ? {
              animation: "flower-sway 5s ease-in-out infinite",
              transformOrigin: "center bottom",
              animationDelay: `${delay}s`,
            }
          : undefined
      }
    >
      <svg
        viewBox={isLarge ? "0 0 100 130" : "15 10 70 82"}
        className="w-full h-full overflow-visible"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* ═══ 화분 (lg only) ═══ */}
        {isLarge && (
          <g>
            <ellipse cx="50" cy="122" rx="28" ry="5" fill="#C9B39A" opacity="0.4" />
            <path d="M28,108 L34,124 Q50,128 66,124 L72,108 Z" fill="#9D836F" />
            <rect x="26" y="104" width="48" height="6" rx="3" fill="#A8917D" />
            <ellipse cx="50" cy="107" rx="22" ry="5" fill="#B5A48F" />
            <ellipse cx="50" cy="106" rx="18" ry="3" fill="#C9B39A" opacity="0.5" />
          </g>
        )}

        {/* ═══ 작은 흙 (sm only) ═══ */}
        {!isLarge && (
          <ellipse cx="50" cy="88" rx="18" ry="4" fill="#C9B39A" opacity="0.5" />
        )}

        {/* ═══ 씨앗 (stage 0) ═══ */}
        {stage === 0 && (
          <g>
            <ellipse cx="50" cy={isLarge ? 103 : 84} rx="5" ry="3.5" fill="#8C7A69" />
            <ellipse cx="48" cy={isLarge ? 102 : 83} rx="2" ry="1.5" fill="#A09080" opacity="0.5" />
          </g>
        )}

        {/* ═══ 새싹 (stage 1) ═══ */}
        {stage === 1 && (
          <g className={animate ? "flower-leaves" : ""}>
            <path
              d={isLarge ? "M50,105 Q49,95 50,82" : "M50,88 Q49,78 50,66"}
              stroke="#5C8A3E"
              strokeWidth="2.5"
              fill="none"
              strokeLinecap="round"
            />
            {/* 왼쪽 떡잎 */}
            <ellipse
              cx={43} cy={isLarge ? 84 : 68}
              rx="8" ry="4.5"
              fill="#6DB04A"
              transform={`rotate(-25, 43, ${isLarge ? 84 : 68})`}
            />
            {/* 오른쪽 떡잎 */}
            <ellipse
              cx={57} cy={isLarge ? 84 : 68}
              rx="8" ry="4.5"
              fill="#7EBF5C"
              transform={`rotate(25, 57, ${isLarge ? 84 : 68})`}
            />
            {/* 잎맥 힌트 */}
            <path
              d={isLarge ? "M43,84 L38,82" : "M43,68 L38,66"}
              stroke="#4A8030"
              strokeWidth="0.5"
              opacity="0.4"
              fill="none"
            />
            <path
              d={isLarge ? "M57,84 L62,82" : "M57,68 L62,66"}
              stroke="#4A8030"
              strokeWidth="0.5"
              opacity="0.4"
              fill="none"
            />
          </g>
        )}

        {/* ═══ 봉우리 (stage 2) ═══ */}
        {stage === 2 && (
          <g className={animate ? "flower-leaves" : ""}>
            {/* 줄기 — 싱그러운 초록 */}
            <path
              d={isLarge ? "M50,105 Q47,85 50,58" : "M50,88 Q47,68 50,42"}
              stroke="#4D8B2F"
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
            />
            {/* 왼쪽 잎 */}
            <ellipse
              cx={36} cy={isLarge ? 82 : 66}
              rx="13" ry="5.5"
              fill="#5EA33B"
              transform={`rotate(-28, 36, ${isLarge ? 82 : 66})`}
            />
            <path
              d={isLarge ? "M36,82 L28,79" : "M36,66 L28,63"}
              stroke="#3E7A25"
              strokeWidth="0.7"
              opacity="0.3"
              fill="none"
            />
            {/* 오른쪽 잎 */}
            <ellipse
              cx={64} cy={isLarge ? 82 : 66}
              rx="13" ry="5.5"
              fill="#6DB04A"
              transform={`rotate(28, 64, ${isLarge ? 82 : 66})`}
            />
            <path
              d={isLarge ? "M64,82 L72,79" : "M64,66 L72,63"}
              stroke="#3E7A25"
              strokeWidth="0.7"
              opacity="0.3"
              fill="none"
            />
            {/* 봉우리 — 초록빛 외곽 + 핑크 힌트 */}
            <ellipse cx={50} cy={isLarge ? 52 : 36} rx="8" ry="13" fill="#6DB04A" />
            <ellipse cx={50} cy={isLarge ? 54 : 38} rx="5.5" ry="9" fill="#D7A3A7" opacity="0.45" />
            {/* 봉우리 꼭대기 잎 */}
            <ellipse cx={50} cy={isLarge ? 42 : 26} rx="4" ry="5" fill="#5EA33B" opacity="0.8" />
          </g>
        )}

        {/* ═══ 만개 (stage 3) ═══ */}
        {stage >= 3 && (
          <g className={animate ? "flower-leaves" : ""}>
            {/* 줄기 */}
            <path
              d={isLarge ? "M50,105 Q46,78 50,48" : "M50,88 Q46,62 50,35"}
              stroke="#4D8B2F"
              strokeWidth="3.5"
              fill="none"
              strokeLinecap="round"
            />
            {/* 줄기 하이라이트 */}
            <path
              d={isLarge ? "M51,100 Q47,78 51,50" : "M51,84 Q47,62 51,37"}
              stroke="#6DB04A"
              strokeWidth="1"
              fill="none"
              strokeLinecap="round"
              opacity="0.4"
            />

            {/* 왼쪽 잎 */}
            <ellipse
              cx={34} cy={isLarge ? 78 : 64}
              rx="14" ry="6"
              fill="#5EA33B"
              transform={`rotate(-28, 34, ${isLarge ? 78 : 64})`}
            />
            <ellipse
              cx={34} cy={isLarge ? 78 : 64}
              rx="10" ry="3"
              fill="#6DB04A"
              opacity="0.4"
              transform={`rotate(-28, 34, ${isLarge ? 78 : 64})`}
            />
            {/* 오른쪽 잎 */}
            <ellipse
              cx={66} cy={isLarge ? 78 : 64}
              rx="14" ry="6"
              fill="#6DB04A"
              transform={`rotate(28, 66, ${isLarge ? 78 : 64})`}
            />
            <ellipse
              cx={66} cy={isLarge ? 78 : 64}
              rx="10" ry="3"
              fill="#7EBF5C"
              opacity="0.4"
              transform={`rotate(28, 66, ${isLarge ? 78 : 64})`}
            />

            {/* 꽃잎 그룹 */}
            <g className={animate ? "flower-petals" : ""}>
              {/* 뒤쪽 외곽 꽃잎 (더 큰) */}
              <ellipse
                cx={isLarge ? 37 : 37} cy={isLarge ? 42 : 29}
                rx={isLarge ? 11 : 10} ry={isLarge ? 9 : 8}
                fill="#F2D4D6"
                transform={`rotate(-15, ${37}, ${isLarge ? 42 : 29})`}
              />
              <ellipse
                cx={isLarge ? 63 : 63} cy={isLarge ? 42 : 29}
                rx={isLarge ? 11 : 10} ry={isLarge ? 9 : 8}
                fill="#E8B5B9"
                transform={`rotate(15, ${63}, ${isLarge ? 42 : 29})`}
              />

              {/* 위쪽 꽃잎 */}
              <ellipse
                cx={50} cy={isLarge ? 30 : 17}
                rx={isLarge ? 10 : 9} ry={isLarge ? 12 : 11}
                fill="#E8A0A5"
              />
              {/* 위쪽 꽃잎 하이라이트 */}
              <ellipse
                cx={48} cy={isLarge ? 27 : 14}
                rx={isLarge ? 5 : 4} ry={isLarge ? 6 : 5}
                fill="#F2C4C8"
                opacity="0.5"
              />

              {/* 옆쪽 꽃잎 */}
              <ellipse
                cx={isLarge ? 38 : 38} cy={isLarge ? 46 : 33}
                rx={isLarge ? 10 : 9} ry={isLarge ? 8 : 7}
                fill="#E3BBC0"
                transform={`rotate(-20, ${38}, ${isLarge ? 46 : 33})`}
              />
              <ellipse
                cx={isLarge ? 62 : 62} cy={isLarge ? 46 : 33}
                rx={isLarge ? 10 : 9} ry={isLarge ? 8 : 7}
                fill="#D4949A"
                transform={`rotate(20, ${62}, ${isLarge ? 46 : 33})`}
              />

              {/* 아래쪽 꽃잎 */}
              <ellipse
                cx={isLarge ? 43 : 43} cy={isLarge ? 54 : 41}
                rx={isLarge ? 9 : 8} ry={isLarge ? 7 : 6}
                fill="#EFC8CC"
                opacity="0.85"
              />
              <ellipse
                cx={isLarge ? 57 : 57} cy={isLarge ? 54 : 41}
                rx={isLarge ? 9 : 8} ry={isLarge ? 7 : 6}
                fill="#D9A0A6"
                opacity="0.85"
              />

              {/* 중심 — 금빛 그라데이션 */}
              <circle
                cx={50} cy={isLarge ? 42 : 29}
                r={isLarge ? 8 : 7}
                fill="#D8B65C"
              />
              <circle
                cx={50} cy={isLarge ? 42 : 29}
                r={isLarge ? 5.5 : 4.5}
                fill="#E8CC7A"
              />
              {/* 중심 하이라이트 */}
              <circle
                cx={isLarge ? 48 : 48} cy={isLarge ? 40 : 27}
                r={isLarge ? 2.5 : 2}
                fill="#F0DDA0"
                opacity="0.7"
              />
              {/* 수술 점 */}
              <circle cx={isLarge ? 47 : 47} cy={isLarge ? 44 : 31} r="1" fill="#C4A040" opacity="0.5" />
              <circle cx={isLarge ? 53 : 53} cy={isLarge ? 44 : 31} r="1" fill="#C4A040" opacity="0.5" />
              <circle cx={isLarge ? 50 : 50} cy={isLarge ? 46 : 33} r="0.8" fill="#C4A040" opacity="0.4" />
            </g>
          </g>
        )}
      </svg>
    </div>
  );
}
