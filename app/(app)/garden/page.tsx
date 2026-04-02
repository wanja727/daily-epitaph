import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  flowers,
  gardenPlots,
  wateringCans,
  users,
  cells,
} from "@/lib/db/schema";
import { eq, and, isNull, asc, desc, sql } from "drizzle-orm";
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
    .orderBy(desc(flowers.completedAt))
    .then((rows) => rows.filter((r) => r.completedAt !== null));

  // 셀 꽃밭 데이터
  let visiblePlots: {
    slot: number;
    flowerType: string;
    placedByNickname: string | null;
  }[] = [];
  let totalFlowerCount = 0;
  let cellName: string | null = null;

  if (cellId) {
    const [cell] = await db
      .select({ name: cells.name })
      .from(cells)
      .where(eq(cells.id, cellId))
      .limit(1);
    cellName = cell?.name ?? null;

    // 화면에 표시할 꽃 (최대 80개, 슬롯 순)
    visiblePlots = await db
      .select({
        slot: gardenPlots.slot,
        flowerType: flowers.type,
        placedByNickname: users.nickname,
      })
      .from(gardenPlots)
      .innerJoin(flowers, eq(gardenPlots.flowerId, flowers.id))
      .leftJoin(users, eq(gardenPlots.placedBy, users.id))
      .where(eq(gardenPlots.cellId, cellId))
      .orderBy(asc(gardenPlots.slot))
      .limit(120);

    // 전체 꽃 수
    const [countRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(gardenPlots)
      .where(eq(gardenPlots.cellId, cellId));
    totalFlowerCount = countRow?.count ?? 0;
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
        visiblePlots={visiblePlots}
        totalFlowerCount={totalFlowerCount}
        cellName={cellName}
        cellId={cellId ?? null}
      />
    </div>
  );
}
