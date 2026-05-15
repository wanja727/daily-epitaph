"use client";

import { useEffect, useState, useTransition } from "react";
import { getAllCellsGardenPreview } from "./actions";
import CellGarden from "./CellGarden";

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
  onSelect,
}: {
  /** 셀 선택 콜백. currentCellId 는 더 이상 사용하지 않음(모든 셀이 동일한 그리드로 노출). */
  onSelect: (cellId: string) => void;
}) {
  const [previews, setPreviews] = useState<CellPreview[]>([]);
  const [loading, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      const preview = await getAllCellsGardenPreview();
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

  if (previews.length === 0) {
    return (
      <div className="text-center py-12 text-sm text-brown-light">
        등록된 셀이 없어요
      </div>
    );
  }

  return (
    <div className="space-y-3">
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
  );
}
