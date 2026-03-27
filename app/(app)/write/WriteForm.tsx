"use client";

import { useState } from "react";
import { upsertEpitaph } from "./actions";

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

  async function handleSubmit(formData: FormData) {
    setSubmitting(true);
    await upsertEpitaph(formData);
  }

  return (
    <form action={handleSubmit} className="space-y-6">
      {/* 어제 돌아보기 */}
      <div className="space-y-2">
        <p className="text-sm text-slate-300 leading-relaxed">
          어제의 내 모습을 돌아보며
          <br />
          <span className="text-accent-bright">
            나의 죄와 연약함을 십자가에 못 박아 보세요.
          </span>
        </p>
        <textarea
          name="yesterday"
          value={yesterday}
          onChange={(e) => setYesterday(e.target.value)}
          placeholder="어제를 돌아보며..."
          rows={4}
          required
          className="w-full resize-none rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-accent/50 text-sm leading-relaxed"
        />
      </div>

      {/* 오늘 기대함 */}
      <div className="space-y-2">
        <p className="text-sm text-slate-300 leading-relaxed">
          오늘도 내 삶에 새 생명을 주신 예수님께 감사하며,
          <br />
          <span className="text-accent-bright">
            하루를 기대하는 마음을 적어 보세요.
          </span>
        </p>
        <textarea
          name="today"
          value={today}
          onChange={(e) => setToday(e.target.value)}
          placeholder="오늘을 기대하며..."
          rows={4}
          required
          className="w-full resize-none rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-accent/50 text-sm leading-relaxed"
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full py-3.5 rounded-2xl bg-accent hover:bg-accent-bright text-white font-semibold transition-colors disabled:opacity-50"
      >
        {submitting
          ? "저장 중..."
          : isEdit
          ? "수정하기"
          : "묘비명 새기기 ✍️"}
      </button>

      {!isEdit && (
        <p className="text-center text-xs text-slate-500">
          작성 완료 시 물뿌리개 1개를 받아요 🚿
        </p>
      )}
    </form>
  );
}
