"use client";

import { useEffect, useState, useTransition } from "react";
import { getCellStats, getAllCellsGardenPreview } from "./actions";
import CellGarden from "./CellGarden";

interface CellStat {
  id: string;
  name: string;
  flowerCount: number;
  waterCount: number;
}

interface CellPreview {
  id: string;
  name: string;
  visiblePlots: Array<{
    slot: number;
    flowerType: string;
    placedByNickname: string | null;
  }>;
  totalFlowerCount: number;
}

export default function CellExplorer({
  currentCellId,
  onSelect,
  isInEvent,
}: {
  currentCellId: string | null;
  onSelect: (cellId: string) => void;
  isInEvent: boolean;
}) {
  const [cells, setCells] = useState<CellStat[]>([]);
  const [previews, setPreviews] = useState<CellPreview[]>([]);
  const [loading, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      const [stats, preview] = await Promise.all([
        getCellStats(),
        getAllCellsGardenPreview(),
      ]);
      setCells(stats);
      setPreviews(preview);
    });
  }, []);

  if (loading) {
    return (
      <div className="text-center py-12 text-sm text-brown-light">
        불러오는 중...
      </div>
    );
  }

  if (cells.length === 0) {
    return (
      <div className="text-center py-12 text-sm text-brown-light">
        등록된 셀이 없어요
      </div>
    );
  }

  const myCell = cells.find((c) => c.id === currentCellId) ?? null;
  const otherCells = cells
    .filter((c) => c.id !== currentCellId)
    .sort((a, b) => a.name.localeCompare(b.name, "ko"));

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {/* 이벤트 기간 외에만 셀 리스트 노출 — 이벤트 기간엔 5×5 그리드로 대체 */}
        {!isInEvent && (
          <h3 className="text-sm font-medium text-brown-dark">
            셀을 선택해 꽃밭을 구경하세요
          </h3>
        )}

        {!isInEvent && myCell && (
          <div className="space-y-2">
            <div className="text-xs font-medium text-brown-light">내 셀</div>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={() => onSelect(myCell.id)}
                className="flex items-center justify-between rounded-full px-4 py-2.5 text-sm transition-all shadow-sm hover:shadow-md active:scale-[0.97] bg-[#8BBF6A] text-white ring-2 ring-[#8BBF6A]/30"
              >
                <span className="font-medium truncate">{myCell.name}</span>
                <span className="flex items-center gap-1 text-xs tabular-nums opacity-80 shrink-0 ml-1">
                  <span title="꽃 수">🌷{myCell.flowerCount}</span>
                  <span title="물뿌리개">💧{myCell.waterCount}</span>
                </span>
              </button>
            </div>
          </div>
        )}

        {!isInEvent && otherCells.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-baseline gap-2">
              <span className="text-xs font-medium text-brown-light">
                다른 셀 (가나다순 정렬)
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {otherCells.map((cell) => (
                <button
                  key={cell.id}
                  onClick={() => onSelect(cell.id)}
                  className="flex items-center justify-start rounded-full px-4 py-2.5 text-sm transition-all shadow-sm hover:shadow-md active:scale-[0.97] bg-white/80 text-brown-dark border border-[#8BBF6A]/25 hover:bg-[#E8F0DE]"
                >
                  <span className="font-medium truncate">{cell.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 이벤트 기간 — 안내 + 5×5 미니 그리드 */}
      {isInEvent && (
        <div className="space-y-3">
          <div className="rounded-3xl border border-olive/30 bg-[#F2F4EC] px-4 py-3 shadow-sm">
            <div className="flex items-start gap-2.5">
              <div className="text-xl leading-none mt-0.5">📜</div>
              <div className="flex-1 min-w-0">
                <div className="text-xs uppercase tracking-[0.18em] text-[#7A8B6E]">
                  Event · 5/9 ~ 5/15
                </div>
                <div className="mt-0.5 text-sm font-heading font-bold text-[#516047]">
                  「🌸 Blooming Week」 진행중
                </div>
                <p className="mt-1 text-xs text-brown-mid leading-5">
                  이벤트 기간 동안 전체 꽃밭이 공개됩니다.
                </p>
              </div>
            </div>
          </div>

          {previews.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="text-xs font-medium text-brown-light">
                  모든 셀 꽃밭 (가나다순 정렬)
                </span>
                <span className="text-[10px] text-brown-light/70">
                  탭하면 자세히 보기
                </span>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {previews.map((p) => (
                  <CellGarden
                    key={p.id}
                    cellId={p.id}
                    cellName={p.name}
                    visiblePlots={p.visiblePlots}
                    totalFlowerCount={p.totalFlowerCount}
                    completedFlowers={[]}
                    compact={true}
                    onClick={() => onSelect(p.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
