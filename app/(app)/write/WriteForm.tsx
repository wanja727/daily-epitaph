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
  const MAX_LENGTH = 2000;
  const [yesterday, setYesterday] = useState(defaultYesterday);
  const [today, setToday] = useState(defaultToday);
  const { isPending, startTransition } = useLoading();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await upsertEpitaph(formData);
    });
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      {/* 어제 돌아보기 — warm 카드 */}
      <div className="rounded-[28px] border border-stone bg-white/70 backdrop-blur-sm shadow-sm p-4">
        <div className="flex items-center justify-between">
          <div className="text-xs uppercase tracking-[0.18em] text-brown-light">
            어제를 돌아보며
          </div>
          <span className="shrink-0 whitespace-nowrap inline-flex rounded-full px-3 py-1 text-xs bg-sand text-brown-mid">
            회개
          </span>
        </div>
        <div className="mt-1 text-lg font-heading font-bold text-brown-dark">
          십자가에 못 박을 것은 무엇인가요?
        </div>
        <textarea
          name="yesterday"
          value={yesterday}
          onChange={(e) => setYesterday(e.target.value.slice(0, MAX_LENGTH))}
          maxLength={MAX_LENGTH}
          placeholder="내 안의 두려움, 시기, 교만, 거짓, 연약함, 불신, 불순종 등을 솔직히 고백해 보세요."
          rows={6}
          required
          className="mt-4 w-full resize-none rounded-3xl border border-stone bg-[#FCFAF6] px-4 py-4 text-sm text-brown leading-7 placeholder:text-brown-light/70 focus:outline-none focus:ring-2 focus:ring-olive/30"
        />
      </div>

      {/* 오늘 기대함 — green 카드 */}
      <div className="rounded-[28px] border border-stone bg-white/70 backdrop-blur-sm shadow-sm p-4">
        <div className="flex items-center justify-between">
          <div className="text-xs uppercase tracking-[0.18em] text-[#6B7B61]">
            오늘을 기대하며
          </div>
          <span className="shrink-0 whitespace-nowrap inline-flex items-center gap-0.5 rounded-full px-1.5 py-1 text-xs bg-[#DCE5D6] text-[#516047]">
            감사와 결단
            <span className="inline-flex items-center rounded-full bg-[#516047] px-1.5 py-px text-[9px] font-bold tracking-wide text-[#F6FAF2]">
              NEW
            </span>
          </span>
        </div>
        <div className="mt-1 text-lg font-heading font-bold text-brown-dark">
          어떻게 예수님과 함께 살까요?
        </div>
        <p className="mt-2 text-xs text-[#6B7B61]">
          ✨ 이제 결단과 함께 <span className="font-semibold">감사</span>도
          적어보세요
        </p>
        <textarea
          name="today"
          value={today}
          onChange={(e) => setToday(e.target.value.slice(0, MAX_LENGTH))}
          maxLength={MAX_LENGTH}
          placeholder="새 생명 주신 주님께 감사하며 믿음, 용서, 인내, 절제, 나눔 등 오늘의 결단을 짧게 적어보세요."
          rows={6}
          required
          className="mt-4 w-full resize-none rounded-3xl border border-stone bg-[#F6FAF2] px-4 py-4 text-sm text-brown leading-7 placeholder:text-brown-light/70 focus:outline-none focus:ring-2 focus:ring-olive/30"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-3xl bg-olive py-4 text-sm text-ivory shadow-sm transition-colors hover:bg-sage disabled:opacity-50"
      >
        {isEdit ? "수정하기" : "오늘의 기록 새기기"}
      </button>

      {!isEdit && (
        <p className="text-center text-xs text-brown-light">
          작성 완료 시 물뿌리개 1개를 받아요
        </p>
      )}
    </form>
  );
}
