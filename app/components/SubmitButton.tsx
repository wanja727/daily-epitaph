"use client";

import { useFormStatus } from "react-dom";
import Spinner from "./Spinner";

/** 서버 액션 폼에서 사용하는 제출 버튼 — pending 상태 자동 감지 */
export default function SubmitButton({
  children,
  pendingText,
  className = "",
}: {
  children: React.ReactNode;
  pendingText?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={`${className} disabled:opacity-50`}
    >
      {pending ? (
        <span className="inline-flex items-center justify-center gap-2">
          <Spinner size={14} />
          {pendingText ?? children}
        </span>
      ) : (
        children
      )}
    </button>
  );
}
