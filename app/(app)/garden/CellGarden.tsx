"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { getFlowerEmoji } from "@/lib/utils/flower-types";
import { GARDEN_SIZE } from "@/lib/utils/constants";
import { placeFlowerInGarden } from "./actions";

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
  const [placing, setPlacing] = useState<string | null>(null); // flowerId being placed
  const [acting, setActing] = useState(false);

  if (!cellId) {
    return (
      <div className="text-center py-16 text-warm-gray text-sm">
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

  const placeable = completedFlowers.filter(
    (f) => f.stage >= 3
  );

  async function handlePlace(x: number, y: number) {
    if (!placing || acting) return;
    setActing(true);
    await placeFlowerInGarden(placing, cellId!, x, y);
    setPlacing(null);
    router.refresh();
    setActing(false);
  }

  return (
    <div className="space-y-5">
      <div className="text-center">
        <h2 className="text-lg font-bold text-brown">
          {cellName} 공동 꽃밭
        </h2>
        <p className="text-xs text-warm-gray mt-1">
          완성한 꽃을 빈 곳에 심어보세요
        </p>
      </div>

      {/* 그리드 */}
      <div className="rounded-2xl bg-white border border-warm-gray/30 p-4">
        <div className="grid grid-cols-5 gap-2">
          {grid.map((row, y) =>
            row.map((plot, x) => {
              const hasFlower = plot?.flowerId;
              const isEmpty = !hasFlower;

              return (
                <button
                  key={`${x}-${y}`}
                  disabled={!isEmpty || !placing || acting}
                  onClick={() => handlePlace(x, y)}
                  className={`aspect-square rounded-xl flex items-center justify-center text-2xl transition-all ${
                    hasFlower
                      ? "bg-sage/15 border border-sage/30"
                      : placing
                      ? "bg-olive/10 border border-olive/30 hover:bg-olive/20 cursor-pointer"
                      : "bg-warm-gray/10 border border-warm-gray/20"
                  }`}
                  title={
                    plot?.placedByNickname
                      ? `${plot.placedByNickname}`
                      : undefined
                  }
                >
                  {hasFlower && plot?.flowerType
                    ? getFlowerEmoji(plot.flowerType, 3)
                    : isEmpty && placing
                    ? "+"
                    : ""}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* 심을 꽃 선택 */}
      {placeable.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-brown-light">
            심을 꽃 선택
          </h3>
          <div className="flex gap-2 flex-wrap">
            {placeable.map((f) => (
              <button
                key={f.id}
                onClick={() =>
                  setPlacing(placing === f.id ? null : f.id)
                }
                className={`px-3 py-2 rounded-xl border text-center transition-colors ${
                  placing === f.id
                    ? "bg-olive/15 border-olive/40"
                    : "bg-sage/10 border-sage/20 hover:bg-sage/20"
                }`}
              >
                <span className="text-2xl">
                  {getFlowerEmoji(f.type, 3)}
                </span>
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
        <p className="text-xs text-warm-gray text-center">
          꽃을 완성하면 여기에 심을 수 있어요
        </p>
      )}
    </div>
  );
}
