"use client";

import { useState, useOptimistic, useTransition, useRef, useEffect } from "react";
import {
  toggleReaction,
  toggleImpressionReaction,
  updateImpression,
} from "./actions";
import {
  REACTION_TYPES,
  type ReactionType,
} from "@/lib/utils/constants";
import MyRecommendation from "./MyRecommendation";
import { CandleIcon, CompassIcon, SproutIcon } from "@/app/components/icons";
import { REPENT_CATEGORY_LABELS } from "@/lib/utils/constants";

type RecommendationData = {
  themes: string[];
  situationTags: string[];
  emotionTags: string[];
  recommendations: Array<{ reference: string; reason: string; deepLinkUrl: string }>;
};

interface Epitaph {
  id: string;
  yesterday: string;
  today: string;
  repentCategories: string[];
  userId: string;
  nickname: string | null;
  cellId: string | null;
  updatedAt: Date;
  reactions: Record<string, number>;
  myReaction: string | null;
}

interface Impression {
  id: string;
  content: string;
  userId: string;
  nickname: string | null;
  cellId: string | null;
  createdAt: Date;
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
  targetId,
  reactions,
  myReaction,
  onToggle,
}: {
  targetId: string;
  reactions: Record<string, number>;
  myReaction: string | null;
  onToggle: (id: string, type: ReactionType) => Promise<unknown>;
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
      await onToggle(targetId, type);
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
        <div className="absolute bottom-full right-0 mb-2 z-50 rounded-2xl border border-stone bg-white shadow-lg p-2 min-w-[180px]">
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

function ImpressionCard({
  impression,
  isMine,
}: {
  impression: Impression;
  isMine: boolean;
}) {
  const IMPRESSION_MAX_LENGTH = 1000;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(impression.content);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    const trimmed = draft.trim();
    if (trimmed.length === 0) {
      setError("내용을 입력해 주세요.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await updateImpression(impression.id, trimmed);
      if (res?.error) {
        setError(res.error);
        return;
      }
      setEditing(false);
    });
  }

  function handleCancel() {
    setDraft(impression.content);
    setError(null);
    setEditing(false);
  }

  return (
    <div className="rounded-[28px] border border-stone bg-white/70 backdrop-blur-sm shadow-sm p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-medium text-brown-dark">
              {impression.nickname ?? "익명"}
            </span>
            {isMine && <Pill tone="gold">나</Pill>}
          </div>
          <div className="text-[11px] text-brown-light mt-0.5">
            {new Date(impression.createdAt).toLocaleDateString("ko-KR", {
              timeZone: "Asia/Seoul",
              month: "long",
              day: "numeric",
            })}
          </div>
        </div>
        {isMine && !editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="shrink-0 inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs bg-sand/60 text-brown-mid hover:bg-sand transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="w-3 h-3"
            >
              <path d="M2.695 14.763l-1.262 3.154a.5.5 0 0 0 .65.65l3.155-1.262a4 4 0 0 0 1.343-.885L17.5 5.5a2.121 2.121 0 0 0-3-3L3.58 13.42a4 4 0 0 0-.885 1.343Z" />
            </svg>
            수정
          </button>
        )}
      </div>
      <div className="mt-4 rounded-2xl bg-[#F7F1E7] p-3">
        <div className="flex items-center gap-1.5">
          <CompassIcon className="w-3.5 h-3.5 text-brown-light" />
          <div className="text-[11px] uppercase tracking-[0.18em] text-brown-light">
            여정을 돌아보며
          </div>
        </div>
        {editing ? (
          <>
            <textarea
              value={draft}
              onChange={(e) =>
                setDraft(e.target.value.slice(0, IMPRESSION_MAX_LENGTH))
              }
              maxLength={IMPRESSION_MAX_LENGTH}
              rows={5}
              className="mt-2 w-full resize-none rounded-2xl border border-stone bg-white/80 px-3 py-2 text-sm text-brown leading-6 placeholder:text-brown-light/70 focus:outline-none focus:ring-2 focus:ring-olive/30"
            />
            {error && (
              <p className="mt-1 text-xs text-red-500">{error}</p>
            )}
            <div className="mt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={handleCancel}
                disabled={isPending}
                className="rounded-full px-3 py-1 text-xs bg-sand/60 text-brown-mid hover:bg-sand transition-colors disabled:opacity-50"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isPending}
                className="rounded-full px-3 py-1 text-xs bg-olive text-ivory hover:bg-sage transition-colors disabled:opacity-50"
              >
                {isPending ? "저장 중…" : "저장"}
              </button>
            </div>
          </>
        ) : (
          <p className="mt-2 text-sm leading-6 text-brown-mid whitespace-pre-line">
            {impression.content}
          </p>
        )}
      </div>
      {!editing && (
        <div className="mt-3 flex justify-end">
          <ReactionBar
            targetId={impression.id}
            reactions={impression.reactions}
            myReaction={impression.myReaction}
            onToggle={toggleImpressionReaction}
          />
        </div>
      )}
    </div>
  );
}

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function setCookie(name: string, value: string, days = 365) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)};expires=${expires};path=/`;
}

export default function FeedTabs({
  epitaphs,
  impressions,
  myCellId,
  myUserId,
  cellName,
  wroteToday,
  writingOver,
  myRecommendation,
}: {
  epitaphs: Epitaph[];
  impressions: Impression[];
  myCellId: string | null;
  myUserId: string;
  cellName: string | null;
  wroteToday: boolean;
  /** 작성 기간 종료(41일차+) 여부. 안내 문구를 조회 모드에 맞게 바꿈. */
  writingOver: boolean;
  // 부활의 말씀은 본인 카드에만 표시한다. 공개 피드에는 절대 포함하지 않는다.
  myRecommendation: RecommendationData | null;
}) {
  const [filter, setFilter] = useState<"all" | "cell" | "impressions">("all");
  const [expandAll, setExpandAll] = useState(() => getCookie("feed_expand") !== "0");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  function handleToggleAll() {
    const next = !expandAll;
    setExpandAll(next);
    setExpandedIds(new Set());
    setCookie("feed_expand", next ? "1" : "0");
  }

  function toggleCard(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function isExpanded(id: string) {
    if (expandedIds.has(id)) return !expandAll;
    return expandAll;
  }

  const filtered =
    filter === "cell" && myCellId
      ? epitaphs.filter((e) => e.cellId === myCellId)
      : epitaphs;

  return (
    <div className="space-y-4">
      {/* 필터 탭 + 전체 펴기/접기 */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-2 overflow-auto pb-1">
          <Pill
            tone={filter === "all" ? "green" : "default"}
            active={filter === "all"}
            onClick={() => setFilter("all")}
          >
            전체 {epitaphs.length > 0 && `(${epitaphs.length})`}
          </Pill>
          {myCellId && (
            <Pill
              tone={filter === "cell" ? "green" : "default"}
              active={filter === "cell"}
              onClick={() => setFilter("cell")}
            >
              {cellName ?? "우리 셀"}
            </Pill>
          )}
          <Pill
            tone={filter === "impressions" ? "green" : "default"}
            active={filter === "impressions"}
            onClick={() => setFilter("impressions")}
          >
            빈무덤 소감 {impressions.length > 0 && `(${impressions.length})`}
          </Pill>
        </div>
        {filter !== "impressions" && (
          <button
            type="button"
            onClick={handleToggleAll}
            className="shrink-0 flex items-center gap-1 rounded-full px-3 py-1 text-xs bg-sand/60 text-brown-mid hover:bg-sand transition-colors"
          >
            {expandAll ? "접기" : "펴기"}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className={`w-3.5 h-3.5 transition-transform ${expandAll ? "rotate-180" : ""}`}
            >
              <path
                fillRule="evenodd"
                d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        )}
      </div>

      {/* 빈무덤 소감 탭 */}
      {filter === "impressions" ? (
        impressions.length === 0 ? (
          <div className="text-center py-16 text-brown-light text-sm">
            아직 작성된 소감이 없어요
          </div>
        ) : (
          <div className="space-y-4">
            {impressions.map((i) => (
              <ImpressionCard
                key={i.id}
                impression={i}
                isMine={i.userId === myUserId}
              />
            ))}
          </div>
        )
      ) : (
        <>
          {/* 오늘 미작성 안내 — 작성 기간 종료 후엔 노출하지 않음 (상단 ClosingBanner 가 대체) */}
          {!wroteToday && !writingOver && (
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
          {writingOver
            ? "작성 기간이 종료되어 오늘의 기록은 없어요"
            : "아직 오늘의 기록을 작성한 분이 없어요"}
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((e) => {
            const open = isExpanded(e.id);
            return (
              <div
                key={e.id}
                className="rounded-[28px] border border-stone bg-white/70 backdrop-blur-sm shadow-sm p-4"
              >
                {/* 닉네임 + 작성시간 + 뱃지 (클릭으로 개별 토글) */}
                <button
                  type="button"
                  onClick={() => toggleCard(e.id)}
                  className="flex items-start justify-between gap-3 w-full text-left"
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium text-brown-dark">
                        {e.nickname ?? "익명"}
                      </span>
                      {e.userId === myUserId && <Pill tone="gold">나</Pill>}
                    </div>
                    <div className="text-[11px] text-brown-light mt-0.5">
                      {new Date(e.updatedAt).toLocaleTimeString("ko-KR", {
                        timeZone: "Asia/Seoul",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className={`w-4 h-4 text-brown-light shrink-0 mt-0.5 transition-transform ${open ? "rotate-180" : ""}`}
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>

                {/* 두 섹션 (접기/펴기) */}
                {open && (
                  <div className="mt-4 grid gap-3">
                    <div className="rounded-2xl bg-[#F7F1E7] p-3">
                      <div className="flex items-center gap-1.5">
                        <CandleIcon className="w-3.5 h-3.5 text-brown-light" />
                        <div className="text-[11px] uppercase tracking-[0.18em] text-brown-light">
                          어제를 돌아보며
                        </div>
                      </div>
                      {e.repentCategories.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {e.repentCategories.map((c) => {
                            const label =
                              REPENT_CATEGORY_LABELS[
                                c as keyof typeof REPENT_CATEGORY_LABELS
                              ] ?? c;
                            return (
                              <span
                                key={c}
                                className="inline-flex rounded-full bg-white/80 px-2.5 py-0.5 text-[11px] font-medium text-[#a4724a]"
                              >
                                {label}
                              </span>
                            );
                          })}
                        </div>
                      )}
                      <p className="mt-2 text-sm leading-6 text-brown-mid whitespace-pre-line">
                        {e.yesterday}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-sage-light p-3">
                      <div className="flex items-center gap-1.5">
                        <SproutIcon className="w-3.5 h-3.5 text-[#6C7A62]" />
                        <div className="text-[11px] uppercase tracking-[0.18em] text-[#6C7A62]">
                          오늘을 기대하며
                        </div>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-[#4D5B46] whitespace-pre-line">
                        {e.today}
                      </p>
                    </div>

                    {/* 부활의 말씀 — 작성자 본인 카드에만 표시 */}
                    {e.userId === myUserId && myRecommendation && (
                      <MyRecommendation
                        themes={myRecommendation.themes}
                        situationTags={myRecommendation.situationTags}
                        emotionTags={myRecommendation.emotionTags}
                        recommendations={myRecommendation.recommendations}
                      />
                    )}
                  </div>
                )}

                {/* 공감 반응 */}
                <div className={`${open ? "mt-3" : "mt-2"} flex justify-end`}>
                  <ReactionBar
                    targetId={e.id}
                    reactions={e.reactions}
                    myReaction={e.myReaction}
                    onToggle={toggleReaction}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
        </>
      )}
    </div>
  );
}
