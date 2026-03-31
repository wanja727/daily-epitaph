"use client";

import { useState, useEffect, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import MyFlower from "./MyFlower";
import CellGarden from "./CellGarden";
import CellExplorer from "./CellExplorer";
import { getCellGardenData } from "./actions";

interface FlowerData {
  id: string;
  type: string;
  stage: number;
  waterCount: number;
  completedAt: Date | null;
}

interface VisiblePlot {
  slot: number;
  flowerType: string;
  placedByNickname: string | null;
}

type Tab = "my" | "cell" | "explore" | "viewOther";

export default function GardenView({
  activeFlower,
  completedFlowers,
  waterCount,
  visiblePlots,
  totalFlowerCount,
  cellName,
  cellId,
}: {
  activeFlower: FlowerData | null;
  completedFlowers: FlowerData[];
  waterCount: number;
  visiblePlots: VisiblePlot[];
  totalFlowerCount: number;
  cellName: string | null;
  cellId: string | null;
}) {
  const searchParams = useSearchParams();
  const initialTab: Tab = searchParams.get("tab") === "cell" ? "cell" : "my";
  const [tab, setTab] = useState<Tab>(initialTab);
  const [isPending, startTransition] = useTransition();

  // 다른 셀 꽃밭 데이터 (클라이언트 상태)
  const [otherGarden, setOtherGarden] = useState<{
    cellId: string;
    cellName: string;
    visiblePlots: VisiblePlot[];
    totalFlowerCount: number;
  } | null>(null);

  useEffect(() => {
    if (searchParams.get("tab") === "cell") {
      setTab("cell");
    }
  }, [searchParams]);

  function switchTab(newTab: "my" | "cell") {
    setTab(newTab);
    setOtherGarden(null);
    const url = newTab === "cell" ? "/garden?tab=cell" : "/garden";
    window.history.replaceState(null, "", url);
  }

  function handleExplore() {
    setTab("explore");
  }

  function handleSelectCell(selectedCellId: string) {
    // 내 셀이든 다른 셀이든 동일하게 viewOther로 표시
    if (selectedCellId === cellId) {
      setOtherGarden({
        cellId: cellId!,
        cellName: cellName ?? "",
        visiblePlots,
        totalFlowerCount,
      });
      setTab("viewOther");
      return;
    }

    startTransition(async () => {
      const data = await getCellGardenData(selectedCellId);
      if (data) {
        setOtherGarden({
          cellId: selectedCellId,
          cellName: data.cellName,
          visiblePlots: data.visiblePlots,
          totalFlowerCount: data.totalFlowerCount,
        });
        setTab("viewOther");
      }
    });
  }

  const tabBtnClass = (active: boolean) =>
    `inline-flex rounded-full px-3 py-1 text-xs transition-colors ${
      active ? "bg-[#DCE5D6] text-[#516047]" : "bg-sand/60 text-brown-mid"
    }`;

  return (
    <div className="space-y-4">
      {/* 탭 버튼 영역 — 항상 표시 */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => switchTab("my")}
          className={tabBtnClass(tab === "my")}
        >
          내 꽃
        </button>
        <button
          onClick={() => switchTab("cell")}
          className={tabBtnClass(tab === "cell")}
        >
          {cellName ? `${cellName} 꽃밭` : "셀 꽃밭"}
        </button>
        <button
          onClick={handleExplore}
          className={`ml-auto inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs transition-colors ${
            tab === "explore" || tab === "viewOther"
              ? "bg-[#DCE5D6] text-[#516047]"
              : "bg-white/80 text-brown-mid border border-[#8BBF6A]/25 hover:bg-[#E8F0DE]"
          }`}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          다른 셀 구경가기
        </button>
      </div>

      {/* 본문 영역 */}
      {tab === "my" && (
        <MyFlower
          flower={activeFlower}
          waterCount={waterCount}
          completedFlowers={completedFlowers}
        />
      )}

      {tab === "cell" && (
        <CellGarden
          visiblePlots={visiblePlots}
          totalFlowerCount={totalFlowerCount}
          cellName={cellName}
          cellId={cellId}
          completedFlowers={completedFlowers}
        />
      )}

      {tab === "explore" && (
        <CellExplorer currentCellId={cellId} onSelect={handleSelectCell} />
      )}

      {tab === "viewOther" && otherGarden && (
        <div className="space-y-3">
          {/* 돌아가기 → 셀 리스트로 */}
          <button
            onClick={() => setTab("explore")}
            className="inline-flex items-center gap-1 text-sm text-brown-mid hover:text-brown-dark transition-colors"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
            돌아가기
          </button>

          <CellGarden
            visiblePlots={otherGarden.visiblePlots}
            totalFlowerCount={otherGarden.totalFlowerCount}
            cellName={otherGarden.cellName}
            cellId={otherGarden.cellId}
            completedFlowers={[]}
          />
        </div>
      )}

      {/* 로딩 중 */}
      {isPending && (
        <div className="text-center py-8 text-sm text-brown-light">
          꽃밭을 불러오는 중...
        </div>
      )}
    </div>
  );
}
