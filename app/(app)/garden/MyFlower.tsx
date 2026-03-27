"use client";

import { useRouter } from "next/navigation";
import { getFlowerEmoji, getFlowerType, FLOWER_TYPES } from "@/lib/utils/flower-types";
import { WATER_THRESHOLDS, FLOWER_STAGES } from "@/lib/utils/constants";
import { waterFlower, startNewFlower } from "./actions";
import { useState } from "react";

interface FlowerData {
  id: string;
  type: string;
  stage: number;
  waterCount: number;
  completedAt: Date | null;
}

export default function MyFlower({
  flower,
  waterCount,
  completedFlowers,
}: {
  flower: FlowerData | null;
  waterCount: number;
  completedFlowers: FlowerData[];
}) {
  const router = useRouter();
  const [acting, setActing] = useState(false);

  async function handleWater() {
    if (!flower || acting) return;
    setActing(true);
    await waterFlower(flower.id);
    router.refresh();
    setActing(false);
  }

  async function handleNewFlower(typeId: string) {
    setActing(true);
    await startNewFlower(typeId);
    router.refresh();
    setActing(false);
  }

  // 꽃을 아직 시작하지 않은 상태
  if (!flower) {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl bg-white/[0.04] border border-white/[0.06] p-6 text-center space-y-4">
          <p className="text-lg">🌱</p>
          <p className="text-sm text-slate-300">키울 꽃을 선택하세요</p>

          <div className="grid grid-cols-3 gap-3">
            {FLOWER_TYPES.map((ft) => (
              <button
                key={ft.id}
                onClick={() => handleNewFlower(ft.id)}
                disabled={acting}
                className="rounded-xl bg-white/5 border border-white/10 p-4 text-center space-y-2 hover:bg-white/10 transition-colors disabled:opacity-50"
              >
                <span className="text-3xl">{ft.stages[2]}</span>
                <p className="text-xs text-slate-400">{ft.name}</p>
              </button>
            ))}
          </div>
        </div>

        {/* 완성된 꽃 목록 */}
        {completedFlowers.length > 0 && (
          <CompletedList flowers={completedFlowers} />
        )}
      </div>
    );
  }

  const ft = getFlowerType(flower.type);
  const emoji = getFlowerEmoji(flower.type, flower.stage);
  const isComplete = flower.stage >= FLOWER_STAGES.BLOOM;
  const nextThreshold =
    flower.stage < FLOWER_STAGES.BLOOM
      ? WATER_THRESHOLDS[
          (flower.stage + 1) as keyof typeof WATER_THRESHOLDS
        ]
      : flower.waterCount;

  const stageLabels = ["", "새싹", "봉우리", "활짝 핀 꽃"];
  const progress = nextThreshold > 0
    ? Math.min(100, (flower.waterCount / nextThreshold) * 100)
    : 100;

  return (
    <div className="space-y-6">
      {/* 꽃 표시 영역 */}
      <div className="rounded-2xl bg-white/[0.04] border border-white/[0.06] p-6 text-center space-y-4">
        {/* 꽃 이모지 */}
        <div className="text-7xl py-4">{emoji}</div>

        {/* 이름 + 단계 */}
        <div>
          <p className="text-lg font-semibold text-white">{ft.name}</p>
          <p className="text-sm text-slate-400">
            {isComplete ? "🎉 완성!" : stageLabels[flower.stage]}
          </p>
        </div>

        {/* 성장 바 */}
        {!isComplete && (
          <div className="space-y-1">
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-accent rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-slate-500">
              {flower.waterCount} / {nextThreshold} 물주기
            </p>
          </div>
        )}

        {/* 버튼 */}
        <div className="flex gap-3 justify-center pt-2">
          {!isComplete && (
            <button
              onClick={handleWater}
              disabled={waterCount <= 0 || acting}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-500/20 border border-blue-500/30 text-blue-300 text-sm font-medium hover:bg-blue-500/30 transition-colors disabled:opacity-40"
            >
              🚿 물 주기
            </button>
          )}
          {isComplete && (
            <p className="text-sm text-accent-bright">
              셀 꽃밭에 심을 수 있어요!
            </p>
          )}
        </div>

        {/* 물뿌리개 보유량 */}
        <p className="text-xs text-slate-500">
          보유 물뿌리개: {waterCount}개
        </p>
      </div>

      {/* 완성된 꽃 목록 */}
      {completedFlowers.length > 0 && (
        <CompletedList flowers={completedFlowers} />
      )}
    </div>
  );
}

function CompletedList({ flowers }: { flowers: FlowerData[] }) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-slate-400">
        완성된 꽃 ({flowers.length})
      </h3>
      <div className="flex gap-2 flex-wrap">
        {flowers.map((f) => (
          <div
            key={f.id}
            className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-center"
          >
            <span className="text-2xl">
              {getFlowerEmoji(f.type, f.stage)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
