"use client";

import { useEffect, useState, useTransition } from "react";
import { getCellStats } from "./actions";

interface CellStat {
  id: string;
  name: string;
  flowerCount: number;
  waterCount: number;
}

export default function CellExplorer({
  currentCellId,
  onSelect,
}: {
  currentCellId: string | null;
  onSelect: (cellId: string) => void;
}) {
  const [cells, setCells] = useState<CellStat[]>([]);
  const [loading, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      const data = await getCellStats();
      setCells(data);
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

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-brown-dark">
        셀을 선택해 꽃밭을 구경하세요
      </h3>
      <div className="grid grid-cols-2 gap-2.5">
        {cells.map((cell) => (
          <button
            key={cell.id}
            onClick={() => onSelect(cell.id)}
            className={`flex items-center justify-between rounded-full px-4 py-2.5 text-sm transition-all shadow-sm hover:shadow-md active:scale-[0.97] ${
              cell.id === currentCellId
                ? "bg-[#8BBF6A] text-white ring-2 ring-[#8BBF6A]/30"
                : "bg-white/80 text-brown-dark border border-[#8BBF6A]/25 hover:bg-[#E8F0DE]"
            }`}
          >
            <span className="font-medium truncate">{cell.name}</span>
            <span className="flex items-center gap-1 text-xs tabular-nums opacity-80 shrink-0 ml-1">
              <span title="꽃 수">🌷{cell.flowerCount}</span>
              <span title="물뿌리개">💧{cell.waterCount}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
