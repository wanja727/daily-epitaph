"use client";

import { useRouter } from "next/navigation";
import { WATER_THRESHOLDS, FLOWER_STAGES } from "@/lib/utils/constants";
import { waterFlower, startNewFlower } from "./actions";
import { useState } from "react";
import FlowerIllustration from "@/app/components/FlowerIllustration";
import Spinner from "@/app/components/Spinner";

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

  // 완성되었지만 아직 심지 않은 꽃이 있으면 축하 화면 표시
  const unplacedCompleted = completedFlowers.length > 0 ? completedFlowers[0] : null;

  // 꽃을 아직 시작하지 않은 상태
  if (!flower && !unplacedCompleted) {
    return (
      <div className="space-y-4">
        <div className="rounded-[28px] border border-stone bg-white/70 backdrop-blur-sm shadow-sm p-6 text-center space-y-6">
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
            {acting ? (
              <span className="inline-flex items-center justify-center gap-2">
                <Spinner size={14} />
                준비 중...
              </span>
            ) : "씨앗 심기"}
          </button>
        </div>
      </div>
    );
  }

  // 활성 꽃 없고 완성된 꽃이 있으면 → 축하 화면
  if (!flower && unplacedCompleted) {
    return (
      <div className="space-y-4">
        <div className="rounded-[28px] border border-stone bg-white/70 backdrop-blur-sm shadow-sm p-6 relative overflow-visible">
          {/* 축하 글로우 */}
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 h-40 w-40 rounded-full bg-gold/30 blur-3xl" />
          <div className="absolute -top-6 right-6 h-20 w-20 rounded-full bg-rose/20 blur-2xl" />

          <div className="relative text-center space-y-4">
            <div className="text-xs uppercase tracking-[0.2em] text-brown-light">
              Fully Bloomed
            </div>

            <div className="w-64 h-72 mx-auto">
              <FlowerIllustration waterCount={3} />
            </div>

            <div>
              <p className="text-xl font-heading font-bold text-brown-dark">
                만개했습니다!
              </p>
              <p className="mt-1 text-sm text-brown-mid">
                당신의 기도와 결단이 아름다운 꽃으로 피었어요
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => router.push("/garden?tab=cell")}
          className="w-full rounded-3xl bg-olive py-4 text-sm text-ivory shadow-sm transition-colors hover:bg-sage"
        >
          셀 꽃밭에 심으러 가기
        </button>

        <button
          onClick={handleNewFlower}
          disabled={acting}
          className="w-full rounded-3xl border border-stone bg-white/70 py-4 text-sm text-brown-mid transition-colors hover:bg-sand disabled:opacity-50"
        >
          {acting ? (
            <span className="inline-flex items-center justify-center gap-2">
              <Spinner size={14} />
              준비 중...
            </span>
          ) : "새 꽃 시작하기"}
        </button>
      </div>
    );
  }

  if (!flower) return null;

  const isComplete = flower.stage >= FLOWER_STAGES.BLOOM;
  const visualStage = Math.min(flower.waterCount, 3);
  const totalNeeded = WATER_THRESHOLDS[FLOWER_STAGES.BLOOM];
  const progress = Math.min(100, (flower.waterCount / totalNeeded) * 100);

  // ──── 완성 화면: 큰 이미지 + 심으러 가기 ────
  if (isComplete) {
    return (
      <div className="space-y-4">
        <div className="rounded-[28px] border border-stone bg-white/70 backdrop-blur-sm shadow-sm p-6 relative overflow-visible">
          {/* 축하 글로우 */}
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 h-40 w-40 rounded-full bg-gold/30 blur-3xl" />
          <div className="absolute -top-6 right-6 h-20 w-20 rounded-full bg-rose/20 blur-2xl" />

          <div className="relative text-center space-y-4">
            <div className="text-xs uppercase tracking-[0.2em] text-brown-light">
              Fully Bloomed
            </div>

            {/* 큰 완성 꽃 */}
            <div className="w-64 h-72 mx-auto">
              <FlowerIllustration waterCount={3} />
            </div>

            <div>
              <p className="text-xl font-heading font-bold text-brown-dark">
                만개했습니다!
              </p>
              <p className="mt-1 text-sm text-brown-mid">
                당신의 기도와 결단이 아름다운 꽃으로 피었어요
              </p>
            </div>
          </div>
        </div>

        {/* 심으러 가기 버튼 */}
        <button
          onClick={() => router.push("/garden?tab=cell")}
          className="w-full rounded-3xl bg-olive py-4 text-sm text-ivory shadow-sm transition-colors hover:bg-sage"
        >
          셀 꽃밭에 심으러 가기
        </button>

        {/* 새 꽃 시작 */}
        <button
          onClick={handleNewFlower}
          disabled={acting}
          className="w-full rounded-3xl border border-stone bg-white/70 py-4 text-sm text-brown-mid transition-colors hover:bg-sand disabled:opacity-50"
        >
          {acting ? (
            <span className="inline-flex items-center justify-center gap-2">
              <Spinner size={14} />
              준비 중...
            </span>
          ) : "새 꽃 시작하기"}
        </button>

        {completedFlowers.length > 0 && (
          <CompletedList flowers={completedFlowers} />
        )}
      </div>
    );
  }

  // ──── 성장 중 화면 ────
  return (
    <div className="space-y-4">
      <div className="rounded-[28px] border border-stone bg-white/70 backdrop-blur-sm shadow-sm p-5 relative overflow-visible">
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
            {STAGE_LABELS[visualStage]}
          </p>
        </div>

        {/* 성장 바 */}
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
      </div>

      {/* 물 주기 버튼 */}
      <button
        onClick={handleWater}
        disabled={waterCount <= 0 || acting}
        className="w-full rounded-3xl bg-sage py-4 text-sm text-ivory shadow-sm transition-colors hover:bg-olive disabled:opacity-40"
      >
        {acting ? (
          <span className="inline-flex items-center justify-center gap-2">
            <Spinner size={14} />
            물 주는 중...
          </span>
        ) : "물 주기"}
      </button>

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
