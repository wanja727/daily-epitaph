import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="pb-8">
      {/* ── 히어로 영역 ── */}
      <div className="relative h-[400px] overflow-hidden">
        {/* 새벽빛 그라데이션 */}
        <div className="absolute inset-0 bg-linear-to-b from-[#F7ECCE] via-[#F6F1E7] to-[#E5E1D2]" />

        {/* 글로우 */}
        <div className="absolute top-10 left-1/2 -translate-x-1/2 h-40 w-40 rounded-full bg-gold/40 blur-3xl" />

        {/* 하단 지형 */}
        <div className="absolute bottom-0 left-0 right-0 h-[35%] bg-stone rounded-t-[36px]" />

        {/* 무덤 아치 — 지형 위로 올림 */}
        <div className="absolute bottom-[20%] left-1/2 -translate-x-1/2 w-48 h-28 bg-[#8C7A69] rounded-t-[120px]" />
        {/* 빈 무덤 입구 (빛) */}
        <div className="absolute bottom-[22%] left-1/2 -translate-x-1/2 translate-y-4 w-16 h-16 bg-ivory rounded-full shadow-inner" />
        <div className="absolute bottom-[22%] left-1/2 -translate-x-1/2 translate-y-4 w-24 h-24 bg-gold/15 rounded-full blur-xl" />

        {/* 텍스트 */}
        <div className="relative z-10 px-6 pt-12">
          <span className="inline-flex rounded-full px-3 py-1 text-xs bg-gold-light text-[#7A6841]">
            40일 여정
          </span>
          <h1 className="mt-4 text-[32px] leading-[1.05] font-heading font-bold text-brown-dark">
            빈 무덤 프로젝트를
            <br />
            시작하며
          </h1>
          <p className="mt-3 text-sm text-brown-mid">
            매일 나는 죽고, 예수로 사는 삶의 실전편
          </p>
        </div>
      </div>

      <div className="px-5 space-y-4 -mt-4 relative z-10">
        {/* ── 본문 카드 ── */}
        <div className="rounded-[28px] border border-stone bg-[#FAF6EF]/90 backdrop-blur-sm shadow-sm p-5 space-y-6">
          {/* 섹션 1 */}
          <div className="space-y-4">
            <h3 className="text-lg font-heading font-bold text-brown-dark">
              오늘도 이어지는 <span className="text-olive">부활</span>의 능력
            </h3>

            <div className="space-y-4 text-sm text-brown-mid leading-7">
              <p>
                2천여 년 전 예수님의 부활은
                <br />
                예수 그리스도를 믿음으로 구원받은 사람들에게
                <br />
                <span className="font-bold text-brown-dark">
                  오늘도 동일한 능력
                </span>
                으로 역사합니다.
              </p>
              <p>
                우리의 죄와 연약함이
                <br />
                그리스도와 함께{" "}
                <span className="font-bold text-brown-dark">
                  십자가에 못 박히고
                </span>
                <br />
                <span className="font-bold text-brown-dark">
                  그분의 부활과 연합
                </span>
                하는 과정을 통해
              </p>
              <p>
                우리의 옛사람은 어느새 자취를 감추고
                <br />
                <span className="font-bold text-brown-dark">새사람</span>
                의 모습이 갈수록 뚜렷하게 나타날 줄로
                <br />
                믿습니다.
              </p>
            </div>
          </div>

          {/* 구분선 */}
          <div className="border-t border-stone/50" />

          {/* 섹션 2 */}
          <div className="space-y-4">
            <h3 className="text-lg font-heading font-bold text-brown-dark">
              죽음에서 <span className="text-olive">생명</span>으로의 전환
            </h3>

            <div className="space-y-4 text-sm text-brown-mid leading-7">
              <p>
                부활의 상징인{" "}
                <span className="font-bold text-brown-dark">빈 무덤</span>
                이라는 공간에서
                <br />
                <span className="font-bold text-brown-dark">
                  나의 죽음이 예수님의 생명으로 전환
                </span>
                되기를
                <br />
                기대하는 마음으로
                <br />
                이번{" "}
                <span className="font-bold text-brown-dark">
                  빈 무덤 프로젝트
                </span>
                를 시작합니다.
              </p>
              <p>
                매일매일{" "}
                <span className="font-bold text-brown-dark">
                  나는 죽고, 예수로 사는 삶의 실전편
                </span>
                이
                <br />
                이번 프로젝트를 통해 실제적으로 일어나기를
                <br />
                소원합니다.
              </p>
              <p>
                이번 40일의 여정을 통해
                <br />
                예수님의 생명이 우리 안에 충만히 거하시고
                <br />
                내 대신 주님이 사시는 거룩한 변화가
                <br />
                있기를 사모합니다.
              </p>
            </div>
          </div>
        </div>

        {/* ── 말씀 강조 카드 ── */}
        <div className="rounded-[28px] border border-gold/30 bg-gold-light/50 shadow-sm p-5 text-center space-y-3">
          <p className="text-[15px] font-heading font-bold text-brown-dark leading-7">
            &ldquo;만일 우리가 그리스도와 함께 죽었으면
            <br />
            또한 그와 함께 살 줄을 믿노니&rdquo;
          </p>
          <p className="text-xs text-brown-mid tracking-wide">로마서 6:8</p>
        </div>

        {/* ── 하단 CTA 버튼 ── */}
        <Link
          href="/write"
          className="block w-full rounded-3xl bg-olive py-4 text-center text-sm text-ivory shadow-sm transition-colors hover:bg-sage"
        >
          오늘의 기록 시작하기
        </Link>
      </div>
    </div>
  );
}
