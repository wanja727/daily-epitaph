"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useTransition,
} from "react";
import Spinner from "./Spinner";

interface LoadingCtx {
  /** 로딩 오버레이를 수동으로 켜기 */
  showLoading: () => void;
  /** 로딩 오버레이를 수동으로 끄기 */
  hideLoading: () => void;
  /** 비동기 작업을 실행하면서 자동으로 로딩 표시 */
  withLoading: <T>(fn: () => Promise<T>) => Promise<T>;
  /** React transition 기반 — 서버 액션·라우터 전환용 */
  isPending: boolean;
  startTransition: (fn: () => void) => void;
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
  const [manualCount, setManualCount] = useState(0);
  const [isPending, startTransition] = useTransition();

  const showLoading = useCallback(() => setManualCount((c) => c + 1), []);
  const hideLoading = useCallback(() => setManualCount((c) => Math.max(0, c - 1)), []);

  const withLoading = useCallback(
    async <T,>(fn: () => Promise<T>): Promise<T> => {
      setManualCount((c) => c + 1);
      try {
        return await fn();
      } finally {
        setManualCount((c) => Math.max(0, c - 1));
      }
    },
    []
  );

  const isLoading = manualCount > 0 || isPending;

  return (
    <Ctx.Provider
      value={{ showLoading, hideLoading, withLoading, isPending, startTransition }}
    >
      {children}

      {/* 글로벌 로딩 오버레이 */}
      {isLoading && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-ivory/60 backdrop-blur-[2px]">
          <div className="flex flex-col items-center gap-3">
            <Spinner size={32} className="text-olive" />
          </div>
        </div>
      )}
    </Ctx.Provider>
  );
}
