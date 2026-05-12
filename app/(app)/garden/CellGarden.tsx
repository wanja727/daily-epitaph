"use client";

import { useRouter } from "next/navigation";
import { GARDEN_SLOTS, GARDEN_MAX_VISIBLE } from "@/lib/utils/constants";
import { placeFlowerInGarden } from "./actions";
import FlowerIllustration from "@/app/components/FlowerIllustration";
import { useLoading } from "@/app/components/LoadingProvider";

interface VisiblePlot {
  slot: number;
  flowerType: string;
  placedByNickname: string | null;
}

interface FlowerData {
  id: string;
  type: string;
  stage: number;
}

/** compact 모드에서 셀당 노출할 최대 꽃 수 (5×5 미니 그리드 성능 보호용) */
const COMPACT_MAX_VISIBLE = 100;

export default function CellGarden({
  visiblePlots,
  totalFlowerCount,
  cellName,
  cellId,
  completedFlowers,
  compact = false,
  onClick,
}: {
  visiblePlots: VisiblePlot[];
  totalFlowerCount: number;
  cellName: string | null;
  cellId: string | null;
  completedFlowers: FlowerData[];
  /**
   * 미니 프리뷰용. 켜면 헤더/심기 버튼/배경 텍스처/필터/애니메이션을 모두 제거하고
   * 꽃 수도 cap한다. 25개를 한 화면에 그리는 그리드에서 사용.
   */
  compact?: boolean;
  /** compact 모드에서 카드 전체 클릭 핸들러 (선택사항) */
  onClick?: () => void;
}) {
  const router = useRouter();
  const { isPending, startTransition } = useLoading();

  if (!cellId) {
    return (
      <div className="text-center py-16 text-brown-light text-sm">
        소속 셀이 없어 꽃밭을 사용할 수 없어요
      </div>
    );
  }

  const placeable = completedFlowers.filter((f) => f.stage >= 3);
  const renderedPlots = compact
    ? visiblePlots.slice(0, COMPACT_MAX_VISIBLE)
    : visiblePlots;

  function handlePlant() {
    if (isPending || placeable.length === 0) return;
    // 가장 오래된 완성 꽃을 자동 선택
    const flower = placeable[0];
    startTransition(async () => {
      await placeFlowerInGarden(flower.id);
      router.refresh();
    });
  }

  // ─── compact: 미니 프리뷰 카드 ───────────────────────────────────────────
  if (compact) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="group relative w-full overflow-hidden rounded-2xl border border-[#8BBF6A]/30 shadow-sm transition-transform active:scale-[0.97]"
        style={
          {
            aspectRatio: "4 / 4.5",
            contentVisibility: "auto",
            containIntrinsicSize: "80px 90px",
          } as React.CSSProperties
        }
        aria-label={`${cellName ?? "셀"} 꽃밭 보기`}
      >
        {/* 단순화된 잔디 배경 (그라디언트만) */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, #C2DBA8 0%, #B0D192 60%, #A0C67E 100%)",
          }}
        />

        {/* 꽃 배치 */}
        {renderedPlots.map((plot) => {
          const pos =
            plot.slot < GARDEN_MAX_VISIBLE ? GARDEN_SLOTS[plot.slot] : null;
          if (!pos) return null;
          const isJesus = plot.flowerType === "jesus";
          const sizeMultiplier = isJesus ? 1.5 : 1;
          return (
            <div
              key={plot.slot}
              className="absolute"
              style={{
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                width: `${10 * pos.scale * sizeMultiplier}%`,
                transform: "translate(-50%, -100%)",
                zIndex: isJesus ? Math.round(pos.y) + 500 : Math.round(pos.y),
              }}
            >
              <FlowerIllustration
                waterCount={3}
                size="sm"
                compact={true}
                flowerType={plot.flowerType}
              />
            </div>
          );
        })}

        {/* 빈 셀 안내 */}
        {renderedPlots.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[10px] text-[#7A9B62]">아직 비어있어요</span>
          </div>
        )}

        {/* 셀 이름 + 꽃 수 (하단 오버레이) */}
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-gradient-to-t from-black/45 via-black/15 to-transparent px-1.5 pb-1 pt-3">
          <span className="truncate text-[10px] font-medium text-white drop-shadow-sm">
            {cellName ?? "셀"}
          </span>
          <span className="shrink-0 text-[9px] tabular-nums text-white/90 drop-shadow-sm">
            🌷{totalFlowerCount}
          </span>
        </div>
      </button>
    );
  }

  return (
    <div className="space-y-4">
      {/* 꽃밭 카드 */}
      <div className="rounded-[28px] border border-[#8BBF6A]/30 bg-[#E8F0DE]/80 backdrop-blur-sm shadow-sm p-4 relative overflow-hidden">
        {/* 배경 글로우 */}
        <div className="absolute -top-8 -left-8 h-32 w-32 rounded-full bg-[#8BBF6A]/15 blur-3xl" />
        <div className="absolute -bottom-4 -right-4 h-24 w-24 rounded-full bg-gold/10 blur-2xl" />

        <div className="relative">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-brown-light">
                Cell garden
              </div>
              <div className="mt-1 text-lg font-heading font-bold text-brown-dark">
                {cellName} 꽃밭
              </div>
            </div>
            <span className="inline-flex rounded-full px-3 py-1 text-xs bg-[#DCE5D6] text-[#516047]">
              {totalFlowerCount}송이
            </span>
          </div>

          {/* 정원 영역 */}
          <div
            className="relative w-full rounded-[20px] overflow-hidden"
            style={{ aspectRatio: "4 / 4.5" }}
          >
            {/* 배경 SVG */}
            <svg
              viewBox="0 0 400 450"
              className="absolute inset-0 w-full h-full"
              xmlns="http://www.w3.org/2000/svg"
              preserveAspectRatio="xMidYMid slice"
            >
              <defs>
                <linearGradient id="grassGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#C2DBA8" />
                  <stop offset="50%" stopColor="#B0D192" />
                  <stop offset="100%" stopColor="#A0C67E" />
                </linearGradient>
              </defs>

              {/* 전체 잔디 배경 */}
              <rect width="400" height="450" fill="url(#grassGrad)" />

              {/* 잔디 텍스처 */}
              <path
                d="M30,60 Q33,50 36,60"
                stroke="#7EBF5C"
                strokeWidth="1"
                fill="none"
                opacity="0.25"
              />
              <path
                d="M120,100 Q123,90 126,100"
                stroke="#6DB04A"
                strokeWidth="1"
                fill="none"
                opacity="0.2"
              />
              <path
                d="M250,70 Q253,60 256,70"
                stroke="#7EBF5C"
                strokeWidth="1"
                fill="none"
                opacity="0.25"
              />
              <path
                d="M350,150 Q353,140 356,150"
                stroke="#6DB04A"
                strokeWidth="1"
                fill="none"
                opacity="0.2"
              />
              <path
                d="M80,250 Q83,240 86,250"
                stroke="#7EBF5C"
                strokeWidth="1"
                fill="none"
                opacity="0.2"
              />
              <path
                d="M300,300 Q303,290 306,300"
                stroke="#6DB04A"
                strokeWidth="1"
                fill="none"
                opacity="0.2"
              />
              <path
                d="M180,350 Q183,340 186,350"
                stroke="#7EBF5C"
                strokeWidth="1"
                fill="none"
                opacity="0.2"
              />

              {/* 밝은 하이라이트 */}
              <ellipse
                cx="100"
                cy="150"
                rx="45"
                ry="22"
                fill="#C4E4A8"
                opacity="0.15"
              />
              <ellipse
                cx="320"
                cy="250"
                rx="38"
                ry="18"
                fill="#C4E4A8"
                opacity="0.12"
              />
              <ellipse
                cx="200"
                cy="370"
                rx="42"
                ry="20"
                fill="#C4E4A8"
                opacity="0.1"
              />

              {/* 하단 울타리 */}
              <g opacity="0.35" stroke="#8B7355" fill="none" strokeWidth="1.8">
                {/* 세로 기둥 */}
                <line x1="15" y1="415" x2="15" y2="445" />
                <line x1="55" y1="418" x2="55" y2="448" />
                <line x1="95" y1="420" x2="95" y2="450" />
                <line x1="140" y1="421" x2="140" y2="450" />
                <line x1="185" y1="422" x2="185" y2="450" />
                <line x1="230" y1="422" x2="230" y2="450" />
                <line x1="275" y1="421" x2="275" y2="450" />
                <line x1="320" y1="420" x2="320" y2="450" />
                <line x1="360" y1="418" x2="360" y2="448" />
                <line x1="395" y1="415" x2="395" y2="445" />
                {/* 가로 바 */}
                <path d="M15,425 Q205,432 395,425" />
                <path d="M15,435 Q205,442 395,435" />
              </g>
            </svg>

            {/* 꽃 배치 */}
            {visiblePlots.map((plot) => {
              const pos =
                plot.slot < GARDEN_MAX_VISIBLE ? GARDEN_SLOTS[plot.slot] : null;
              if (!pos) return null;

              const isJesus = plot.flowerType === "jesus";
              const sizeMultiplier = isJesus ? 1.5 : 1;

              return (
                <div
                  key={plot.slot}
                  className="absolute"
                  style={{
                    left: `${pos.x}%`,
                    top: `${pos.y}%`,
                    width: `${10 * pos.scale * sizeMultiplier}%`,
                    transform: "translate(-50%, -100%)",
                    zIndex: isJesus
                      ? Math.round(pos.y) + 500
                      : Math.round(pos.y),
                  }}
                  title={plot.placedByNickname ?? undefined}
                >
                  <FlowerIllustration
                    waterCount={3}
                    size="sm"
                    animate={true}
                    delay={plot.slot * 0.15}
                    flowerType={plot.flowerType}
                  />
                </div>
              );
            })}

            {/* 80개 초과 시 추가 표시 */}
            {totalFlowerCount > GARDEN_MAX_VISIBLE && (
              <div className="absolute bottom-2 right-2 rounded-full bg-white/70 backdrop-blur-sm px-2.5 py-1 text-xs text-brown-mid shadow-sm">
                +{totalFlowerCount - GARDEN_MAX_VISIBLE}송이 더
              </div>
            )}

            {/* 빈 정원 안내 */}
            {visiblePlots.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-sm text-[#7A9B62] bg-white/50 backdrop-blur-sm rounded-full px-4 py-2">
                  첫 번째 꽃을 심어보세요
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 심기 버튼 */}
      {placeable.length > 0 ? (
        <button
          onClick={handlePlant}
          disabled={isPending}
          className="w-full py-3 rounded-2xl text-sm font-medium transition-colors bg-[#8BBF6A] text-white hover:bg-[#7AB05A] disabled:opacity-50"
        >
          {isPending
            ? "심는 중..."
            : `꽃밭에 심기 (${placeable.length}송이 대기)`}
        </button>
      ) : (
        <p className="text-xs text-brown-light text-center">
          꽃을 완성하면 여기에 심을 수 있어요
        </p>
      )}
    </div>
  );
}
