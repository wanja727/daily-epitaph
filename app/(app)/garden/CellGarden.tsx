"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { GARDEN_SIZE } from "@/lib/utils/constants";
import { placeFlowerInGarden } from "./actions";
import FlowerIllustration from "@/app/components/FlowerIllustration";

interface PlotData {
  x: number;
  y: number;
  flowerId: string | null;
  flowerType: string | null;
  placedByNickname: string | null;
}

interface FlowerData {
  id: string;
  type: string;
  stage: number;
}

/** 개별 밭 칸 — SVG 흙/잔디 배경 */
function PlotCell({
  hasFlower,
  placing,
  acting,
  nickname,
  index,
  onClick,
}: {
  hasFlower: boolean;
  placing: boolean;
  acting: boolean;
  nickname?: string | null;
  index: number;
  onClick: () => void;
}) {
  return (
    <button
      disabled={!(!hasFlower && placing) || acting}
      onClick={onClick}
      className={`aspect-square rounded-[18px] relative overflow-hidden transition-all ${
        !hasFlower && placing
          ? "ring-2 ring-olive/40 cursor-pointer"
          : ""
      }`}
      title={nickname ? `${nickname}` : undefined}
    >
      {/* 배경 SVG: 흙 + 잔디 */}
      <svg
        viewBox="0 0 60 60"
        className="absolute inset-0 w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* 흙 배경 */}
        <rect width="60" height="60" rx="12" fill="#EDE6D8" />
        {/* 흙 질감 */}
        <circle cx="15" cy="48" r="1.5" fill="#D6CCBB" opacity="0.5" />
        <circle cx="35" cy="52" r="1" fill="#D6CCBB" opacity="0.4" />
        <circle cx="48" cy="46" r="1.2" fill="#D6CCBB" opacity="0.3" />
        {/* 잔디 하단 */}
        <ellipse cx="30" cy="54" rx="26" ry="5" fill="#C5D4B3" opacity="0.3" />
        {/* 잔디 블레이드 */}
        <path d="M12,54 Q13,48 14,54" stroke="#8FB070" strokeWidth="1" fill="none" opacity="0.4" />
        <path d="M22,53 Q23,46 24,53" stroke="#7DA65E" strokeWidth="1" fill="none" opacity="0.35" />
        <path d="M38,54 Q39,47 40,54" stroke="#8FB070" strokeWidth="1" fill="none" opacity="0.4" />
        <path d="M48,53 Q49,48 50,53" stroke="#7DA65E" strokeWidth="1" fill="none" opacity="0.3" />
        {/* 빈 자리 플러스 표시 */}
        {!hasFlower && placing && (
          <g opacity="0.5">
            <line x1="30" y1="22" x2="30" y2="38" stroke="#6D7A5F" strokeWidth="2" strokeLinecap="round" />
            <line x1="22" y1="30" x2="38" y2="30" stroke="#6D7A5F" strokeWidth="2" strokeLinecap="round" />
          </g>
        )}
      </svg>

      {/* 꽃 */}
      {hasFlower && (
        <div className="absolute inset-0 p-0.5">
          <FlowerIllustration
            waterCount={3}
            size="sm"
            animate={true}
            delay={index * 0.4}
          />
        </div>
      )}
    </button>
  );
}

export default function CellGarden({
  plots,
  cellName,
  cellId,
  completedFlowers,
}: {
  plots: PlotData[];
  cellName: string | null;
  cellId: string | null;
  completedFlowers: FlowerData[];
}) {
  const router = useRouter();
  const [placing, setPlacing] = useState<string | null>(null);
  const [acting, setActing] = useState(false);

  if (!cellId) {
    return (
      <div className="text-center py-16 text-brown-light text-sm">
        소속 셀이 없어 꽃밭을 사용할 수 없어요
      </div>
    );
  }

  // 5×5 그리드
  const grid: (PlotData | null)[][] = Array.from(
    { length: GARDEN_SIZE },
    () => Array(GARDEN_SIZE).fill(null)
  );
  for (const p of plots) {
    if (p.x < GARDEN_SIZE && p.y < GARDEN_SIZE) {
      grid[p.y][p.x] = p;
    }
  }

  const placeable = completedFlowers.filter((f) => f.stage >= 3);
  const plantedCount = plots.filter((p) => p.flowerId).length;

  async function handlePlace(x: number, y: number) {
    if (!placing || acting) return;
    setActing(true);
    await placeFlowerInGarden(placing, cellId!, x, y);
    setPlacing(null);
    router.refresh();
    setActing(false);
  }

  return (
    <div className="space-y-4">
      {/* 꽃밭 카드 */}
      <div className="rounded-[28px] border border-stone bg-white/70 backdrop-blur-sm shadow-sm p-4 relative overflow-hidden">
        {/* 배경 글로우 */}
        <div className="absolute -top-8 -left-8 h-32 w-32 rounded-full bg-sage/15 blur-3xl" />
        <div className="absolute -bottom-4 -right-4 h-24 w-24 rounded-full bg-gold/10 blur-2xl" />

        <div className="relative">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-brown-light">
                Cell garden
              </div>
              <div className="mt-1 text-lg font-heading font-bold text-brown-dark">
                {cellName} 꽃밭
              </div>
            </div>
            <span className="inline-flex rounded-full px-3 py-1 text-xs bg-[#DCE5D6] text-[#516047]">
              {plantedCount}송이
            </span>
          </div>

          <div className="grid grid-cols-5 gap-2">
            {grid.map((row, y) =>
              row.map((plot, x) => {
                const hasFlower = !!plot?.flowerId;
                const idx = y * GARDEN_SIZE + x;
                return (
                  <PlotCell
                    key={`${x}-${y}`}
                    hasFlower={hasFlower}
                    placing={!!placing}
                    acting={acting}
                    nickname={plot?.placedByNickname}
                    index={idx}
                    onClick={() => handlePlace(x, y)}
                  />
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* 심을 꽃 선택 */}
      {placeable.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs uppercase tracking-[0.18em] text-brown-light">
            심을 꽃 선택
          </h3>
          <div className="flex gap-2 flex-wrap">
            {placeable.map((f) => (
              <button
                key={f.id}
                onClick={() =>
                  setPlacing(placing === f.id ? null : f.id)
                }
                className={`w-16 h-16 rounded-[18px] border shadow-sm transition-colors overflow-hidden ${
                  placing === f.id
                    ? "bg-[#DCE5D6] border-sage ring-2 ring-olive/30"
                    : "bg-[#F7F2E8] border-stone hover:bg-sand"
                }`}
              >
                <FlowerIllustration waterCount={3} size="sm" animate={false} />
              </button>
            ))}
          </div>
          {placing && (
            <p className="text-xs text-olive animate-pulse">
              꽃밭에서 심을 위치를 선택하세요
            </p>
          )}
        </div>
      )}

      {placeable.length === 0 && (
        <p className="text-xs text-brown-light text-center">
          꽃을 완성하면 여기에 심을 수 있어요
        </p>
      )}
    </div>
  );
}
