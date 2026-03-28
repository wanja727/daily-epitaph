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
      <div className="space-y-4">
        <div className="rounded-[28px] border border-stone bg-white/70 backdrop-blur-sm shadow-sm p-5 text-center space-y-4">
          <p className="text-lg">🌱</p>
          <p className="text-sm text-brown-mid">키울 꽃을 선택하세요</p>

          <div className="grid grid-cols-3 gap-3">
            {FLOWER_TYPES.map((ft) => (
              <button
                key={ft.id}
                onClick={() => handleNewFlower(ft.id)}
                disabled={acting}
                className="rounded-[18px] border border-stone bg-[#F7F2E8] p-4 text-center space-y-2 hover:bg-sand transition-colors disabled:opacity-50"
              >
                <span className="text-3xl">{ft.stages[2]}</span>
                <p className="text-xs text-brown-mid">{ft.name}</p>
              </button>
            ))}
          </div>
        </div>

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
    <div className="space-y-4">
      {/* 꽃 카드 */}
      <div className="rounded-[28px] border border-stone bg-white/70 backdrop-blur-sm shadow-sm p-5 relative overflow-hidden">
        {/* 글로우 */}
        <div className="absolute -top-6 right-3 h-24 w-24 rounded-full bg-gold/25 blur-2xl" />

        {/* 물뿌리개 표시 */}
        <div className="flex items-center justify-between relative">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-brown-light">Daily grace</div>
            <div className="mt-1 text-2xl font-heading font-bold text-brown-dark">
              {waterCount}개
            </div>
          </div>
          <div className="h-14 w-14 rounded-full bg-sand flex items-center justify-center text-2xl">
            🪣
          </div>
        </div>

        {/* 꽃 비주얼 */}
        <div className="mt-6 flex flex-col items-center">
          <div className="text-7xl py-4">{emoji}</div>
          <div className="mt-3 text-sm text-brown-mid">
            {ft.name} · {isComplete ? "완성!" : stageLabels[flower.stage]}
          </div>

          {/* 성장 바 */}
          {!isComplete && (
            <div className="mt-4 w-full">
              <div className="w-full rounded-full bg-sand h-3 overflow-hidden">
                <div
                  className="h-full rounded-full bg-sage transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-brown-light text-center">
                {flower.waterCount} / {nextThreshold} 물주기
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 정보 카드 */}
      {!isComplete && (
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-[28px] border border-stone bg-white/70 backdrop-blur-sm shadow-sm p-4 text-center">
            <div className="text-xs uppercase tracking-[0.16em] text-brown-light">성장 효과</div>
            <div className="mt-2 text-sm text-brown-mid">조용히 꽃이 핍니다</div>
          </div>
          <div className="rounded-[28px] border border-stone bg-white/70 backdrop-blur-sm shadow-sm p-4 text-center">
            <div className="text-xs uppercase tracking-[0.16em] text-brown-light">기도 제목</div>
            <div className="mt-2 text-sm text-brown-mid">내 안에 거하라</div>
          </div>
        </div>
      )}

      {/* 버튼 */}
      {!isComplete ? (
        <button
          onClick={handleWater}
          disabled={waterCount <= 0 || acting}
          className="w-full rounded-3xl bg-sage py-4 text-sm text-ivory shadow-sm transition-colors hover:bg-olive disabled:opacity-40"
        >
          물 주기
        </button>
      ) : (
        <div className="rounded-[28px] border border-stone bg-white/70 backdrop-blur-sm shadow-sm p-4 text-center">
          <p className="text-sm text-olive font-medium">셀 꽃밭에 심을 수 있어요!</p>
        </div>
      )}

      {completedFlowers.length > 0 && (
        <CompletedList flowers={completedFlowers} />
      )}
    </div>
  );
}

function CompletedList({ flowers }: { flowers: FlowerData[] }) {
  return (
    <div className="space-y-2">
      <h3 className="text-xs uppercase tracking-[0.18em] text-brown-light">
        완성된 꽃 ({flowers.length})
      </h3>
      <div className="flex gap-2 flex-wrap">
        {flowers.map((f) => (
          <div
            key={f.id}
            className="rounded-[18px] border border-stone bg-[#F7F2E8] px-3 py-2 text-center shadow-sm"
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
