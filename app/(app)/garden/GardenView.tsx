"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import MyFlower from "./MyFlower";
import CellGarden from "./CellGarden";

interface FlowerData {
  id: string;
  type: string;
  stage: number;
  waterCount: number;
  completedAt: Date | null;
}

interface PlotData {
  x: number;
  y: number;
  flowerId: string | null;
  flowerType: string | null;
  placedByNickname: string | null;
}

export default function GardenView({
  activeFlower,
  completedFlowers,
  waterCount,
  plots,
  cellName,
  cellId,
}: {
  activeFlower: FlowerData | null;
  completedFlowers: FlowerData[];
  waterCount: number;
  plots: PlotData[];
  cellName: string | null;
  cellId: string | null;
}) {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "cell" ? "cell" : "my";
  const [tab, setTab] = useState<"my" | "cell">(initialTab);

  useEffect(() => {
    if (searchParams.get("tab") === "cell") {
      setTab("cell");
    }
  }, [searchParams]);

  function switchTab(newTab: "my" | "cell") {
    setTab(newTab);
    const url = newTab === "cell" ? "/garden?tab=cell" : "/garden";
    window.history.replaceState(null, "", url);
  }

  return (
    <div className="space-y-4">
      {/* 탭 */}
      <div className="flex gap-2">
        <button
          onClick={() => switchTab("my")}
          className={`inline-flex rounded-full px-3 py-1 text-xs transition-colors ${
            tab === "my"
              ? "bg-[#DCE5D6] text-[#516047]"
              : "bg-sand/60 text-brown-mid"
          }`}
        >
          내 꽃
        </button>
        <button
          onClick={() => switchTab("cell")}
          className={`inline-flex rounded-full px-3 py-1 text-xs transition-colors ${
            tab === "cell"
              ? "bg-[#DCE5D6] text-[#516047]"
              : "bg-sand/60 text-brown-mid"
          }`}
        >
          {cellName ? `${cellName} 꽃밭` : "셀 꽃밭"}
        </button>
      </div>

      {tab === "my" ? (
        <MyFlower
          flower={activeFlower}
          waterCount={waterCount}
          completedFlowers={completedFlowers}
        />
      ) : (
        <CellGarden
          plots={plots}
          cellName={cellName}
          cellId={cellId}
          completedFlowers={completedFlowers}
        />
      )}
    </div>
  );
}
