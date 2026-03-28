"use client";

import { useState } from "react";
import { completeOnboarding } from "./actions";
import { generateFlowerNickname } from "@/lib/utils/flower-names";

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

  function reroll() {
    setNickname(generateFlowerNickname());
  }

  async function handleSubmit(formData: FormData) {
    setError("");
    setSubmitting(true);
    const result = await completeOnboarding(formData);
    if (result?.error) {
      setError(result.error);
      setSubmitting(false);
    }
  }

  return (
    <form action={handleSubmit} className="space-y-5">
      {/* 카카오 닉네임 표시 */}
      {kakaoName && (
        <div className="text-xs text-warm-gray text-center">
          카카오 계정: {kakaoName}
        </div>
      )}

      {/* 실명 */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-brown">
          실명 <span className="text-rose">*</span>
        </label>
        <input
          name="realName"
          type="text"
          placeholder="셀 명단에 등록된 이름을 입력하세요"
          required
          className="w-full rounded-xl bg-white border border-warm-gray/50 px-4 py-3 text-brown placeholder:text-warm-gray focus:outline-none focus:ring-2 focus:ring-olive/40"
        />
        <p className="text-xs text-brown-light">
          입력한 이름으로 셀이 자동 배정됩니다
        </p>
      </div>

      {/* 닉네임 */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-brown">닉네임</label>
        <div className="flex gap-2">
          <input
            name="nickname"
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            className="flex-1 rounded-xl bg-white border border-warm-gray/50 px-4 py-3 text-brown placeholder:text-warm-gray focus:outline-none focus:ring-2 focus:ring-olive/40"
          />
          <button
            type="button"
            onClick={reroll}
            className="px-3 rounded-xl bg-white border border-warm-gray/50 text-brown-light hover:text-brown hover:bg-sage/10 transition-colors text-lg"
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
        <p className="text-sm text-rose text-center">{error}</p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full py-3.5 rounded-2xl bg-olive hover:bg-sage text-white font-semibold transition-colors disabled:opacity-50"
      >
        {submitting ? "설정 중..." : "시작하기"}
      </button>
    </form>
  );
}
