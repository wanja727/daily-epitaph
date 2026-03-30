"use client";

import { useState } from "react";
import { completeOnboarding } from "./actions";
import { useLoading } from "@/app/components/LoadingProvider";
import NicknameField from "@/app/components/NicknameField";

export default function OnboardingForm({
  suggestedNickname,
  kakaoName,
}: {
  suggestedNickname: string;
  kakaoName: string;
}) {
  const [nickname, setNickname] = useState(suggestedNickname);
  const [error, setError] = useState("");
  const { isPending, startTransition } = useLoading();

  function handleSubmit(formData: FormData) {
    setError("");
    startTransition(async () => {
      const result = await completeOnboarding(formData);
      if (result?.error) {
        setError(result.error);
      }
    });
  }

  return (
    <form action={handleSubmit} className="space-y-5">
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

      <NicknameField
        nickname={nickname}
        onChange={setNickname}
        disabled={isPending}
      />

      {error && (
        <p className="text-sm text-rose-deep text-center">{error}</p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full py-3.5 rounded-[20px] bg-olive hover:bg-sage text-ivory font-semibold transition-colors disabled:opacity-50 shadow-sm"
      >
        시작하기
      </button>
    </form>
  );
}
