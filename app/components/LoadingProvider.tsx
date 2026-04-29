"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useTransition,
} from "react";
import { flushSync } from "react-dom";
import Spinner from "./Spinner";

interface LoadingCtx {
  isPending: boolean;
  /**
   * 서버 액션·라우터 전환을 감싸면 자동으로 로딩 오버레이 표시.
   * messages 가 있으면 카드형 오버레이(메시지 + 진행 바 + 경과초) 표시.
   * messages 가 여러 개면 messageIntervalSeconds 마다 순환(기본 5초),
   * 마지막 항목에 도달하면 거기 머무른다.
   */
  startTransition: (
    fn: () => Promise<void>,
    opts?: {
      messages?: string[];
      expectedSeconds?: number;
      messageIntervalSeconds?: number;
    }
  ) => void;
}

const Ctx = createContext<LoadingCtx | null>(null);

export function useLoading() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useLoading must be inside LoadingProvider");
  return ctx;
}

/**
 * 시간 기반 추정 진행 바.
 * Gemini 비스트리밍 응답이라 실제 진행률은 알 수 없으므로
 * expectedSeconds 기준 ease-out 으로 95% 까지 차오르고, 응답 도착 시 100%.
 */
function ProgressCard({
  messages,
  expectedSeconds,
  intervalSeconds,
}: {
  messages: string[];
  expectedSeconds: number;
  intervalSeconds: number;
}) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const id = setInterval(() => {
      setElapsed((Date.now() - start) / 1000);
    }, 200);
    return () => clearInterval(id);
  }, []);

  const t = elapsed / Math.max(expectedSeconds, 1);
  const progress = Math.min(95, 95 * (1 - Math.exp(-1.6 * t)));

  // intervalSeconds 마다 다음 메시지로. 마지막 도달 시 거기 머무름.
  const messageIdx = Math.min(
    Math.floor(elapsed / Math.max(intervalSeconds, 1)),
    messages.length - 1
  );
  const currentMessage = messages[messageIdx] ?? "";

  return (
    <div className="pointer-events-auto flex flex-col items-center gap-3 rounded-2xl bg-white px-6 py-5 shadow-xl mx-6 w-[280px] max-w-[calc(100vw-3rem)]">
      <Spinner size={28} className="text-olive" />
      <p
        key={messageIdx}
        className="loading-msg text-center text-sm leading-6 text-brown-dark whitespace-pre-line min-h-[3rem] flex items-center"
      >
        {currentMessage}
      </p>
      <div className="w-full h-1.5 rounded-full bg-stone/60 overflow-hidden">
        <div
          className="h-full bg-olive transition-[width] duration-200"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="text-[11px] text-brown-light">
        {Math.floor(elapsed)}초 / 약 {expectedSeconds}초
      </p>
    </div>
  );
}

export default function LoadingProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isPending, startReact] = useTransition();
  const [messages, setMessages] = useState<string[]>([]);
  const [expectedSeconds, setExpectedSeconds] = useState(20);
  const [intervalSeconds, setIntervalSeconds] = useState(5);

  function startTransition(
    fn: () => Promise<void>,
    opts?: {
      messages?: string[];
      expectedSeconds?: number;
      messageIntervalSeconds?: number;
    }
  ) {
    // form action 내부 transition 안에서 setState 가 deferred 되는 문제를
    // 방지하기 위해 flushSync 로 즉시 커밋한다.
    flushSync(() => {
      setMessages(opts?.messages ?? []);
      setExpectedSeconds(opts?.expectedSeconds ?? 20);
      setIntervalSeconds(opts?.messageIntervalSeconds ?? 5);
    });
    startReact(async () => {
      try {
        await fn();
      } finally {
        setMessages([]);
      }
    });
  }

  return (
    <Ctx.Provider value={{ isPending, startTransition }}>
      {children}

      {/* 글로벌 로딩 오버레이 — 배경에 블러/딤 적용하지 않음 */}
      {isPending && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none">
          {messages.length > 0 ? (
            <ProgressCard
              messages={messages}
              expectedSeconds={expectedSeconds}
              intervalSeconds={intervalSeconds}
            />
          ) : (
            <Spinner size={32} className="text-olive" />
          )}
        </div>
      )}
    </Ctx.Provider>
  );
}
