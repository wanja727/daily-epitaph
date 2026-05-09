"use client";

import { useState } from "react";

/**
 * 메인 화면 이벤트 배너 클라이언트 래퍼.
 * - BottomNav 바로 위에 고정 포지션 (본문은 일부 가려져도 OK)
 * - X 버튼: 로컬 state 만 변경 (이번 뷰에서만 숨김. 새로고침/재방문 시 다시 노출)
 *
 * "오늘 다시 보지 않기" 버튼은 EventBanner 의 footer 슬롯 안(자식)에 별도 client 컴포넌트로
 * 들어간다. 이 래퍼는 그 책임을 갖지 않는다.
 */
export default function MainEventBannerInner({
  children,
}: {
  children: React.ReactNode;
}) {
  const [closed, setClosed] = useState(false);

  if (closed) return null;

  return (
    <div
      className="fixed left-0 right-0 z-50 px-5 pointer-events-none"
      style={{ bottom: "calc(70px + env(safe-area-inset-bottom))" }}
    >
      <div className="relative mx-auto max-w-lg pointer-events-auto">
        {children}

        {/* X 버튼 — 카드 내부 우상단 (쿠키 저장 안 함, 일회성 닫기) */}
        <button
          type="button"
          onClick={() => setClosed(true)}
          aria-label="닫기"
          title="닫기"
          className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/70 text-brown-mid transition-colors hover:bg-white hover:text-brown-dark"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );
}
