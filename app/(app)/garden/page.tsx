import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  flowers,
  gardenPlots,
  wateringCans,
  users,
  cells,
} from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import GardenView from "./GardenView";

export default async function GardenPage() {
  const session = await auth();
  const userId = session!.user.id;
  const cellId = session!.user.cellId;

  // 내 물뿌리개
  const [can] = await db
    .select({ count: wateringCans.count })
    .from(wateringCans)
    .where(eq(wateringCans.userId, userId))
    .limit(1);
  const waterCount = can?.count ?? 0;

  // 현재 키우고 있는 꽃 (완성되지 않은 꽃)
  const [activeFlower] = await db
    .select()
    .from(flowers)
    .where(and(eq(flowers.userId, userId), isNull(flowers.completedAt)))
    .limit(1);

  // 완성되었지만 아직 꽃밭에 심지 않은 꽃들
  const completedFlowers = await db
    .select()
    .from(flowers)
    .where(and(eq(flowers.userId, userId), eq(flowers.placedInGarden, false)))
    .then((rows) => rows.filter((r) => r.completedAt !== null));

  // 셀 꽃밭 데이터
  let plots: {
    x: number;
    y: number;
    flowerId: string | null;
    flowerType: string | null;
    placedByNickname: string | null;
  }[] = [];
  let cellName: string | null = null;

  if (cellId) {
    const [cell] = await db
      .select({ name: cells.name })
      .from(cells)
      .where(eq(cells.id, cellId))
      .limit(1);
    cellName = cell?.name ?? null;

    const rawPlots = await db
      .select({
        x: gardenPlots.x,
        y: gardenPlots.y,
        flowerId: gardenPlots.flowerId,
        flowerType: flowers.type,
        placedByNickname: users.nickname,
      })
      .from(gardenPlots)
      .leftJoin(flowers, eq(gardenPlots.flowerId, flowers.id))
      .leftJoin(users, eq(gardenPlots.placedBy, users.id))
      .where(eq(gardenPlots.cellId, cellId));

    plots = rawPlots;
  }

  return (
    <div className="px-5 py-5 space-y-4">
      {/* 헤더 */}
      <div className="text-xs tracking-[0.25em] uppercase text-brown-light">
        Empty Tomb Project
      </div>

      <div>
        <h2 className="text-[28px] leading-[1.1] font-heading font-bold text-brown-dark">
          물 주기
        </h2>
        <p className="mt-2 text-sm text-brown-mid leading-6">
          하나님의 땅에서 풍성히 자라나도록 기도하며 물을 주세요.
        </p>
      </div>

      <GardenView
        activeFlower={activeFlower ?? null}
        completedFlowers={completedFlowers}
        waterCount={waterCount}
        plots={plots}
        cellName={cellName}
        cellId={cellId ?? null}
      />
    </div>
  );
}
