"use client";

import { useState } from "react";
import { upsertEpitaph } from "./actions";
import { useLoading } from "@/app/components/LoadingProvider";

export default function WriteForm({
  defaultYesterday,
  defaultToday,
  isEdit,
}: {
  defaultYesterday: string;
  defaultToday: string;
  isEdit: boolean;
}) {
  const [yesterday, setYesterday] = useState(defaultYesterday);
  const [today, setToday] = useState(defaultToday);
  const [submitting, setSubmitting] = useState(false);
  const { withLoading } = useLoading();

  async function handleSubmit(formData: FormData) {
    setSubmitting(true);
    await withLoading(() => upsertEpitaph(formData));
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      {/* 어제 돌아보기 — warm 카드 */}
      <div className="rounded-[28px] border border-stone bg-white/70 backdrop-blur-sm shadow-sm p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.18em] text-brown-light">
              어제를 돌아보며
            </div>
            <div className="mt-1 text-lg font-heading font-bold text-brown-dark">
              무엇을 묻어야 하나요?
            </div>
          </div>
          <span className="inline-flex rounded-full px-3 py-1 text-xs bg-sand text-brown-mid">
            회개
          </span>
        </div>
        <textarea
          name="yesterday"
          value={yesterday}
          onChange={(e) => setYesterday(e.target.value)}
          placeholder="내려놓고 싶은 욕망, 두려움, 교만, 상처, 불순종을 그리스도와 함께 솔직히 적어보세요."
          rows={6}
          required
          className="mt-4 w-full resize-none rounded-3xl border border-stone bg-[#FCFAF6] px-4 py-4 text-sm text-brown leading-7 placeholder:text-brown-light/70 focus:outline-none focus:ring-2 focus:ring-olive/30"
        />
      </div>

      {/* 오늘 기대함 — green 카드 */}
      <div className="rounded-[28px] border border-stone bg-white/70 backdrop-blur-sm shadow-sm p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.18em] text-[#6B7B61]">
              오늘을 기대하며
            </div>
            <div className="mt-1 text-lg font-heading font-bold text-brown-dark">
              예수로 어떻게 살까요?
            </div>
          </div>
          <span className="inline-flex rounded-full px-3 py-1 text-xs bg-[#DCE5D6] text-[#516047]">
            새 순종
          </span>
        </div>
        <textarea
          name="today"
          value={today}
          onChange={(e) => setToday(e.target.value)}
          placeholder="오늘의 구체적인 결단: 기도, 절제, 화해의 행동, 숨겨진 섬김, 혹은 신뢰의 한 걸음을 적어보세요."
          rows={6}
          required
          className="mt-4 w-full resize-none rounded-3xl border border-stone bg-[#F6FAF2] px-4 py-4 text-sm text-brown leading-7 placeholder:text-brown-light/70 focus:outline-none focus:ring-2 focus:ring-olive/30"
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-3xl bg-olive py-4 text-sm text-ivory shadow-sm transition-colors hover:bg-sage disabled:opacity-50"
      >
        {isEdit ? "수정하기" : "오늘의 고백 새기기"}
      </button>

      {!isEdit && (
        <p className="text-center text-xs text-brown-light">
          작성 완료 시 물뿌리개 1개를 받아요
        </p>
      )}
    </form>
  );
}
