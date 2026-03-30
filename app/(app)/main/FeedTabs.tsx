"use client";

import { useState, useOptimistic, useTransition } from "react";
import { toggleAmen } from "./actions";

interface Epitaph {
  id: string;
  yesterday: string;
  today: string;
  userId: string;
  nickname: string | null;
  cellId: string | null;
  updatedAt: Date;
  amenCount: number;
  amened: boolean;
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

function AmenButton({
  epitaphId,
  amenCount,
  amened,
}: {
  epitaphId: string;
  amenCount: number;
  amened: boolean;
}) {
  const [optimistic, setOptimistic] = useOptimistic(
    { amenCount, amened },
    (state) => ({
      amened: !state.amened,
      amenCount: state.amened
        ? Math.max(state.amenCount - 1, 0)
        : state.amenCount + 1,
    })
  );
  const [, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      setOptimistic(null);
      await toggleAmen(epitaphId);
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs transition-colors ${
        optimistic.amened
          ? "bg-[#E8DFD0] text-brown-dark"
          : "bg-sand/50 text-brown-light hover:bg-sand hover:text-brown-mid"
      }`}
    >
      <span className="text-sm">{optimistic.amened ? "🙏" : "🤲"}</span>
      <span>아멘</span>
      {optimistic.amenCount > 0 && (
        <span className="font-medium">{optimistic.amenCount}</span>
      )}
    </button>
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
            + 버튼을 눌러 오늘을 기록해보세요
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
              {/* 닉네임 + 뱃지 */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-brown-dark">
                    {e.nickname ?? "익명"}
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

              {/* 아멘 */}
              <div className="mt-3 flex justify-end">
                <AmenButton
                  epitaphId={e.id}
                  amenCount={e.amenCount}
                  amened={e.amened}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
