"use client";

import { useState, useOptimistic, useTransition, useRef, useEffect } from "react";
import { toggleReaction } from "./actions";
import {
  REACTION_TYPES,
  type ReactionType,
} from "@/lib/utils/constants";

interface Epitaph {
  id: string;
  yesterday: string;
  today: string;
  userId: string;
  nickname: string | null;
  cellId: string | null;
  updatedAt: Date;
  reactions: Record<string, number>;
  myReaction: string | null;
}

function Pill({
  children,
  tone = "default",
  active = false,
  onClick,
}: {
  children: React.ReactNode;
  tone?: "default" | "green" | "rose" | "gold";
  active?: boolean;
  onClick?: () => void;
}) {
  const tones = {
    default: active ? "bg-sand text-brown" : "bg-sand/60 text-brown-mid",
    green: active
      ? "bg-[#DCE5D6] text-[#516047]"
      : "bg-[#DCE5D6]/60 text-[#516047]",
    rose: "bg-rose-light text-[#7A5858]",
    gold: "bg-gold-light text-[#7A6841]",
  };
  const Component = onClick ? "button" : "span";
  return (
    <Component
      onClick={onClick}
      className={`inline-flex rounded-full px-3 py-1 text-xs ${tones[tone]} transition-colors`}
    >
      {children}
    </Component>
  );
}

const reactionKeys = Object.keys(REACTION_TYPES) as ReactionType[];

function ReactionBar({
  epitaphId,
  reactions,
  myReaction,
}: {
  epitaphId: string;
  reactions: Record<string, number>;
  myReaction: string | null;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  const [optimistic, setOptimistic] = useOptimistic(
    { reactions, myReaction },
    (state, chosen: ReactionType) => {
      const prev = state.myReaction;
      const next: Record<string, number> = { ...state.reactions };

      if (prev === chosen) {
        // 취소
        next[chosen] = Math.max((next[chosen] ?? 0) - 1, 0);
        return { reactions: next, myReaction: null };
      }
      // 교체 or 새 반응
      if (prev) {
        next[prev] = Math.max((next[prev] ?? 0) - 1, 0);
      }
      next[chosen] = (next[chosen] ?? 0) + 1;
      return { reactions: next, myReaction: chosen };
    },
  );
  const [, startTransition] = useTransition();

  // 바깥 클릭 시 picker 닫기
  useEffect(() => {
    if (!pickerOpen) return;
    function onDown(e: MouseEvent | TouchEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, [pickerOpen]);

  function handleSelect(type: ReactionType) {
    setPickerOpen(false);
    startTransition(async () => {
      setOptimistic(type);
      await toggleReaction(epitaphId, type);
    });
  }

  // 카운트가 있는 반응만 모으기
  const activeReactions = reactionKeys.filter(
    (t) => (optimistic.reactions[t] ?? 0) > 0,
  );

  return (
    <div className="relative" ref={pickerRef}>
      <div className="flex items-center gap-1.5 flex-wrap">
        {/* 기존 공감 표시 */}
        {activeReactions.map((type) => {
          const { emoji } = REACTION_TYPES[type];
          const count = optimistic.reactions[type] ?? 0;
          const isMine = optimistic.myReaction === type;
          return (
            <button
              key={type}
              type="button"
              onClick={() => handleSelect(type)}
              className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs transition-colors ${
                isMine
                  ? "bg-[#E8DFD0] text-brown-dark"
                  : "bg-sand/40 text-brown-light"
              }`}
            >
              <span className="text-sm">{emoji}</span>
              <span className="font-medium">{count}</span>
            </button>
          );
        })}

        {/* + 공감하기 버튼 */}
        {!optimistic.myReaction && (
          <button
            type="button"
            onClick={() => setPickerOpen((v) => !v)}
            className="flex items-center gap-1 rounded-full px-3 py-1 text-xs bg-sand/40 text-brown-light hover:bg-sand/70 hover:text-brown-mid transition-colors"
          >
            <span className="text-sm">+</span>
            <span>공감하기</span>
          </button>
        )}
      </div>

      {/* 반응 선택 피커 */}
      {pickerOpen && (
        <div className="absolute bottom-full left-0 mb-2 z-50 rounded-2xl border border-stone bg-white shadow-lg p-2 min-w-[180px]">
          {reactionKeys.map((type) => {
            const { emoji, label } = REACTION_TYPES[type];
            return (
              <button
                key={type}
                type="button"
                onClick={() => handleSelect(type)}
                className="flex items-center gap-2.5 w-full rounded-xl px-3 py-2 text-sm text-brown-dark hover:bg-sand/60 transition-colors"
              >
                <span className="text-lg">{emoji}</span>
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function FeedTabs({
  epitaphs,
  myCellId,
  myUserId,
  cellName,
  wroteToday,
}: {
  epitaphs: Epitaph[];
  myCellId: string | null;
  myUserId: string;
  cellName: string | null;
  wroteToday: boolean;
}) {
  const [filter, setFilter] = useState<"all" | "cell">("all");

  const filtered =
    filter === "cell" && myCellId
      ? epitaphs.filter((e) => e.cellId === myCellId)
      : epitaphs;

  return (
    <div className="space-y-4">
      {/* 필터 탭 */}
      <div className="flex gap-2 overflow-auto pb-1">
        <Pill
          tone="green"
          active={filter === "all"}
          onClick={() => setFilter("all")}
        >
          전체 {epitaphs.length > 0 && `(${epitaphs.length})`}
        </Pill>
        {myCellId && (
          <Pill active={filter === "cell"} onClick={() => setFilter("cell")}>
            {cellName ?? "우리 셀"}
          </Pill>
        )}
      </div>

      {/* 오늘 미작성 안내 */}
      {!wroteToday && (
        <div className="rounded-[28px] border border-stone bg-white/70 backdrop-blur-sm p-5 text-center space-y-2">
          <p className="text-sm text-brown-dark font-medium">
            오늘의 기록을 아직 작성하지 않았어요
          </p>
          <p className="text-xs text-brown-light">
            + 버튼을 눌러 작성을 시작해보세요
          </p>
        </div>
      )}

      {/* 리스트 */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-brown-light text-sm">
          아직 오늘의 기록을 작성한 분이 없어요
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((e) => (
            <div
              key={e.id}
              className="rounded-[28px] border border-stone bg-white/70 backdrop-blur-sm shadow-sm p-4"
            >
              {/* 닉네임 + 작성시간 + 뱃지 */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-brown-dark">
                    {e.nickname ?? "익명"}
                  </div>
                  <div className="text-[11px] text-brown-light mt-0.5">
                    {new Date(e.updatedAt).toLocaleTimeString("ko-KR", {
                      timeZone: "Asia/Seoul",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
                {e.userId === myUserId && <Pill tone="gold">나</Pill>}
              </div>

              {/* 두 섹션 */}
              <div className="mt-4 grid gap-3">
                <div className="rounded-2xl bg-[#F7F1E7] p-3">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-brown-light">
                    어제를 돌아보며
                  </div>
                  <p className="mt-2 text-sm leading-6 text-brown-mid whitespace-pre-line">
                    {e.yesterday}
                  </p>
                </div>

                <div className="rounded-2xl bg-sage-light p-3">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-[#6C7A62]">
                    오늘을 기대하며
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[#4D5B46] whitespace-pre-line">
                    {e.today}
                  </p>
                </div>
              </div>

              {/* 공감 반응 */}
              <div className="mt-3 flex justify-end">
                <ReactionBar
                  epitaphId={e.id}
                  reactions={e.reactions}
                  myReaction={e.myReaction}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
