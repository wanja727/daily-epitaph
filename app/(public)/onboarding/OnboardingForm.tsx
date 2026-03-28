"use client";

import { useState } from "react";
import { completeOnboarding } from "./actions";
import { generateFlowerNickname } from "@/lib/utils/flower-names";
import { useLoading } from "@/app/components/LoadingProvider";

export default function OnboardingForm({
  suggestedNickname,
  kakaoName,
}: {
  suggestedNickname: string;
  kakaoName: string;
}) {
  const [nickname, setNickname] = useState(suggestedNickname);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { withLoading } = useLoading();

  function reroll() {
    setNickname(generateFlowerNickname());
  }

  async function handleSubmit(formData: FormData) {
    setError("");
    setSubmitting(true);
    const result = await withLoading(() => completeOnboarding(formData));
    if (result?.error) {
      setError(result.error);
      setSubmitting(false);
    }
  }

  return (
    <form action={handleSubmit} className="space-y-5">
      {/* 카카오 닉네임 표시 */}
      {kakaoName && (
        <div className="text-xs text-brown-light text-center">
          카카오 계정: {kakaoName}
        </div>
      )}

      {/* 실명 */}
      <div className="rounded-[28px] border border-stone bg-white/70 backdrop-blur-sm shadow-sm p-4 space-y-3">
        <label className="text-sm font-medium text-brown-dark">
          실명 <span className="text-rose-deep">*</span>
        </label>
        <input
          name="realName"
          type="text"
          placeholder="셀 명단에 등록된 이름을 입력하세요"
          required
          className="w-full rounded-3xl bg-[#FCFAF6] border border-stone px-4 py-3 text-brown placeholder:text-brown-light/60 focus:outline-none focus:ring-2 focus:ring-olive/30 text-sm"
        />
        <p className="text-xs text-brown-light">
          입력한 이름으로 셀이 자동 배정됩니다
        </p>
      </div>

      {/* 닉네임 */}
      <div className="rounded-[28px] border border-stone bg-white/70 backdrop-blur-sm shadow-sm p-4 space-y-3">
        <label className="text-sm font-medium text-brown-dark">닉네임</label>
        <div className="flex gap-2">
          <input
            name="nickname"
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            className="flex-1 rounded-3xl bg-[#FCFAF6] border border-stone px-4 py-3 text-brown placeholder:text-brown-light/60 focus:outline-none focus:ring-2 focus:ring-olive/30 text-sm"
          />
          <button
            type="button"
            onClick={reroll}
            className="px-4 rounded-3xl bg-sand border border-stone text-brown-mid hover:text-brown-dark hover:bg-[#E5DDD0] transition-colors text-lg"
            title="다시 생성"
          >
            🎲
          </button>
        </div>
        <p className="text-xs text-brown-light">
          묘비명 작성 시 표시되는 이름입니다
        </p>
      </div>

      {error && (
        <p className="text-sm text-rose-deep text-center">{error}</p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full py-3.5 rounded-[20px] bg-olive hover:bg-sage text-ivory font-semibold transition-colors disabled:opacity-50 shadow-sm"
      >
        시작하기
      </button>
    </form>
  );
}
