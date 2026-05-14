import Link from "next/link";

/**
 * 40일차(마지막 날) 전용 안내 배너 (서버 컴포넌트).
 * - Blooming Week 배너를 대체하여 메인 화면 상단에 노출
 * - 마지막 날 한정 꽃에 대한 궁금증 유발 + 캠프1 감사 메시지 + 서비스 종료 안내
 */
export default function FinalDayBanner() {
  return (
    <div className="relative overflow-hidden rounded-3xl border-2 border-gold bg-linear-to-br from-rose/15 via-white/85 to-gold/20 p-5 shadow-sm">
      {/* 글로우 */}
      <div className="pointer-events-none absolute -top-10 -left-10 h-36 w-36 rounded-full bg-gold/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-8 -right-8 h-28 w-28 rounded-full bg-rose/25 blur-2xl" />

      <div className="relative space-y-4">
        {/* 마지막 날 안내 + 꽃 티저 */}
        <div>
          <div className="text-[11px] uppercase tracking-[0.22em] text-olive">
            Final Day · Day 40
          </div>
          <h3 className="mt-1 text-lg font-heading font-bold text-brown-dark">
            오늘은 빈무덤 마지막 날입니다 🌸
          </h3>
          <p className="mt-1.5 text-sm text-brown-mid leading-relaxed">
            오늘만 만날 수 있는{" "}
            <span className="font-heading font-bold text-brown-dark">
              특별한 꽃
            </span>
            이 기다리고 있어요.
            <br />
            꽃밭으로 가서 직접 확인해보세요!
          </p>
        </div>

        {/* 캠프1 감사 메시지 */}
        <div className="rounded-2xl bg-white/65 px-4 py-3">
          <div className="text-[10px] uppercase tracking-[0.2em] text-olive">
            Thank you
          </div>
          <p className="mt-1 text-sm text-brown-dark leading-relaxed">
            지난 40일 동안 매일의 회개와 결단을 함께 새겨주신{" "}
            <span className="font-heading font-bold text-olive">
              캠프1 가족
            </span>{" "}
            여러분, 정말 수고 많으셨습니다.
          </p>
          <p className="mt-3 text-sm text-brown-dark leading-relaxed">
            우리가 남긴 한 줄 한 줄의 고백이
            <br />
            예수 그리스도의 십자가 앞에 우리의 죄를 못박는 시간이었고,
            <br />
            함께 새 사람을 입어가는 여정이었습니다. 🙏
          </p>
          <p className="mt-3 text-sm text-brown-dark leading-relaxed">
            이 40일의 은혜가 오늘로 멈추지 않고,
            <br />
            우리의 일상 속에서도 계속 이어지기를 축복합니다. 🤍
          </p>
        </div>

        {/* 서비스 종료 안내 */}
        <div className="border-t border-stone/60 pt-3">
          <div className="text-[10px] uppercase tracking-[0.2em] text-brown-light">
            Service Notice
          </div>
          <p className="mt-1 text-xs text-brown-mid leading-relaxed">
            오늘을 마지막으로{" "}
            <span className="font-medium text-brown-dark">
              신규 기록 작성은 종료
            </span>
            됩니다.
          </p>
          <p className="mt-2 text-xs text-brown-mid leading-relaxed">
            지금까지 남겨주신 기록은 일주일 동안 조회하실 수 있으며,
            <br />
            이후 서비스는 종료될 예정입니다.
          </p>
        </div>

        {/* CTA */}
        <Link
          href="/garden"
          className="block w-full rounded-3xl bg-olive py-3 text-center text-sm text-ivory shadow-sm transition-colors hover:bg-sage"
        >
          특별한 꽃 심으러 가기 →
        </Link>
      </div>
    </div>
  );
}
