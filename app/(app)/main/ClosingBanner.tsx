import Link from "next/link";

/**
 * 41일차 이후(작성 기간 종료 후) 메인 화면 상단 안내 배너.
 * 5/22 까지 기록 조회용으로 운영 후 서비스 종료 예정임을 알린다.
 * FinalDayBanner 와 같은 톤(금색/장미 그라데이션)을 유지해 마무리 분위기 이어감.
 */
export default function ClosingBanner() {
  return (
    <div className="relative overflow-hidden rounded-3xl border-2 border-gold bg-linear-to-br from-rose/15 via-white/85 to-gold/20 p-5 shadow-sm">
      {/* 글로우 */}
      <div className="pointer-events-none absolute -top-10 -left-10 h-36 w-36 rounded-full bg-gold/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-8 -right-8 h-28 w-28 rounded-full bg-rose/25 blur-2xl" />

      <div className="relative space-y-4">
        {/* 마무리 안내 */}
        <div>
          <div className="text-[11px] uppercase tracking-[0.22em] text-olive">
            Closing · Read-only Mode
          </div>
          <h3 className="mt-1 text-lg font-heading font-bold text-brown-dark">
            40일 여정이 마무리되었습니다 🕊️
          </h3>
          <p className="mt-1.5 text-sm text-brown-mid leading-relaxed">
            함께 새겨온 기록은 잠시 더 이곳에 머무릅니다.
            <br />
            지난 시간을 천천히 돌아보세요.
          </p>
        </div>

        {/* 감사 메시지 (FinalDayBanner 와 동일) */}
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

        {/* 종료 안내 */}
        <div className="border-t border-stone/60 pt-3">
          <div className="text-[10px] uppercase tracking-[0.2em] text-brown-light">
            Service Notice
          </div>
          <p className="mt-1 text-xs text-brown-mid leading-relaxed">
            <span className="font-medium text-brown-dark">5월 22일까지</span>{" "}
            기록 조회용으로 운영되며,
            <br />
            이후 서비스는 종료될 예정입니다.
          </p>
          <p className="mt-2 text-xs text-brown-mid leading-relaxed">
            소중한 기록은 마이페이지에서 PDF 로 저장하실 수 있어요.
          </p>
        </div>

        {/* CTA */}
        <Link
          href="/mypage"
          className="block w-full rounded-3xl bg-olive py-3 text-center text-sm text-ivory shadow-sm transition-colors hover:bg-sage"
        >
          마이페이지에서 내 기록 저장하기 →
        </Link>
      </div>
    </div>
  );
}
