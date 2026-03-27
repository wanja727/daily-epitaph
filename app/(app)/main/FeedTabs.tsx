"use client";

import { useState } from "react";

interface Epitaph {
  id: string;
  yesterday: string;
  today: string;
  userId: string;
  nickname: string | null;
  cellId: string | null;
  updatedAt: Date;
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
      {/* 탭 */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilter("all")}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
            filter === "all"
              ? "bg-accent text-white"
              : "bg-white/5 text-slate-400 hover:bg-white/10"
          }`}
        >
          전체 {epitaphs.length > 0 && `(${epitaphs.length})`}
        </button>
        {myCellId && (
          <button
            onClick={() => setFilter("cell")}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === "cell"
                ? "bg-accent text-white"
                : "bg-white/5 text-slate-400 hover:bg-white/10"
            }`}
          >
            {cellName ?? "우리 셀"}
          </button>
        )}
      </div>

      {/* 오늘 미작성 안내 */}
      {!wroteToday && (
        <div className="rounded-2xl border border-accent/30 bg-accent/5 p-4 text-center space-y-1">
          <p className="text-sm text-accent-bright font-medium">
            오늘의 묘비명을 아직 작성하지 않았어요
          </p>
          <p className="text-xs text-slate-500">
            + 버튼을 눌러 오늘을 기록해보세요
          </p>
        </div>
      )}

      {/* 리스트 */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-500 text-sm">
          아직 오늘의 묘비명을 작성한 분이 없어요
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((e) => (
            <li
              key={e.id}
              className="rounded-2xl bg-white/[0.04] border border-white/[0.06] p-4 space-y-3"
            >
              {/* 닉네임 */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-300">
                  {e.nickname ?? "익명"}
                </span>
                {e.userId === myUserId && (
                  <span className="text-[10px] bg-accent/20 text-accent-bright px-1.5 py-0.5 rounded">
                    나
                  </span>
                )}
              </div>
              {/* 어제 */}
              <div className="space-y-1">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">
                  어제를 돌아보며
                </p>
                <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
                  {e.yesterday}
                </p>
              </div>
              {/* 오늘 */}
              <div className="space-y-1">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">
                  오늘을 기대하며
                </p>
                <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
                  {e.today}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
