"use client";

import { generateFlowerNickname } from "@/lib/utils/flower-names";

export default function NicknameField({
  nickname,
  onChange,
  disabled,
}: {
  nickname: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  function reroll() {
    onChange(generateFlowerNickname());
  }

  return (
    <div className="rounded-[28px] border border-stone bg-white/70 backdrop-blur-sm shadow-sm p-4 space-y-3">
      <label className="text-sm font-medium text-brown-dark">닉네임</label>
      <div className="flex gap-2">
        <input
          name="nickname"
          type="text"
          value={nickname}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="flex-1 rounded-3xl bg-[#FCFAF6] border border-stone px-4 py-3 text-brown placeholder:text-brown-light/60 focus:outline-none focus:ring-2 focus:ring-olive/30 text-sm disabled:opacity-50"
        />
        <button
          type="button"
          onClick={reroll}
          disabled={disabled}
          className="px-4 rounded-3xl bg-sand border border-stone text-brown-mid hover:text-brown-dark hover:bg-[#E5DDD0] transition-colors text-lg disabled:opacity-50"
          title="다시 생성"
        >
          🎲
        </button>
      </div>
      <p className="text-xs text-brown-light">
        오늘의 기록 작성 시 표시되는 이름입니다
      </p>
    </div>
  );
}
