"use client";

import { useRouter } from "next/navigation";
import { WATER_THRESHOLDS, FLOWER_STAGES } from "@/lib/utils/constants";
import { waterFlower, startNewFlower } from "./actions";
import { useState } from "react";
import FlowerIllustration from "@/app/components/FlowerIllustration";

interface FlowerData {
  id: string;
  type: string;
  stage: number;
  waterCount: number;
  completedAt: Date | null;
}

const STAGE_LABELS = ["씨앗", "새싹", "봉우리", "만개"];

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

  async function handleNewFlower() {
    setActing(true);
    await startNewFlower();
    router.refresh();
    setActing(false);
  }

  // 꽃을 아직 시작하지 않은 상태
  if (!flower) {
    return (
      <div className="space-y-4">
        <div className="rounded-[28px] border border-stone bg-white/70 backdrop-blur-sm shadow-sm p-6 text-center space-y-6">
          {/* 씨앗 일러스트 미리보기 */}
          <FlowerIllustration waterCount={0} animate={false} />

          <div className="space-y-2">
            <p className="text-lg font-heading font-bold text-brown-dark">
              새 꽃을 시작하세요
            </p>
            <p className="text-sm text-brown-mid">
              묘비명을 쓰고 물뿌리개를 받아 꽃을 키워보세요
            </p>
          </div>

          <button
            onClick={handleNewFlower}
            disabled={acting}
            className="w-full rounded-3xl bg-olive py-4 text-sm text-ivory shadow-sm transition-colors hover:bg-sage disabled:opacity-50"
          >
            {acting ? "준비 중..." : "씨앗 심기"}
          </button>
        </div>

        {completedFlowers.length > 0 && (
          <CompletedList flowers={completedFlowers} />
        )}
      </div>
    );
  }

  const isComplete = flower.stage >= FLOWER_STAGES.BLOOM;
  const visualStage = Math.min(flower.waterCount, 3);
  const totalNeeded = WATER_THRESHOLDS[FLOWER_STAGES.BLOOM]; // 3
  const progress = Math.min(100, (flower.waterCount / totalNeeded) * 100);

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

        {/* 꽃 일러스트 */}
        <div className="mt-2">
          <FlowerIllustration waterCount={flower.waterCount} />
        </div>

        {/* 단계 라벨 */}
        <div className="text-center mt-2">
          <p className="text-sm text-brown-mid">
            {isComplete ? "만개 — 완성!" : STAGE_LABELS[visualStage]}
          </p>
        </div>

        {/* 성장 바 */}
        {!isComplete && (
          <div className="mt-4">
            <div className="w-full rounded-full bg-sand h-3 overflow-hidden">
              <div
                className="h-full rounded-full bg-sage transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-brown-light text-center">
              {flower.waterCount} / {totalNeeded} 물주기
            </p>
          </div>
        )}
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
            className="w-16 h-16 rounded-[18px] border border-stone bg-[#F7F2E8] shadow-sm"
          >
            <FlowerIllustration waterCount={3} size="sm" animate={false} />
          </div>
        ))}
      </div>
    </div>
  );
}
