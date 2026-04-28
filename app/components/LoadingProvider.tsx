"use client";

import { createContext, useContext, useState, useTransition } from "react";
import Spinner from "./Spinner";

interface LoadingCtx {
  isPending: boolean;
  /** 서버 액션·라우터 전환을 감싸면 자동으로 로딩 오버레이 표시 */
  startTransition: (fn: () => Promise<void>, opts?: { message?: string }) => void;
}

const Ctx = createContext<LoadingCtx | null>(null);

export function useLoading() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useLoading must be inside LoadingProvider");
  return ctx;
}

export default function LoadingProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isPending, startReact] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function startTransition(
    fn: () => Promise<void>,
    opts?: { message?: string }
  ) {
    setMessage(opts?.message ?? null);
    startReact(async () => {
      try {
        await fn();
      } finally {
        setMessage(null);
      }
    });
  }

  return (
    <Ctx.Provider value={{ isPending, startTransition }}>
      {children}

      {/* 글로벌 로딩 오버레이 */}
      {isPending && (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-4 bg-ivory/60 backdrop-blur-[2px]">
          <Spinner size={32} className="text-olive" />
          {message && (
            <p className="text-center px-8 text-sm leading-6 text-brown-dark whitespace-pre-line">
              {message}
            </p>
          )}
        </div>
      )}
    </Ctx.Provider>
  );
}
