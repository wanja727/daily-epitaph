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
            {/* 줄기 */}
            <path
              d="M50 118 C50 108, 50 94, 50 76 C50 65, 50.2 58, 49.8 52"
              stroke="#A7AC9C"
              strokeWidth="4"
              strokeLinecap="round"
              fill="none"
            />

            {/* 왼쪽 잎 */}
            <g className={animate ? "sprout-leaf-left" : ""}>
              <path
                d="M48 50
           C42 40, 31 34, 20 35
           C17 43, 20 52, 30 60
           C37 65.5, 44 67, 48.5 67.5
           C49.2 61.5, 49.1 56, 48 50 Z"
                fill="#B2B5A7"
              />
              <path
                d="M48.5 65.5 C44 58, 39 53, 32 48"
                stroke="#969B8C"
                strokeWidth="1.2"
                strokeLinecap="round"
                fill="none"
                opacity="0.95"
              />
              <path
                d="M48 50 C42 40, 31 34, 20 35"
                stroke="#C4C7BC"
                strokeWidth="0.8"
                fill="none"
                opacity="0.35"
              />
            </g>

            {/* 오른쪽 잎 */}
            <g className={animate ? "sprout-leaf-right" : ""}>
              <path
                d="M52 50
           C58 40, 69 34, 80 35
           C83 43, 80 52, 70 60
           C63 65.5, 56 67, 51.5 67.5
           C50.8 61.5, 50.9 56, 52 50 Z"
                fill="#B2B5A7"
              />
              <path
                d="M51.5 65.5 C56 58, 61 53, 68 48"
                stroke="#969B8C"
                strokeWidth="1.2"
                strokeLinecap="round"
                fill="none"
                opacity="0.95"
              />
              <path
                d="M52 50 C58 40, 69 34, 80 35"
                stroke="#C4C7BC"
                strokeWidth="0.8"
                fill="none"
                opacity="0.35"
              />
            </g>
          </g>
        )}

        {/* stage 2 - 봉우리 */}
        {stage === 2 && (
          <g className={animate ? "bud-plant" : ""} filter="url(#softShadow)">
            {/* 줄기 */}
            <path
              d="M50 118 C50 104, 50 90, 50 76 C50 67, 49.8 56, 50 45"
              stroke="#A4A998"
              strokeWidth="4"
              strokeLinecap="round"
              fill="none"
            />

            {/* 왼쪽 잎 */}
            <g className={animate ? "bud-leaf-left" : ""}>
              <path
                d="M49 78
           C44 70, 33 64, 22 66
           C21 74, 27 82, 37 87
           C42 89.5, 46 91, 49.5 91
           C49.7 86, 49.5 82, 49 78 Z"
                fill="#ADB1A2"
              />
              <path
                d="M48.8 89.5 C44.8 83.5, 40 79.5, 34 75"
                stroke="#94998A"
                strokeWidth="1.1"
                strokeLinecap="round"
                fill="none"
              />
            </g>

            {/* 오른쪽 잎 */}
            <g className={animate ? "bud-leaf-right" : ""}>
              <path
                d="M51 78
           C56 70, 67 64, 78 66
           C79 74, 73 82, 63 87
           C58 89.5, 54 91, 50.5 91
           C50.3 86, 50.5 82, 51 78 Z"
                fill="#ADB1A2"
              />
              <path
                d="M51.2 89.5 C55.2 83.5, 60 79.5, 66 75"
                stroke="#94998A"
                strokeWidth="1.1"
                strokeLinecap="round"
                fill="none"
              />
            </g>

            {/* 봉우리 */}
            <g className={animate ? "bud-top" : ""} filter="url(#petalShadow)">
              <path
                d="M50 44
           C44.5 44, 40 39, 40.8 31
           C41.5 24, 46 18, 50 16
           C54 18, 58.5 24, 59.2 31
           C60 39, 55.5 44, 50 44 Z"
                fill="#EDA187"
              />
              <path
                d="M45.5 41
           C45.5 34, 47.5 26, 50 20
           C52.5 26, 54.5 34, 54.5 41"
                fill="#EE9B84"
                opacity="0.58"
              />
              <circle cx="50" cy="32" r="4.8" fill="#F1C994" />
            </g>
          </g>
        )}

        {/* stage 3 - 만개: 업로드 이미지에 맞춤 */}
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
             C44 82, 33 76, 22 78
             C20.5 86, 26 94, 37 99
             C42.5 101.5, 46.7 102.5, 49.8 103
             C49.8 98, 49.6 94, 49 90 Z"
                  fill="#AEB2A4"
                />
                <path
                  d="M48.9 101.5 C44.7 95, 40 91, 33 86"
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
             C56 82, 67 76, 78 78
             C79.5 86, 74 94, 63 99
             C57.5 101.5, 53.3 102.5, 50.2 103
             C50.2 98, 50.4 94, 51 90 Z"
                  fill="#AEB2A4"
                />
                <path
                  d="M51.1 101.5 C55.3 95, 60 91, 67 86"
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
              <ellipse cx="50" cy="18" rx="10.5" ry="15.5" fill="#E89E83" />

              {/* 좌상 */}
              <ellipse
                cx="28.5"
                cy="28"
                rx="12"
                ry="16.5"
                transform="rotate(-48 28.5 28)"
                fill="#EA9475"
                opacity="0.95"
              />

              {/* 우상 */}
              <ellipse
                cx="71.5"
                cy="28"
                rx="12"
                ry="16.5"
                transform="rotate(48 71.5 28)"
                fill="#E98E6D"
                opacity="0.95"
              />

              {/* 좌하 */}
              <ellipse
                cx="29"
                cy="50.5"
                rx="12"
                ry="16.5"
                transform="rotate(38 29 50.5)"
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
                cx="71"
                cy="50.5"
                rx="12"
                ry="16.5"
                transform="rotate(-38 71 50.5)"
                fill="#EAA387"
                opacity="0.92"
              />

              {/* 꽃잎 안쪽 은은한 레이어 */}
              <ellipse
                cx="50"
                cy="28"
                rx="13"
                ry="11"
                fill="#EA8F72"
                opacity="0.22"
              />
              <ellipse
                cx="39"
                cy="36"
                rx="10"
                ry="11"
                transform="rotate(-25 39 36)"
                fill="#EA8F72"
                opacity="0.12"
              />
              <ellipse
                cx="61"
                cy="36"
                rx="10"
                ry="11"
                transform="rotate(25 61 36)"
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
