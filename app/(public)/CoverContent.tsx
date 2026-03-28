"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function CoverContent() {
  const router = useRouter();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem("coverSeen")) {
      router.replace("/main");
      return;
    }
    setVisible(true);
  }, [router]);

  function handleEnter() {
    sessionStorage.setItem("coverSeen", "1");
    router.push("/main");
  }

  if (!visible) return null;

  return (
    <div
      onClick={handleEnter}
      className="min-h-screen bg-ivory relative overflow-hidden cursor-pointer select-none"
    >
      {/* 새벽빛 그라데이션 */}
      <div className="absolute inset-0 bg-linear-to-b from-[#F7ECCE] via-[#F6F1E7] to-[#E5E1D2]" />

      {/* 새벽빛 글로우 */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 h-48 w-48 rounded-full bg-gold/40 blur-3xl" />

      {/* 돌과 흙 — 하단 지형 */}
      <div className="absolute bottom-0 left-0 right-0 h-[46%] bg-stone rounded-t-[42px]" />

      {/* 무덤 아치 */}
      <div className="absolute bottom-[26%] left-1/2 -translate-x-1/2 w-56 h-32 bg-[#8C7A69] rounded-t-[140px]" />

      {/* 빈 무덤 입구 (빛) */}
      <div className="absolute bottom-[26%] left-1/2 -translate-x-1/2 translate-y-8 w-20 h-20 bg-ivory rounded-full shadow-inner" />

      {/* 콘텐츠 */}
      <div className="relative z-10 h-screen flex flex-col justify-between p-7 text-brown-dark max-w-lg mx-auto">
        {/* 상단 라벨 */}
        <div className="flex items-center justify-between text-xs tracking-[0.28em] uppercase opacity-70 pt-2">
          <span>Lent Journey</span>
          <span>Day 01</span>
        </div>

        {/* 타이틀 영역 */}
        <div className="pt-20">
          <span className="inline-flex rounded-full px-3 py-1 text-xs bg-gold-light text-[#7A6841]">
            quiet resurrection
          </span>
          <h1 className="mt-5 text-[42px] leading-[0.95] font-heading font-bold text-brown-dark">
            빈 무덤
            <br />
            프로젝트
          </h1>
          <p className="mt-5 text-[15px] leading-7 max-w-[280px] text-brown-mid">
            매일 그리스도와 함께 죽고,
            <br />
            예수로 사는 40일의 여정
          </p>
        </div>

        {/* 하단 카드 */}
        <div>
          <div className="rounded-[28px] border border-stone bg-white/60 backdrop-blur-sm shadow-sm p-5">
            <div className="text-xs uppercase tracking-[0.22em] text-brown-light">
              40-day spiritual journey
            </div>
            <p className="mt-3 text-sm leading-6 text-brown-mid">
              회개에서 새 생명으로, 매일의 묵상과 결단,
              <br />
              그리고 고요한 공동체의 성장을 함께 걸어갑니다.
            </p>
            <button className="mt-5 w-full rounded-[20px] bg-olive py-3 text-sm text-ivory shadow-sm">
              오늘을 시작하기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
