"use client";

import { useTransition } from "react";

/**
 * "오늘 다시 보지 않기" 버튼 (클라이언트).
 * 서버 액션으로 쿠키를 저장하면 페이지 재검증을 통해 배너가 자동으로 사라진다.
 * 액션 호출 중엔 useTransition 으로 disabled 처리해 중복 클릭을 막는다.
 */
export default function DismissForTodayButton({
  dismissAction,
}: {
  dismissAction: () => Promise<void>;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await dismissAction();
        })
      }
      className="rounded-full bg-white/70 px-3 py-1 text-[11px] text-brown-mid transition-colors hover:bg-white hover:text-brown-dark disabled:opacity-50"
    >
      오늘 다시 보지 않기
    </button>
  );
}
