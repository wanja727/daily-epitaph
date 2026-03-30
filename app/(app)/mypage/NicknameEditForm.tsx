"use client";

import { useState } from "react";
import { updateNickname } from "./actions";
import { useLoading } from "@/app/components/LoadingProvider";
import NicknameField from "@/app/components/NicknameField";

export default function NicknameEditForm({
  currentNickname,
  onClose,
}: {
  currentNickname: string;
  onClose: () => void;
}) {
  const [nickname, setNickname] = useState(currentNickname);
  const [error, setError] = useState("");
  const { isPending, startTransition } = useLoading();

  function handleSubmit(formData: FormData) {
    setError("");
    startTransition(async () => {
      const result = await updateNickname(formData);
      if (result?.error) {
        setError(result.error);
      } else {
        onClose();
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 bg-ivory">
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="w-full max-w-sm space-y-8">
          <div className="text-center space-y-3">
            <div className="text-4xl">✏️</div>
            <h1 className="text-xl font-bold text-brown-dark">닉네임 변경</h1>
            <p className="text-sm text-brown-light">
              오늘의 기록 작성 시 표시되는 이름을 변경합니다
            </p>
          </div>

          <form action={handleSubmit} className="space-y-5">
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
              저장하기
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="w-full py-3.5 rounded-[20px] border border-stone text-brown-mid hover:bg-sand transition-colors disabled:opacity-50"
            >
              돌아가기
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
