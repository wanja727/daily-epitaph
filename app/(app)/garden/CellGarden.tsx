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
      <div className="rounded-[28px] border border-stone bg-white/70 backdrop-blur-sm shadow-sm p-4">
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

        <div className="grid grid-cols-5 gap-3">
          {grid.map((row, y) =>
            row.map((plot, x) => {
              const hasFlower = plot?.flowerId;
              const isEmpty = !hasFlower;
              const idx = y * GARDEN_SIZE + x;

              return (
                <button
                  key={`${x}-${y}`}
                  disabled={!isEmpty || !placing || acting}
                  onClick={() => handlePlace(x, y)}
                  className={`aspect-square rounded-[18px] border flex items-center justify-center transition-all overflow-hidden ${
                    hasFlower
                      ? "bg-[#F7F2E8] border-stone"
                      : placing
                      ? "bg-sage-light border-sage hover:bg-[#DCE5D6] cursor-pointer"
                      : "bg-[#F7F2E8] border-stone"
                  }`}
                  title={
                    plot?.placedByNickname
                      ? `${plot.placedByNickname}`
                      : undefined
                  }
                >
                  {hasFlower ? (
                    <div className="w-full h-full p-0.5">
                      <FlowerIllustration
                        waterCount={3}
                        size="sm"
                        animate={true}
                        delay={idx * 0.4}
                      />
                    </div>
                  ) : isEmpty && placing ? (
                    <span className="text-sage text-lg">+</span>
                  ) : null}
                </button>
              );
            })
          )}
        </div>

        {/* 범례 */}
        <div className="mt-4 flex gap-2 flex-wrap text-xs text-brown-mid">
          <span className="inline-flex rounded-full px-3 py-1 bg-sand/60">빈 자리</span>
          <span className="inline-flex rounded-full px-3 py-1 bg-[#DCE5D6] text-[#516047]">자라는 믿음</span>
          <span className="inline-flex rounded-full px-3 py-1 bg-rose-light text-[#7A5858]">피어난 증인</span>
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
                    ? "bg-[#DCE5D6] border-sage"
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
