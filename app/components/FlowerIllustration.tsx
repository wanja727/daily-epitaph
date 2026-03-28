"use client";

/**
 * SVG로 그린 꽃 일러스트레이션
 *
 * 4가지 시각 단계 (waterCount 기반):
 *   0: 씨앗 — 흙에 묻힌 작은 씨앗
 *   1: 새싹 — 짧은 줄기 + 두 장의 떡잎
 *   2: 봉우리 — 중간 줄기 + 잎 + 뾰족한 봉우리
 *   3: 만개 — 긴 줄기 + 잎 + 화사한 꽃잎 + 금빛 중심
 *
 * size="lg": 상세 보기 (맨땅)
 * size="sm": 꽃밭 그리드용
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
        {/* ═══ 맨땅 (lg) ═══ */}
        {isLarge && (
          <g>
            {/* 흙 그림자 */}
            <ellipse cx="50" cy="118" rx="32" ry="6" fill="#C9B39A" opacity="0.3" />
            {/* 풀잔디 */}
            <ellipse cx="50" cy="115" rx="28" ry="4" fill="#8FB070" opacity="0.35" />
            {/* 흙 */}
            <ellipse cx="50" cy="116" rx="22" ry="3" fill="#B5A48F" opacity="0.5" />
            {/* 잔디 블레이드 */}
            <path d="M25,116 Q27,108 29,116" stroke="#6DB04A" strokeWidth="1.2" fill="none" opacity="0.4" />
            <path d="M68,115 Q70,107 72,115" stroke="#7EBF5C" strokeWidth="1" fill="none" opacity="0.35" />
            <path d="M35,117 Q36,111 37,117" stroke="#5EA33B" strokeWidth="0.8" fill="none" opacity="0.3" />
            <path d="M62,117 Q63,110 64,117" stroke="#6DB04A" strokeWidth="0.8" fill="none" opacity="0.3" />
          </g>
        )}

        {/* ═══ 작은 흙 (sm) ═══ */}
        {!isLarge && (
          <g>
            <ellipse cx="50" cy="88" rx="18" ry="4" fill="#8FB070" opacity="0.35" />
            <ellipse cx="50" cy="89" rx="14" ry="2.5" fill="#B5A48F" opacity="0.4" />
          </g>
        )}

        {/* ═══ 씨앗 (stage 0) ═══ */}
        {stage === 0 && (
          <g>
            <ellipse cx="50" cy={isLarge ? 112 : 84} rx="5" ry="3.5" fill="#8C7A69" />
            <ellipse cx="48" cy={isLarge ? 111 : 83} rx="2" ry="1.5" fill="#A09080" opacity="0.5" />
          </g>
        )}

        {/* ═══ 새싹 (stage 1) ═══ */}
        {stage === 1 && (
          <g className={animate ? "flower-leaves" : ""}>
            <path
              d={isLarge ? "M50,114 Q49,100 50,86" : "M50,88 Q49,78 50,66"}
              stroke="#5C8A3E"
              strokeWidth="2.5"
              fill="none"
              strokeLinecap="round"
            />
            {/* 왼쪽 떡잎 */}
            <ellipse
              cx={43} cy={isLarge ? 88 : 68}
              rx="8" ry="4.5"
              fill="#6DB04A"
              transform={`rotate(-25, 43, ${isLarge ? 88 : 68})`}
            />
            {/* 오른쪽 떡잎 */}
            <ellipse
              cx={57} cy={isLarge ? 88 : 68}
              rx="8" ry="4.5"
              fill="#7EBF5C"
              transform={`rotate(25, 57, ${isLarge ? 88 : 68})`}
            />
            {/* 잎맥 */}
            <path
              d={isLarge ? "M43,88 L38,86" : "M43,68 L38,66"}
              stroke="#4A8030"
              strokeWidth="0.5"
              opacity="0.4"
              fill="none"
            />
            <path
              d={isLarge ? "M57,88 L62,86" : "M57,68 L62,66"}
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
            {/* 줄기 */}
            <path
              d={isLarge ? "M50,114 Q47,90 50,58" : "M50,88 Q47,68 50,42"}
              stroke="#4D8B2F"
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
            />
            {/* 왼쪽 잎 */}
            <ellipse
              cx={36} cy={isLarge ? 88 : 66}
              rx="13" ry="5.5"
              fill="#5EA33B"
              transform={`rotate(-28, 36, ${isLarge ? 88 : 66})`}
            />
            <path
              d={isLarge ? "M36,88 L28,85" : "M36,66 L28,63"}
              stroke="#3E7A25"
              strokeWidth="0.7"
              opacity="0.3"
              fill="none"
            />
            {/* 오른쪽 잎 */}
            <ellipse
              cx={64} cy={isLarge ? 88 : 66}
              rx="13" ry="5.5"
              fill="#6DB04A"
              transform={`rotate(28, 64, ${isLarge ? 88 : 66})`}
            />
            <path
              d={isLarge ? "M64,88 L72,85" : "M64,66 L72,63"}
              stroke="#3E7A25"
              strokeWidth="0.7"
              opacity="0.3"
              fill="none"
            />
            {/* 봉우리 — 뾰족한 형태 */}
            <path
              d={isLarge
                ? "M42,62 Q44,48 50,38 Q56,48 58,62 Q50,66 42,62Z"
                : "M42,46 Q44,32 50,22 Q56,32 58,46 Q50,50 42,46Z"
              }
              fill="#6DB04A"
            />
            {/* 봉우리 내부 핑크 힌트 */}
            <path
              d={isLarge
                ? "M45,60 Q47,50 50,43 Q53,50 55,60 Q50,62 45,60Z"
                : "M45,44 Q47,34 50,27 Q53,34 55,44 Q50,46 45,44Z"
              }
              fill="#D7A3A7"
              opacity="0.5"
            />
            {/* 봉우리 꼭대기 — 뾰족한 잎 */}
            <path
              d={isLarge
                ? "M48,42 Q50,34 52,42 Q50,43 48,42Z"
                : "M48,26 Q50,18 52,26 Q50,27 48,26Z"
              }
              fill="#4D8B2F"
              opacity="0.9"
            />
          </g>
        )}

        {/* ═══ 만개 (stage 3) ═══ */}
        {stage >= 3 && (
          <g className={animate ? "flower-leaves" : ""}>
            {/* 줄기 */}
            <path
              d={isLarge ? "M50,114 Q46,82 50,48" : "M50,88 Q46,62 50,35"}
              stroke="#4D8B2F"
              strokeWidth="3.5"
              fill="none"
              strokeLinecap="round"
            />
            {/* 줄기 하이라이트 */}
            <path
              d={isLarge ? "M51,110 Q47,82 51,50" : "M51,84 Q47,62 51,37"}
              stroke="#6DB04A"
              strokeWidth="1"
              fill="none"
              strokeLinecap="round"
              opacity="0.4"
            />

            {/* 왼쪽 잎 */}
            <ellipse
              cx={34} cy={isLarge ? 84 : 64}
              rx="14" ry="6"
              fill="#5EA33B"
              transform={`rotate(-28, 34, ${isLarge ? 84 : 64})`}
            />
            <ellipse
              cx={34} cy={isLarge ? 84 : 64}
              rx="10" ry="3"
              fill="#6DB04A"
              opacity="0.4"
              transform={`rotate(-28, 34, ${isLarge ? 84 : 64})`}
            />
            {/* 오른쪽 잎 */}
            <ellipse
              cx={66} cy={isLarge ? 84 : 64}
              rx="14" ry="6"
              fill="#6DB04A"
              transform={`rotate(28, 66, ${isLarge ? 84 : 64})`}
            />
            <ellipse
              cx={66} cy={isLarge ? 84 : 64}
              rx="10" ry="3"
              fill="#7EBF5C"
              opacity="0.4"
              transform={`rotate(28, 66, ${isLarge ? 84 : 64})`}
            />

            {/* 꽃잎 그룹 */}
            <g className={animate ? "flower-petals" : ""}>
              {/* 뒤쪽 큰 꽃잎 */}
              <ellipse
                cx={37} cy={isLarge ? 42 : 29}
                rx={isLarge ? 12 : 11} ry={isLarge ? 10 : 9}
                fill="#F9A8B0"
                transform={`rotate(-15, 37, ${isLarge ? 42 : 29})`}
              />
              <ellipse
                cx={63} cy={isLarge ? 42 : 29}
                rx={isLarge ? 12 : 11} ry={isLarge ? 10 : 9}
                fill="#F48C96"
                transform={`rotate(15, 63, ${isLarge ? 42 : 29})`}
              />

              {/* 위쪽 꽃잎 */}
              <ellipse
                cx={50} cy={isLarge ? 28 : 15}
                rx={isLarge ? 11 : 10} ry={isLarge ? 13 : 12}
                fill="#F06878"
              />
              {/* 위쪽 꽃잎 하이라이트 */}
              <ellipse
                cx={48} cy={isLarge ? 25 : 12}
                rx={isLarge ? 5 : 4} ry={isLarge ? 7 : 6}
                fill="#F9B0B8"
                opacity="0.55"
              />

              {/* 옆쪽 꽃잎 */}
              <ellipse
                cx={isLarge ? 36 : 36} cy={isLarge ? 47 : 34}
                rx={isLarge ? 11 : 10} ry={isLarge ? 9 : 8}
                fill="#F7808C"
                transform={`rotate(-22, 36, ${isLarge ? 47 : 34})`}
              />
              <ellipse
                cx={isLarge ? 64 : 64} cy={isLarge ? 47 : 34}
                rx={isLarge ? 11 : 10} ry={isLarge ? 9 : 8}
                fill="#E8606E"
                transform={`rotate(22, 64, ${isLarge ? 47 : 34})`}
              />

              {/* 아래쪽 꽃잎 */}
              <ellipse
                cx={isLarge ? 42 : 42} cy={isLarge ? 55 : 42}
                rx={isLarge ? 10 : 9} ry={isLarge ? 8 : 7}
                fill="#FBABB4"
                opacity="0.9"
              />
              <ellipse
                cx={isLarge ? 58 : 58} cy={isLarge ? 55 : 42}
                rx={isLarge ? 10 : 9} ry={isLarge ? 8 : 7}
                fill="#F28D98"
                opacity="0.9"
              />

              {/* 중심 — 금빛 */}
              <circle
                cx={50} cy={isLarge ? 42 : 29}
                r={isLarge ? 9 : 8}
                fill="#E8B840"
              />
              <circle
                cx={50} cy={isLarge ? 42 : 29}
                r={isLarge ? 6 : 5}
                fill="#F5D060"
              />
              {/* 중심 하이라이트 */}
              <circle
                cx={isLarge ? 48 : 48} cy={isLarge ? 40 : 27}
                r={isLarge ? 2.5 : 2}
                fill="#FCE88A"
                opacity="0.7"
              />
              {/* 수술 점 */}
              <circle cx={isLarge ? 46 : 46} cy={isLarge ? 45 : 32} r="1.2" fill="#D4A030" opacity="0.6" />
              <circle cx={isLarge ? 54 : 54} cy={isLarge ? 45 : 32} r="1.2" fill="#D4A030" opacity="0.6" />
              <circle cx={isLarge ? 50 : 50} cy={isLarge ? 47 : 34} r="1" fill="#D4A030" opacity="0.5" />
              <circle cx={isLarge ? 47 : 47} cy={isLarge ? 38 : 25} r="0.8" fill="#D4A030" opacity="0.4" />
              <circle cx={isLarge ? 53 : 53} cy={isLarge ? 38 : 25} r="0.8" fill="#D4A030" opacity="0.4" />
            </g>
          </g>
        )}
      </svg>
    </div>
  );
}
