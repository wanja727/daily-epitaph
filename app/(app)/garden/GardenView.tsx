"use client";

import { useState } from "react";
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
  const [tab, setTab] = useState<"my" | "cell">("my");

  return (
    <div className="space-y-5">
      {/* 탭 */}
      <div className="flex gap-2">
        <button
          onClick={() => setTab("my")}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
            tab === "my"
              ? "bg-olive text-white"
              : "bg-brown/5 text-brown-light hover:bg-brown/10"
          }`}
        >
          내 꽃
        </button>
        <button
          onClick={() => setTab("cell")}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
            tab === "cell"
              ? "bg-olive text-white"
              : "bg-brown/5 text-brown-light hover:bg-brown/10"
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
