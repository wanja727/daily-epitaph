"use client";

interface Props {
  waterCount: number;
  size?: "lg" | "sm";
  animate?: boolean;
  delay?: number;
  flowerType?: string;
}

export default function FlowerIllustration({
  waterCount,
  size = "lg",
  animate = true,
  delay = 0,
  flowerType = "flower",
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
            <feComposite in="color" in2="offset" operator="in" result="shadow" />
            <feMerge>
              <feMergeNode in="shadow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="petalShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="0.8" result="blur" />
            <feOffset dx="0.8" dy="1.1" result="offset" />
            <feFlood floodColor="#d79077" floodOpacity="0.18" result="color" />
            <feComposite in="color" in2="offset" operator="in" result="shadow" />
            <feMerge>
              <feMergeNode in="shadow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="purplePetalShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="0.8" result="blur" />
            <feOffset dx="0.8" dy="1.1" result="offset" />
            <feFlood floodColor="#6c5aad" floodOpacity="0.18" result="color" />
            <feComposite in="color" in2="offset" operator="in" result="shadow" />
            <feMerge>
              <feMergeNode in="shadow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="sunPetalShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="0.8" result="blur" />
            <feOffset dx="0.8" dy="1.1" result="offset" />
            <feFlood floodColor="#c47020" floodOpacity="0.18" result="color" />
            <feComposite in="color" in2="offset" operator="in" result="shadow" />
            <feMerge>
              <feMergeNode in="shadow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* stage 0 - 씨앗 (공통) */}
        {stage === 0 && (
          <g filter="url(#softShadow)">
            <ellipse cx="50" cy="117" rx="4.4" ry="2.9" fill="#9B8B76" />
            <ellipse cx="48.6" cy="116.2" rx="1.3" ry="0.8" fill="#B7A694" opacity="0.65" />
            <path d="M41 121 Q50 118 59 121" stroke="#E6D8C6" strokeWidth="1" fill="none" opacity="0.45" />
          </g>
        )}

        {/* stage 1 - 새싹 (공통) */}
        {stage === 1 && (
          <g className={animate ? "sprout-plant" : ""} filter="url(#softShadow)">
            <path d="M50 118 C50 111, 50 103, 50 94 C50 88, 50.1 83, 49.9 79" stroke="#A7AC9C" strokeWidth="4" strokeLinecap="round" fill="none" />
            <g className={animate ? "sprout-leaf-left" : ""}>
              <path d="M48.8 77 C45.6 72, 39.4 68.5, 33 69 C31.2 73.8, 33.6 79.3, 39.3 83.5 C43.2 86.3, 46.2 87.3, 48.9 87.8 C49.1 84.5, 49 80.6, 48.8 77 Z" fill="#B2B5A7" />
              <path d="M48.8 86.4 C46.2 82.4, 43 79.5, 38.5 76.2" stroke="#969B8C" strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.95" />
              <path d="M48.8 77 C45.6 72, 39.4 68.5, 33 69" stroke="#C4C7BC" strokeWidth="0.68" fill="none" opacity="0.35" />
            </g>
            <g className={animate ? "sprout-leaf-right" : ""}>
              <path d="M51.2 77 C54.4 72, 60.6 68.5, 67 69 C68.8 73.8, 66.4 79.3, 60.7 83.5 C56.8 86.3, 53.8 87.3, 51.1 87.8 C50.9 84.5, 51 80.6, 51.2 77 Z" fill="#B2B5A7" />
              <path d="M51.2 86.4 C53.8 82.4, 57 79.5, 61.5 76.2" stroke="#969B8C" strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.95" />
              <path d="M51.2 77 C54.4 72, 60.6 68.5, 67 69" stroke="#C4C7BC" strokeWidth="0.68" fill="none" opacity="0.35" />
            </g>
          </g>
        )}

        {/* ─── 코랄 꽃 (flower) ─── */}

        {/* stage 2 - 코랄 봉우리 */}
        {stage === 2 && flowerType === "flower" && (
          <g className={animate ? "bud-plant" : ""}>
            <g filter="url(#softShadow)">
              <path d="M50 118 C50 104, 50 92, 50 78 C50 68, 49.8 57, 50 49" stroke="#A4A998" strokeWidth="4" strokeLinecap="round" fill="none" />
              <g className={animate ? "bud-leaf-left" : ""}>
                <path d="M49 80 C44.5 73, 35 67.5, 25.5 69 C24 76, 29 83.5, 38 88 C42.8 90.6, 46.5 91.6, 49.5 92 C49.7 87.4, 49.5 83.5, 49 80 Z" fill="#ADB1A2" />
                <path d="M48.9 90.6 C45.2 85.2, 40.8 81.2, 35.2 77" stroke="#94998A" strokeWidth="1.1" strokeLinecap="round" fill="none" />
              </g>
              <g className={animate ? "bud-leaf-right" : ""}>
                <path d="M51 80 C55.5 73, 65 67.5, 74.5 69 C76 76, 71 83.5, 62 88 C57.2 90.6, 53.5 91.6, 50.5 92 C50.3 87.4, 50.5 83.5, 51 80 Z" fill="#ADB1A2" />
                <path d="M51.1 90.6 C54.8 85.2, 59.2 81.2, 64.8 77" stroke="#94998A" strokeWidth="1.1" strokeLinecap="round" fill="none" />
              </g>
            </g>
            <g className={animate ? "bud-top" : ""} filter="url(#petalShadow)">
              <path d="M50 20 C47.8 20, 46.2 21.6, 45.2 23.8 C46.2 27.4, 48 30, 50 31.4 C52 30, 53.8 27.4, 54.8 23.8 C53.8 21.6, 52.2 20, 50 20 Z" fill="#F5F1E8" opacity="0.95" />
              <path d="M44.8 55 C37 49.2, 31.8 38.5, 32.5 25.5 C33 17.5, 37.2 11.2, 42.8 8.5 C44.7 9, 45.7 12.5, 46 17.5 C46.5 28, 46 42, 44.8 55 Z" fill="#EE8F75" />
              <path d="M55.2 55 C63 49.2, 68.2 38.5, 67.5 25.5 C67 17.5, 62.8 11.2, 57.2 8.5 C55.3 9, 54.3 12.5, 54 17.5 C53.5 28, 54 42, 55.2 55 Z" fill="#EB886E" />
              <path d="M50 56 C43.5 51, 39 41.8, 39 30.2 C39 20.8, 42.8 13.2, 50 9.5 C57.2 13.2, 61 20.8, 61 30.2 C61 41.8, 56.5 51, 50 56 Z" fill="#F0B39D" />
              <path d="M50 52.5 C45.7 48.8, 43 41.5, 43 32.5 C43 24.8, 45.6 18.7, 50 15.5 C54.4 18.7, 57 24.8, 57 32.5 C57 41.5, 54.3 48.8, 50 52.5 Z" fill="#F3C1AF" opacity="0.42" />
            </g>
          </g>
        )}

        {/* stage 3 - 코랄 만개 */}
        {stage >= 3 && flowerType === "flower" && (
          <g className={animate ? "flower-plant" : ""}>
            <g filter="url(#softShadow)">
              <path d="M50 124 C50 112, 50 100, 50 88 C50 79, 49.8 69, 50 60" stroke="#A3A995" strokeWidth="4" strokeLinecap="round" fill="none" />
              <path d="M50 88 C49.6 84, 49.2 81, 49.8 78" stroke="#97A08D" strokeWidth="1.3" strokeLinecap="round" fill="none" opacity="0.9" />
              <g className={animate ? "flower-leaf-left" : ""}>
                <path d="M49 90 C44 82, 34 76.5, 24 78 C22.5 85.5, 27.5 93.5, 37 98 C42 100.5, 46.2 101.8, 49.6 102.2 C49.7 97.8, 49.5 93.8, 49 90 Z" fill="#AEB2A4" />
                <path d="M48.9 100.8 C45 95, 40.4 90.9, 34.2 86.3" stroke="#959B8C" strokeWidth="1.2" strokeLinecap="round" fill="none" />
              </g>
              <g className={animate ? "flower-leaf-right" : ""}>
                <path d="M51 90 C56 82, 66 76.5, 76 78 C77.5 85.5, 72.5 93.5, 63 98 C58 100.5, 53.8 101.8, 50.4 102.2 C50.3 97.8, 50.5 93.8, 51 90 Z" fill="#AEB2A4" />
                <path d="M51.1 100.8 C55 95, 59.6 90.9, 65.8 86.3" stroke="#959B8C" strokeWidth="1.2" strokeLinecap="round" fill="none" />
              </g>
            </g>
            <g className={animate ? "flower-petals" : ""} filter="url(#petalShadow)">
              <ellipse cx="50" cy="18.5" rx="10.5" ry="15.5" fill="#E89E83" />
              <ellipse cx="30" cy="28.5" rx="12" ry="16.5" transform="rotate(-46 30 28.5)" fill="#EA9475" opacity="0.95" />
              <ellipse cx="70" cy="28.5" rx="12" ry="16.5" transform="rotate(46 70 28.5)" fill="#E98E6D" opacity="0.95" />
              <ellipse cx="31" cy="49" rx="12" ry="16.5" transform="rotate(34 31 49)" fill="#E99579" opacity="0.92" />
              <ellipse cx="50" cy="58" rx="10.7" ry="16" fill="#E89A7F" opacity="0.92" />
              <ellipse cx="69" cy="49" rx="12" ry="16.5" transform="rotate(-34 69 49)" fill="#EAA387" opacity="0.92" />
              <ellipse cx="50" cy="30.5" rx="13.5" ry="11.5" fill="#EA8F72" opacity="0.22" />
              <ellipse cx="40" cy="38" rx="10" ry="11" transform="rotate(-22 40 38)" fill="#EA8F72" opacity="0.12" />
              <ellipse cx="60" cy="38" rx="10" ry="11" transform="rotate(22 60 38)" fill="#EA8F72" opacity="0.12" />
              <circle cx="50" cy="37.8" r="11" fill="#F0C993" />
            </g>
          </g>
        )}

        {/* ─── 보라 꽃 (purple) ─── */}

        {/* stage 2 - 보라 봉우리 */}
        {stage === 2 && flowerType === "purple" && (
          <g className={animate ? "bud-plant" : ""}>
            <g filter="url(#softShadow)">
              <path d="M50 118 C50 104, 50 92, 50 78 C50 68, 49.8 57, 50 49" stroke="#A4A998" strokeWidth="4" strokeLinecap="round" fill="none" />
              <g className={animate ? "bud-leaf-left" : ""}>
                <path d="M49 80 C44.5 73, 35 67.5, 25.5 69 C24 76, 29 83.5, 38 88 C42.8 90.6, 46.5 91.6, 49.5 92 C49.7 87.4, 49.5 83.5, 49 80 Z" fill="#ADB1A2" />
                <path d="M48.9 90.6 C45.2 85.2, 40.8 81.2, 35.2 77" stroke="#94998A" strokeWidth="1.1" strokeLinecap="round" fill="none" />
              </g>
              <g className={animate ? "bud-leaf-right" : ""}>
                <path d="M51 80 C55.5 73, 65 67.5, 74.5 69 C76 76, 71 83.5, 62 88 C57.2 90.6, 53.5 91.6, 50.5 92 C50.3 87.4, 50.5 83.5, 51 80 Z" fill="#ADB1A2" />
                <path d="M51.1 90.6 C54.8 85.2, 59.2 81.2, 64.8 77" stroke="#94998A" strokeWidth="1.1" strokeLinecap="round" fill="none" />
              </g>
            </g>
            <g className={animate ? "bud-top" : ""} filter="url(#purplePetalShadow)">
              <path d="M50 20 C47.8 20, 46.2 21.6, 45.2 23.8 C46.2 27.4, 48 30, 50 31.4 C52 30, 53.8 27.4, 54.8 23.8 C53.8 21.6, 52.2 20, 50 20 Z" fill="#ede8ff" opacity="0.95" />
              <path d="M44.8 55 C37 49.2, 31.8 38.5, 32.5 25.5 C33 17.5, 37.2 11.2, 42.8 8.5 C44.7 9, 45.7 12.5, 46 17.5 C46.5 28, 46 42, 44.8 55 Z" fill="#9b87ff" />
              <path d="M55.2 55 C63 49.2, 68.2 38.5, 67.5 25.5 C67 17.5, 62.8 11.2, 57.2 8.5 C55.3 9, 54.3 12.5, 54 17.5 C53.5 28, 54 42, 55.2 55 Z" fill="#8a79ee" />
              <path d="M50 56 C43.5 51, 39 41.8, 39 30.2 C39 20.8, 42.8 13.2, 50 9.5 C57.2 13.2, 61 20.8, 61 30.2 C61 41.8, 56.5 51, 50 56 Z" fill="#c3b7ff" />
              <path d="M50 52.5 C45.7 48.8, 43 41.5, 43 32.5 C43 24.8, 45.6 18.7, 50 15.5 C54.4 18.7, 57 24.8, 57 32.5 C57 41.5, 54.3 48.8, 50 52.5 Z" fill="#d2d3f0" opacity="0.42" />
            </g>
          </g>
        )}

        {/* stage 3 - 보라 만개 */}
        {stage >= 3 && flowerType === "purple" && (
          <g className={animate ? "flower-plant" : ""}>
            <g transform="scale(0.25)">
              {/* 그라디언트 */}
              <defs>
                <linearGradient id="purpleStemGrad" x1="206.9" y1="189.7" x2="206.9" y2="445.6" gradientUnits="userSpaceOnUse">
                  <stop offset="0" stopColor="#9bcb80" />
                  <stop offset="1" stopColor="#66a244" />
                </linearGradient>
                <linearGradient id="purpleLeafGrad1" x1="246.8" y1="270.1" x2="246.8" y2="394.8" gradientUnits="userSpaceOnUse">
                  <stop offset="0" stopColor="#9bcb80" />
                  <stop offset="1" stopColor="#7bb35b" />
                </linearGradient>
                <linearGradient id="purpleLeafGrad2" x1="150.9" y1="285.5" x2="160.1" y2="430.1" gradientUnits="userSpaceOnUse">
                  <stop offset="0" stopColor="#9bcb80" />
                  <stop offset="1" stopColor="#78a75e" />
                </linearGradient>
              </defs>

              {/* 줄기 + 잎 */}
              <g>
                <path fill="url(#purpleStemGrad)" d="M202.6,193.5c.4-5.1,4.1-5.2,3.9,0-2.2,48.6-5.3,143.5,11.5,247.4.8,5.1-14.4,6.5-15.1,1.4-14-105.6-3.5-209.2-.2-248.8Z" />
                <path fill="url(#purpleLeafGrad1)" d="M217.8,358.9c7.4,6.8-5.2,26.4-9.3,35.3l.9.6c16-19.2,27.7-17.3,31.6-17.5,20.5-1.2,23.8-8.7,23.2-11.5-3.1-10-20.1-2.6-27.9,3.1,9.9-16,19.6-21.5,23.2-22.3,9-2,25.9-8.1,20.9-16.1-5-8-19.1.8-25.6,6.1-.8-7.2,8.5-21.1,18.6-23.8,17-4.6,18.4-7.9,17-10.8-3.1-8.6-19.9-2.6-27.9,1.5,11.9-8.4,27.1-26.1,17-32.3-11.5-7-21.2,17.7-22.5,29.9-1.3-8.4-5.9-24.7-13.9-22.3-10.1,3.1,1.6,14.6,7,26.9,4.3,9.8,1.3,20.5-.8,24.6-1.9-14.7-9.3-18.4-11.6-18.4-11.6,0-6.2,10.8-1.6,26.1,3.7,12.3-4.6,24.6-9.3,29.2,1.2-25.2-10.8-37.9-17.8-36.9-15.5,2.3-.8,20,8.5,28.4Z" />
                <path fill="url(#purpleLeafGrad2)" d="M190.9,386.2c-8.1,8.4,7.9,30.2,13.3,40.2l-1,.8c-19.9-21.1-33.2-18-37.7-18-23.7,0-28-8.3-27.7-11.6,2.8-11.8,23-4.4,32.4,1.5-12.6-17.8-24.2-23.5-28.4-24.1-10.6-1.7-30.4-7.5-25.3-17.1,5.1-9.6,22.1-.5,29.9,5.2.4-8.4-11.4-23.8-23.2-26.2-20-4.1-21.8-7.8-20.4-11.2,2.9-10.2,22.7-4.4,32.3-.3-14.3-8.9-33.2-28.3-22-36.1,12.8-9,25.7,18.9,28.1,33.1.9-9.9,5-29.1,14.4-26.8,11.8,2.8-.7,17-6.1,31.7-4.3,11.7,0,23.8,2.7,28.4,1.1-17.2,9.4-22,12-22.2,13.4-.9,7.9,12,3.7,30.1-3.4,14.5,7.2,28.1,12.9,33.1-3.3-29.1,9.7-44.7,17.8-44,18,1.5,2.4,23.1-7.7,33.5Z" />
              </g>

              {/* 꽃잎 */}
              <g>
                <path fill="#9b87ff" d="M114.3,127.5c-14.5-22,0-46,19.4-58.7,20.2-13.3,47.1-16.4,61.6,5.6,18.3,27.9,13.1,60.1,8.9,90.8.1,4.3-6.2,8.4-10.1,6.6-29.5-8.5-61.6-16.7-79.8-44.3Z" />
                <path fill="#9b87ff" d="M157.5,255.7c-22,14.5-46,0-58.7-19.4-13.3-20.2-16.4-47.1,5.6-61.6,27.9-18.3,60.1-13.1,90.8-8.9,4.3-.1,8.4,6.2,6.6,10.1-8.5,29.5-16.7,61.6-44.3,79.8Z" />
                <path fill="#9b87ff" d="M285.7,212.5c14.5,22,0,46-19.4,58.7-20.2,13.3-47.1,16.4-61.6-5.6-18.3-27.9-13.1-60.1-8.9-90.8-.1-4.3,6.2-8.4,10.1-6.6,29.5,8.5,61.6,16.7,79.8,44.3Z" />
                <path fill="#9b87ff" d="M242.5,84.3c22-14.5,46,0,58.7,19.4,13.3,20.2,16.4,47.1-5.6,61.6-27.9,18.3-60.1,13.1-90.8,8.9-4.3.1-8.4-6.2-6.6-10.1,8.5-29.5,16.7-61.6,44.3-79.8Z" />
              </g>

              {/* 중심 */}
              <g>
                <path fill="#c3b7ff" fillOpacity="0.2" d="M178.5,105.9l12.5,54.7-52.3-20.5,47.6,29.8-51.4,22.5,54.7-12.5-20.5,52.3,29.8-47.6,22.5,51.4-12.5-54.7,52.3,20.5-47.6-29.8,51.4-22.5-54.7,12.5,20.5-52.3-29.8,47.6-22.5-51.4Z" />
                <path fill="#6c5aad" fillOpacity="0.5" d="M200,216.1l3.4-36.7,28.4,23.5-23.5-28.4,36.7-3.4-36.7-3.4,23.5-28.4-28.4,23.5-3.4-36.7-3.4,36.7-28.4-23.5,23.5,28.4-36.7,3.4,36.7,3.4-23.5,28.4,28.4-23.5,3.4,36.7Z" />
                <circle fill="#946cde" fillOpacity="0.6" cx="200" cy="171" r="18.5" />
                {/* 중심 하이라이트 */}
                <path fill="#d2d3f0" opacity="0.8" d="M209.5,183.3c-1.9-1.9-2-4.8-2-4.8,0,0,2.9.1,4.8,2,1.9,1.9,7.4,10.2,7.4,10.2,0,0-8.3-5.5-10.2-7.4Z" />
                <path fill="#d2d3f0" opacity="0.8" d="M213.4,178.8c-2.4-1-3.7-3.7-3.7-3.7,0,0,2.7-1,5.2,0,2.4,1,10.7,6.6,10.7,6.6,0,0-9.8-1.9-12.3-2.9Z" />
                <path fill="#d2d3f0" opacity="0.8" d="M215.4,173c-2.6,0-4.8-2-4.8-2,0,0,2.1-2,4.8-2s12.4,2,12.4,2c0,0-9.8,2-12.4,2Z" />
                <path fill="#d2d3f0" opacity="0.8" d="M215,167c-2.4,1-5.2,0-5.2,0,0,0,1.2-2.7,3.7-3.7,2.4-1,12.3-2.9,12.3-2.9,0,0-8.3,5.6-10.7,6.6Z" />
                <path fill="#d2d3f0" opacity="0.8" d="M212.3,161.6c-1.9,1.9-4.8,2-4.8,2,0,0,.1-2.9,2-4.8,1.9-1.9,10.2-7.4,10.2-7.4,0,0-5.5,8.3-7.4,10.2Z" />
                <path fill="#d2d3f0" opacity="0.8" d="M207.7,157.6c-1,2.4-3.7,3.7-3.7,3.7,0,0-1-2.7,0-5.2,1-2.4,6.6-10.7,6.6-10.7,0,0-1.9,9.8-2.9,12.3Z" />
                <path fill="#d2d3f0" opacity="0.8" d="M202,155.6c0,2.6-2,4.8-2,4.8,0,0-2-2.1-2-4.8s2-12.4,2-12.4c0,0,2,9.8,2,12.4Z" />
                <path fill="#d2d3f0" opacity="0.8" d="M195.9,156.1c1,2.4,0,5.2,0,5.2,0,0-2.7-1.2-3.7-3.7-1-2.4-2.9-12.3-2.9-12.3,0,0,5.6,8.3,6.6,10.7Z" />
                <path fill="#d2d3f0" opacity="0.8" d="M190.5,158.8c1.9,1.9,2,4.8,2,4.8,0,0-2.9-.1-4.8-2-1.9-1.9-7.4-10.2-7.4-10.2,0,0,8.3,5.5,10.2,7.4Z" />
                <path fill="#d2d3f0" opacity="0.8" d="M186.6,163.3c2.4,1,3.7,3.7,3.7,3.7,0,0-2.7,1-5.2,0-2.4-1-10.7-6.6-10.7-6.6,0,0,9.8,1.9,12.3,2.9Z" />
                <path fill="#d2d3f0" opacity="0.8" d="M184.6,169c2.6,0,4.8,2,4.8,2,0,0-2.1,2-4.8,2s-12.4-2-12.4-2c0,0,9.8-2,12.4-2Z" />
                <path fill="#d2d3f0" opacity="0.8" d="M185,175.1c2.4-1,5.2,0,5.2,0,0,0-1.2,2.7-3.7,3.7-2.4,1-12.3,2.9-12.3,2.9,0,0,8.3-5.6,10.7-6.6Z" />
                <path fill="#d2d3f0" opacity="0.8" d="M187.7,180.5c1.9-1.9,4.8-2,4.8-2,0,0-.1,2.9-2,4.8s-10.2,7.4-10.2,7.4c0,0,5.5-8.3,7.4-10.2Z" />
                <path fill="#d2d3f0" opacity="0.8" d="M192.3,184.5c1-2.4,3.7-3.7,3.7-3.7,0,0,1,2.7,0,5.2-1,2.4-6.6,10.7-6.6,10.7,0,0,1.9-9.8,2.9-12.3Z" />
                <path fill="#d2d3f0" opacity="0.8" d="M198,186.4c0-2.6,2-4.8,2-4.8,0,0,2,2.1,2,4.8s-2,12.4-2,12.4c0,0-2-9.8-2-12.4Z" />
                <path fill="#d2d3f0" opacity="0.8" d="M204.1,186c-1-2.4,0-5.2,0-5.2,0,0,2.7,1.2,3.7,3.7,1,2.4,2.9,12.3,2.9,12.3,0,0-5.6-8.3-6.6-10.7Z" />
              </g>
            </g>
          </g>
        )}

        {/* ─── 해바라기 (sunflower) ─── */}

        {/* stage 2 - 해바라기 봉우리 */}
        {stage === 2 && flowerType === "sunflower" && (
          <g className={animate ? "bud-plant" : ""}>
            <g filter="url(#softShadow)">
              <path d="M50 118 C50 104, 50 92, 50 78 C50 68, 49.8 57, 50 49" stroke="#A4A998" strokeWidth="4" strokeLinecap="round" fill="none" />
              <g className={animate ? "bud-leaf-left" : ""}>
                <path d="M49 80 C44.5 73, 35 67.5, 25.5 69 C24 76, 29 83.5, 38 88 C42.8 90.6, 46.5 91.6, 49.5 92 C49.7 87.4, 49.5 83.5, 49 80 Z" fill="#ADB1A2" />
                <path d="M48.9 90.6 C45.2 85.2, 40.8 81.2, 35.2 77" stroke="#94998A" strokeWidth="1.1" strokeLinecap="round" fill="none" />
              </g>
              <g className={animate ? "bud-leaf-right" : ""}>
                <path d="M51 80 C55.5 73, 65 67.5, 74.5 69 C76 76, 71 83.5, 62 88 C57.2 90.6, 53.5 91.6, 50.5 92 C50.3 87.4, 50.5 83.5, 51 80 Z" fill="#ADB1A2" />
                <path d="M51.1 90.6 C54.8 85.2, 59.2 81.2, 64.8 77" stroke="#94998A" strokeWidth="1.1" strokeLinecap="round" fill="none" />
              </g>
            </g>
            <g className={animate ? "bud-top" : ""} filter="url(#sunPetalShadow)">
              <path d="M50 20 C47.8 20, 46.2 21.6, 45.2 23.8 C46.2 27.4, 48 30, 50 31.4 C52 30, 53.8 27.4, 54.8 23.8 C53.8 21.6, 52.2 20, 50 20 Z" fill="#fff8e8" opacity="0.95" />
              <path d="M44.8 55 C37 49.2, 31.8 38.5, 32.5 25.5 C33 17.5, 37.2 11.2, 42.8 8.5 C44.7 9, 45.7 12.5, 46 17.5 C46.5 28, 46 42, 44.8 55 Z" fill="#ffc871" />
              <path d="M55.2 55 C63 49.2, 68.2 38.5, 67.5 25.5 C67 17.5, 62.8 11.2, 57.2 8.5 C55.3 9, 54.3 12.5, 54 17.5 C53.5 28, 54 42, 55.2 55 Z" fill="#f5b85e" />
              <path d="M50 56 C43.5 51, 39 41.8, 39 30.2 C39 20.8, 42.8 13.2, 50 9.5 C57.2 13.2, 61 20.8, 61 30.2 C61 41.8, 56.5 51, 50 56 Z" fill="#ffd68a" />
              <path d="M50 52.5 C45.7 48.8, 43 41.5, 43 32.5 C43 24.8, 45.6 18.7, 50 15.5 C54.4 18.7, 57 24.8, 57 32.5 C57 41.5, 54.3 48.8, 50 52.5 Z" fill="#ffe4ad" opacity="0.42" />
            </g>
          </g>
        )}

        {/* stage 3 - 해바라기 만개 */}
        {stage >= 3 && flowerType === "sunflower" && (
          <g className={animate ? "flower-plant" : ""}>
            <g transform="scale(0.25)">
              <defs>
                <linearGradient id="sunStemGrad" x1="211.8" y1="291.8" x2="203.5" y2="412.9" gradientUnits="userSpaceOnUse">
                  <stop offset="0" stopColor="#9bcb80" />
                  <stop offset="1" stopColor="#81a86a" />
                </linearGradient>
                <linearGradient id="sunLeafGrad" x1="205.6" y1="294.9" x2="209.9" y2="418.1" gradientUnits="userSpaceOnUse">
                  <stop offset="0" stopColor="#9bcb80" />
                  <stop offset="1" stopColor="#89b571" />
                </linearGradient>
              </defs>

              {/* 줄기 + 잎 */}
              <g>
                <path fill="url(#sunStemGrad)" d="M202.6,193.5c.4-5.1,4.1-5.2,3.9,0-2.2,48.6-5.3,143.5,11.5,247.4.8,5.1-14.4,6.5-15.1,1.4-14-105.6-3.5-209.2-.2-248.8Z" />
                <path fill="url(#sunLeafGrad)" d="M206.2,349.5c-.7,0-1.2-.7-.9-1.3,2.9-6.2,16.1-32.4,46.8-52.3,32.1-20.9,53.8-18.3,60-17.8.7,0,1.3.8,1,1.5-4.8,10.9-37.9,67.6-106.9,70ZM97.7,298.9c-.3-.7.2-1.4.9-1.3,6.9.4,36,3.4,65.6,24.9,31,22.5,36.4,43.7,38.1,49.6.2.7-.3,1.5-1.1,1.5-11.9-.5-76.7-11.2-103.7-74.6Z" />
              </g>

              {/* 꽃잎 */}
              <path fill="#ffc871" d="M180.3,192.1s-93.8,33.6-76.1,49.9c17.7,16.2,87.6-40.7,87.6-40.7,0,0-45.8,58.3-23.3,68.2,22.5,9.9,28.7-63.2,28.7-63.2,0,0-21.7,87.1,6.9,79.1,28.6-8.1,3.7-84.1,3.7-84.1,0,0,33.7,71.4,53.6,62.6,19.9-8.8-42.1-70.5-42.1-70.5,0,0,61.5,54.2,78.3,32.5,16.8-21.6-78.3-44.4-78.3-44.4,0,0,84.6,23,90.6,0,6-23-86.7-4.8-86.7-4.8,0,0,93.5-29.1,77.9-48.6s-84.6,42-84.6,42c0,0,78.3-58,64.1-73.5-14.2-15.6-69.6,69.3-69.6,69.3,0,0,54-88.8,30.3-93.8-23.7-5-41,95.2-41,95.2,0,0,14.2-110.1-15.8-98.4-30,11.7,8.6,101.1,8.6,101.1,0,0-46-88.8-65.1-76.7-19.1,12.1,60,85.3,60,85.3,0,0-68.9-64.5-87.3-51s82.9,53.3,82.9,53.3c0,0-89.8-22.2-93.7,2.3-3.8,24.5,90.4,8.6,90.4,8.6h0Z" />

              {/* 중심 */}
              <path fill="#f77e3c" d="M197.6,177.2s-10.8-26.3,2.3-29.4c13.1-3.2,3.3,31.6,3.1,30.2-.3-1.4,6.2-26.1,22.4-21.8,16.2,4.3-19.1,23.9-19.1,23.9,0,0,15.9-11.4,27.6-3.2,11.8,8.1-26.3,7.1-26.3,7.1,0,0,22-1.7,23.5,11.9,1.5,13.6-24.4-10-24.4-10,0,0,19.2,22.3,6.9,28.2-12.3,5.9-11.2-26.8-11.2-26.8,0,0,1.9,24.4-10.7,22.7-12.6-1.7,7.3-22.7,7.3-22.7,0,0-20.3,17-22.4,5.4-2.1-11.6,18.4-8.2,18.4-8.2,0,0-29.6-7.1-21.5-19s23.9,11.8,23.9,11.8h0Z" />
            </g>
          </g>
        )}
      </svg>
    </div>
  );
}
