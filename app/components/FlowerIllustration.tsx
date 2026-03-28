"use client";

/**
 * CSS/SVG로 그린 꽃 일러스트레이션
 *
 * 4가지 시각 단계 (waterCount 기반):
 *   0: 씨앗 — 흙에 묻힌 작은 씨앗
 *   1: 새싹 — 짧은 줄기 + 두 장의 떡잎
 *   2: 봉우리 — 중간 줄기 + 잎 + 닫힌 봉우리
 *   3: 만개 — 긴 줄기 + 잎 + 활짝 핀 꽃잎 + 금빛 중심
 *
 * size="lg": 상세 보기 (화분 포함, ~200px)
 * size="sm": 꽃밭 그리드용 (화분 없이, 셀 크기에 맞춤)
 */

interface Props {
  waterCount: number;
  size?: "lg" | "sm";
  animate?: boolean;
  /** sm 사이즈에서 애니메이션 딜레이 (초) */
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
      className={`${isLarge ? "w-52 h-64 mx-auto" : "w-full h-full"}`}
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
        viewBox={isLarge ? "0 0 100 130" : "22 18 56 72"}
        className="w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* === 화분 (lg only) === */}
        {isLarge && (
          <g>
            {/* 화분 그림자 */}
            <ellipse cx="50" cy="122" rx="28" ry="5" fill="#C9B39A" opacity="0.4" />
            {/* 화분 몸체 */}
            <path
              d="M28,108 L34,124 Q50,128 66,124 L72,108 Z"
              fill="#9D836F"
            />
            {/* 화분 테두리 */}
            <rect x="26" y="104" width="48" height="6" rx="3" fill="#A8917D" />
            {/* 흙 */}
            <ellipse cx="50" cy="107" rx="22" ry="5" fill="#B5A48F" />
            <ellipse cx="50" cy="106" rx="18" ry="3" fill="#C9B39A" opacity="0.5" />
          </g>
        )}

        {/* === 작은 흙 (sm only) === */}
        {!isLarge && (
          <ellipse cx="50" cy="86" rx="16" ry="4" fill="#C9B39A" opacity="0.6" />
        )}

        {/* === 씨앗 (stage 0) === */}
        {stage === 0 && (
          <g>
            <ellipse
              cx="50"
              cy={isLarge ? 103 : 82}
              rx="5"
              ry="3.5"
              fill="#8C7A69"
            />
            {/* 씨앗 하이라이트 */}
            <ellipse
              cx="48"
              cy={isLarge ? 102 : 81}
              rx="2"
              ry="1.5"
              fill="#A09080"
              opacity="0.5"
            />
          </g>
        )}

        {/* === 새싹 (stage 1) === */}
        {stage === 1 && (
          <g className={animate ? "flower-leaves" : ""}>
            {/* 줄기 */}
            <path
              d={isLarge
                ? "M50,105 Q49,95 50,85"
                : "M50,86 Q49,78 50,70"
              }
              stroke="#738164"
              strokeWidth="2.5"
              fill="none"
              strokeLinecap="round"
            />
            {/* 왼쪽 떡잎 */}
            <ellipse
              cx={isLarge ? 44 : 44}
              cy={isLarge ? 86 : 71}
              rx="7"
              ry="4"
              fill="#92A081"
              transform={`rotate(-25, ${44}, ${isLarge ? 86 : 71})`}
            />
            {/* 오른쪽 떡잎 */}
            <ellipse
              cx={56}
              cy={isLarge ? 86 : 71}
              rx="7"
              ry="4"
              fill="#879777"
              transform={`rotate(25, ${56}, ${isLarge ? 86 : 71})`}
            />
          </g>
        )}

        {/* === 봉우리 (stage 2) === */}
        {stage === 2 && (
          <g className={animate ? "flower-leaves" : ""}>
            {/* 줄기 */}
            <path
              d={isLarge
                ? "M50,105 Q48,85 50,62"
                : "M50,86 Q48,68 50,48"
              }
              stroke="#738164"
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
            />
            {/* 왼쪽 잎 */}
            <ellipse
              cx={isLarge ? 38 : 38}
              cy={isLarge ? 82 : 68}
              rx="11"
              ry="5"
              fill="#879777"
              transform={`rotate(-28, ${38}, ${isLarge ? 82 : 68})`}
            />
            {/* 오른쪽 잎 */}
            <ellipse
              cx={62}
              cy={isLarge ? 82 : 68}
              rx="11"
              ry="5"
              fill="#92A081"
              transform={`rotate(28, ${62}, ${isLarge ? 82 : 68})`}
            />
            {/* 봉우리 (외곽) */}
            <ellipse
              cx={50}
              cy={isLarge ? 56 : 42}
              rx="7"
              ry="11"
              fill="#B8AC9E"
            />
            {/* 봉우리 (내부 힌트) */}
            <ellipse
              cx={50}
              cy={isLarge ? 57 : 43}
              rx="5"
              ry="8"
              fill="#D7A3A7"
              opacity="0.5"
            />
            {/* 봉우리 끝 */}
            <ellipse
              cx={50}
              cy={isLarge ? 47 : 33}
              rx="3"
              ry="4"
              fill="#A8B99A"
              opacity="0.7"
            />
          </g>
        )}

        {/* === 만개 (stage 3) === */}
        {stage >= 3 && (
          <g className={animate ? "flower-leaves" : ""}>
            {/* 줄기 */}
            <path
              d={isLarge
                ? "M50,105 Q47,80 50,52"
                : "M50,86 Q47,65 50,40"
              }
              stroke="#738164"
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
            />
            {/* 왼쪽 잎 */}
            <ellipse
              cx={isLarge ? 36 : 36}
              cy={isLarge ? 80 : 66}
              rx="13"
              ry="5.5"
              fill="#879777"
              transform={`rotate(-28, ${36}, ${isLarge ? 80 : 66})`}
            />
            {/* 오른쪽 잎 */}
            <ellipse
              cx={64}
              cy={isLarge ? 80 : 66}
              rx="13"
              ry="5.5"
              fill="#92A081"
              transform={`rotate(28, ${64}, ${isLarge ? 80 : 66})`}
            />

            {/* 꽃잎 그룹 */}
            <g className={animate ? "flower-petals" : ""}>
              {/* 뒤쪽 꽃잎 */}
              <circle
                cx={isLarge ? 40 : 40}
                cy={isLarge ? 44 : 32}
                r={isLarge ? 9 : 8}
                fill="#E3BBC0"
              />
              <circle
                cx={isLarge ? 60 : 60}
                cy={isLarge ? 44 : 32}
                r={isLarge ? 9 : 8}
                fill="#C88990"
              />
              {/* 위쪽 꽃잎 */}
              <circle
                cx={50}
                cy={isLarge ? 34 : 22}
                r={isLarge ? 10 : 9}
                fill="#D7A3A7"
              />
              {/* 아래쪽 꽃잎 */}
              <circle
                cx={isLarge ? 43 : 43}
                cy={isLarge ? 52 : 40}
                r={isLarge ? 8 : 7}
                fill="#E3BBC0"
                opacity="0.9"
              />
              <circle
                cx={isLarge ? 57 : 57}
                cy={isLarge ? 52 : 40}
                r={isLarge ? 8 : 7}
                fill="#C88990"
                opacity="0.9"
              />
              {/* 중심 (금빛) */}
              <circle
                cx={50}
                cy={isLarge ? 44 : 32}
                r={isLarge ? 6 : 5}
                fill="#D8B65C"
              />
              {/* 중심 하이라이트 */}
              <circle
                cx={isLarge ? 48 : 48}
                cy={isLarge ? 42 : 30}
                r={isLarge ? 2.5 : 2}
                fill="#E8CC7A"
                opacity="0.6"
              />
            </g>
          </g>
        )}
      </svg>
    </div>
  );
}
