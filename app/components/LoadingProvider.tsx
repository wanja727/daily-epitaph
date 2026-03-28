"use client";

import { createContext, useContext, useTransition } from "react";
import Spinner from "./Spinner";

interface LoadingCtx {
  isPending: boolean;
  /** 서버 액션·라우터 전환을 감싸면 자동으로 로딩 오버레이 표시 */
  startTransition: (fn: () => Promise<void>) => void;
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
  const [isPending, startTransition] = useTransition();

  return (
    <Ctx.Provider value={{ isPending, startTransition }}>
      {children}

      {/* 글로벌 로딩 오버레이 */}
      {isPending && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
          <Spinner size={32} className="text-olive" />
        </div>
      )}
    </Ctx.Provider>
  );
}
