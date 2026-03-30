"use client";

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

  const wrapperClass = isLarge ? "w-52 h-64 mx-auto" : "w-full h-full";

  const swayStyle =
    animate && stage > 0
      ? {
          animation: "flower-sway 5s ease-in-out infinite",
          transformOrigin: "center bottom",
          animationDelay: `${delay}s`,
        }
      : undefined;

  return (
    <div className={wrapperClass} style={swayStyle}>
      <svg
        viewBox="0 0 100 130"
        className="w-full h-full overflow-visible"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="1.2" result="blur" />
            <feOffset dx="1.2" dy="1.6" result="offset" />
            <feFlood floodColor="#cfc9bf" floodOpacity="0.45" result="color" />
            <feComposite
              in="color"
              in2="offset"
              operator="in"
              result="shadow"
            />
            <feMerge>
              <feMergeNode in="shadow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="petalShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="0.8" result="blur" />
            <feOffset dx="0.8" dy="1.1" result="offset" />
            <feFlood floodColor="#d79077" floodOpacity="0.18" result="color" />
            <feComposite
              in="color"
              in2="offset"
              operator="in"
              result="shadow"
            />
            <feMerge>
              <feMergeNode in="shadow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* 배경은 원본 만개 SVG처럼 연한 베이지 톤 */}
        {/* {stage >= 3 && isLarge && (
          <rect x="0" y="0" width="100" height="130" fill="#F5E9D7" />
        )} */}

        {/* 하단 바닥 */}
        {/* {isLarge && (
          <>
            <ellipse
              cx="50"
              cy="126.5"
              rx="18"
              ry="2.6"
              fill="#E9D8C5"
              opacity="0.75"
            />
            <path
              d="M0 130 L0 120 Q20 127 50 122 Q78 118 100 125 L100 130 Z"
              fill="#F0E2D2"
              opacity="0.9"
            />
          </>
        )} */}

        {/* stage 0 - 씨앗 */}
        {stage === 0 && (
          <g filter="url(#softShadow)">
            <ellipse cx="50" cy="117" rx="4.4" ry="2.9" fill="#9B8B76" />
            <ellipse
              cx="48.6"
              cy="116.2"
              rx="1.3"
              ry="0.8"
              fill="#B7A694"
              opacity="0.65"
            />
            <path
              d="M41 121 Q50 118 59 121"
              stroke="#E6D8C6"
              strokeWidth="1"
              fill="none"
              opacity="0.45"
            />
          </g>
        )}

        {/* stage 1 - 새싹 */}
        {stage === 1 && (
          <g
            className={animate ? "sprout-plant" : ""}
            filter="url(#softShadow)"
          >
            {/* 줄기 - 더 짧게 */}
            <path
              d="M50 118 C50 111, 50 103, 50 94 C50 88, 50.1 83, 49.9 79"
              stroke="#A7AC9C"
              strokeWidth="4"
              strokeLinecap="round"
              fill="none"
            />

            {/* 왼쪽 잎 */}
            <g className={animate ? "sprout-leaf-left" : ""}>
              <path
                d="M48.8 77
           C45.6 72, 39.4 68.5, 33 69
           C31.2 73.8, 33.6 79.3, 39.3 83.5
           C43.2 86.3, 46.2 87.3, 48.9 87.8
           C49.1 84.5, 49 80.6, 48.8 77 Z"
                fill="#B2B5A7"
              />
              <path
                d="M48.8 86.4 C46.2 82.4, 43 79.5, 38.5 76.2"
                stroke="#969B8C"
                strokeWidth="1"
                strokeLinecap="round"
                fill="none"
                opacity="0.95"
              />
              <path
                d="M48.8 77 C45.6 72, 39.4 68.5, 33 69"
                stroke="#C4C7BC"
                strokeWidth="0.68"
                fill="none"
                opacity="0.35"
              />
            </g>

            {/* 오른쪽 잎 */}
            <g className={animate ? "sprout-leaf-right" : ""}>
              <path
                d="M51.2 77
           C54.4 72, 60.6 68.5, 67 69
           C68.8 73.8, 66.4 79.3, 60.7 83.5
           C56.8 86.3, 53.8 87.3, 51.1 87.8
           C50.9 84.5, 51 80.6, 51.2 77 Z"
                fill="#B2B5A7"
              />
              <path
                d="M51.2 86.4 C53.8 82.4, 57 79.5, 61.5 76.2"
                stroke="#969B8C"
                strokeWidth="1"
                strokeLinecap="round"
                fill="none"
                opacity="0.95"
              />
              <path
                d="M51.2 77 C54.4 72, 60.6 68.5, 67 69"
                stroke="#C4C7BC"
                strokeWidth="0.68"
                fill="none"
                opacity="0.35"
              />
            </g>
          </g>
        )}

        {/* stage 2 - 봉우리 */}
        {stage === 2 && (
          <g className={animate ? "bud-plant" : ""}>
            {/* 줄기 */}
            <g filter="url(#softShadow)">
              <path
                d="M50 118 C50 104, 50 92, 50 78 C50 68, 49.8 57, 50 49"
                stroke="#A4A998"
                strokeWidth="4"
                strokeLinecap="round"
                fill="none"
              />

              {/* 왼쪽 잎 */}
              <g className={animate ? "bud-leaf-left" : ""}>
                <path
                  d="M49 80
             C44.5 73, 35 67.5, 25.5 69
             C24 76, 29 83.5, 38 88
             C42.8 90.6, 46.5 91.6, 49.5 92
             C49.7 87.4, 49.5 83.5, 49 80 Z"
                  fill="#ADB1A2"
                />
                <path
                  d="M48.9 90.6 C45.2 85.2, 40.8 81.2, 35.2 77"
                  stroke="#94998A"
                  strokeWidth="1.1"
                  strokeLinecap="round"
                  fill="none"
                />
              </g>

              {/* 오른쪽 잎 */}
              <g className={animate ? "bud-leaf-right" : ""}>
                <path
                  d="M51 80
             C55.5 73, 65 67.5, 74.5 69
             C76 76, 71 83.5, 62 88
             C57.2 90.6, 53.5 91.6, 50.5 92
             C50.3 87.4, 50.5 83.5, 51 80 Z"
                  fill="#ADB1A2"
                />
                <path
                  d="M51.1 90.6 C54.8 85.2, 59.2 81.2, 64.8 77"
                  stroke="#94998A"
                  strokeWidth="1.1"
                  strokeLinecap="round"
                  fill="none"
                />
              </g>
            </g>

            {/* 봉우리 - 튤립 스타일 */}
            <g className={animate ? "bud-top" : ""} filter="url(#petalShadow)">
              {/* 윗부분 안쪽 틈 */}
              <path
                d="M50 20
           C47.8 20, 46.2 21.6, 45.2 23.8
           C46.2 27.4, 48 30, 50 31.4
           C52 30, 53.8 27.4, 54.8 23.8
           C53.8 21.6, 52.2 20, 50 20 Z"
                fill="#F5F1E8"
                opacity="0.95"
              />

              {/* 왼쪽 바깥 꽃잎 */}
              <path
                d="M44.8 55
           C37 49.2, 31.8 38.5, 32.5 25.5
           C33 17.5, 37.2 11.2, 42.8 8.5
           C44.7 9, 45.7 12.5, 46 17.5
           C46.5 28, 46 42, 44.8 55 Z"
                fill="#EE8F75"
              />

              {/* 오른쪽 바깥 꽃잎 */}
              <path
                d="M55.2 55
           C63 49.2, 68.2 38.5, 67.5 25.5
           C67 17.5, 62.8 11.2, 57.2 8.5
           C55.3 9, 54.3 12.5, 54 17.5
           C53.5 28, 54 42, 55.2 55 Z"
                fill="#EB886E"
              />

              {/* 가운데 꽃잎 */}
              <path
                d="M50 56
           C43.5 51, 39 41.8, 39 30.2
           C39 20.8, 42.8 13.2, 50 9.5
           C57.2 13.2, 61 20.8, 61 30.2
           C61 41.8, 56.5 51, 50 56 Z"
                fill="#F0B39D"
              />

              {/* 안쪽 레이어 */}
              <path
                d="M50 52.5
           C45.7 48.8, 43 41.5, 43 32.5
           C43 24.8, 45.6 18.7, 50 15.5
           C54.4 18.7, 57 24.8, 57 32.5
           C57 41.5, 54.3 48.8, 50 52.5 Z"
                fill="#F3C1AF"
                opacity="0.42"
              />
            </g>
          </g>
        )}

        {/* stage 3 - 만개 */}
        {stage >= 3 && (
          <g className={animate ? "flower-plant" : ""}>
            {/* 줄기 */}
            <g filter="url(#softShadow)">
              <path
                d="M50 124 C50 112, 50 100, 50 88 C50 79, 49.8 69, 50 60"
                stroke="#A3A995"
                strokeWidth="4"
                strokeLinecap="round"
                fill="none"
              />
              <path
                d="M50 88 C49.6 84, 49.2 81, 49.8 78"
                stroke="#97A08D"
                strokeWidth="1.3"
                strokeLinecap="round"
                fill="none"
                opacity="0.9"
              />

              {/* 왼쪽 잎 */}
              <g className={animate ? "flower-leaf-left" : ""}>
                <path
                  d="M49 90
             C44 82, 34 76.5, 24 78
             C22.5 85.5, 27.5 93.5, 37 98
             C42 100.5, 46.2 101.8, 49.6 102.2
             C49.7 97.8, 49.5 93.8, 49 90 Z"
                  fill="#AEB2A4"
                />
                <path
                  d="M48.9 100.8 C45 95, 40.4 90.9, 34.2 86.3"
                  stroke="#959B8C"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  fill="none"
                />
              </g>

              {/* 오른쪽 잎 */}
              <g className={animate ? "flower-leaf-right" : ""}>
                <path
                  d="M51 90
             C56 82, 66 76.5, 76 78
             C77.5 85.5, 72.5 93.5, 63 98
             C58 100.5, 53.8 101.8, 50.4 102.2
             C50.3 97.8, 50.5 93.8, 51 90 Z"
                  fill="#AEB2A4"
                />
                <path
                  d="M51.1 100.8 C55 95, 59.6 90.9, 65.8 86.3"
                  stroke="#959B8C"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  fill="none"
                />
              </g>
            </g>

            {/* 꽃 */}
            <g
              className={animate ? "flower-petals" : ""}
              filter="url(#petalShadow)"
            >
              {/* 위 */}
              <ellipse cx="50" cy="18.5" rx="10.5" ry="15.5" fill="#E89E83" />

              {/* 좌상 */}
              <ellipse
                cx="30"
                cy="28.5"
                rx="12"
                ry="16.5"
                transform="rotate(-46 30 28.5)"
                fill="#EA9475"
                opacity="0.95"
              />

              {/* 우상 */}
              <ellipse
                cx="70"
                cy="28.5"
                rx="12"
                ry="16.5"
                transform="rotate(46 70 28.5)"
                fill="#E98E6D"
                opacity="0.95"
              />

              {/* 좌하 */}
              <ellipse
                cx="31"
                cy="49"
                rx="12"
                ry="16.5"
                transform="rotate(34 31 49)"
                fill="#E99579"
                opacity="0.92"
              />

              {/* 하 */}
              <ellipse
                cx="50"
                cy="58"
                rx="10.7"
                ry="16"
                fill="#E89A7F"
                opacity="0.92"
              />

              {/* 우하 */}
              <ellipse
                cx="69"
                cy="49"
                rx="12"
                ry="16.5"
                transform="rotate(-34 69 49)"
                fill="#EAA387"
                opacity="0.92"
              />

              {/* 안쪽 레이어 */}
              <ellipse
                cx="50"
                cy="30.5"
                rx="13.5"
                ry="11.5"
                fill="#EA8F72"
                opacity="0.22"
              />
              <ellipse
                cx="40"
                cy="38"
                rx="10"
                ry="11"
                transform="rotate(-22 40 38)"
                fill="#EA8F72"
                opacity="0.12"
              />
              <ellipse
                cx="60"
                cy="38"
                rx="10"
                ry="11"
                transform="rotate(22 60 38)"
                fill="#EA8F72"
                opacity="0.12"
              />

              {/* 중심 */}
              <circle cx="50" cy="37.8" r="11" fill="#F0C993" />
            </g>
          </g>
        )}
      </svg>
    </div>
  );
}
