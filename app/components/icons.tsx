/**
 * 공통 stroke 기반 SVG 아이콘 세트.
 * 색상은 currentColor 를 따르므로 부모의 text-* 클래스로 제어한다.
 */

type IconProps = {
  className?: string;
};

const baseSvgProps = {
  xmlns: "http://www.w3.org/2000/svg",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

export function CandleIcon({ className }: IconProps) {
  return (
    <svg {...baseSvgProps} className={className} aria-hidden="true">
      {/* 불꽃 */}
      <path d="M12 3c1.6 1.7 2.2 3.2 2.2 4.3a2.2 2.2 0 0 1-4.4 0C9.8 6.2 10.4 4.7 12 3Z" />
      {/* 양초 몸통 */}
      <rect x="9" y="9" width="6" height="11" rx="1" />
      {/* 받침 */}
      <path d="M7 20h10" />
    </svg>
  );
}

export function SproutIcon({ className }: IconProps) {
  return (
    <svg {...baseSvgProps} className={className} aria-hidden="true">
      {/* 줄기 */}
      <path d="M12 20V11" />
      {/* 왼쪽 잎 */}
      <path d="M12 14C9 14 6.5 12 6 8c4 0 6 2.5 6 6Z" />
      {/* 오른쪽 잎 */}
      <path d="M12 11c0-3.5 2-6 6-6-.5 4-3 6-6 6Z" />
    </svg>
  );
}

export function SunriseIcon({ className }: IconProps) {
  return (
    <svg {...baseSvgProps} className={className} aria-hidden="true">
      {/* 떠오르는 해(반원) */}
      <path d="M6 17a6 6 0 0 1 12 0" />
      {/* 지평선 */}
      <path d="M3 20h18" />
      {/* 광선 */}
      <path d="M12 4v2" />
      <path d="M5.5 8.5l1.5 1.5" />
      <path d="M18.5 8.5l-1.5 1.5" />
    </svg>
  );
}

export function BookIcon({ className }: IconProps) {
  return (
    <svg {...baseSvgProps} className={className} aria-hidden="true">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}
