"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  flowers,
  wateringCans,
  gardenPlots,
  cells,
  users,
  epitaphs,
} from "@/lib/db/schema";
import { eq, and, asc, sql, desc } from "drizzle-orm";
import { redirect } from "next/navigation";
import { WATER_THRESHOLDS, FLOWER_STAGES } from "@/lib/utils/constants";

export async function waterFlower(flowerId: string) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  // 물뿌리개 확인
  const [can] = await db
    .select({ count: wateringCans.count })
    .from(wateringCans)
    .where(eq(wateringCans.userId, userId))
    .limit(1);

  if (!can || can.count <= 0) return;

  // 꽃 조회
  const [flower] = await db
    .select()
    .from(flowers)
    .where(and(eq(flowers.id, flowerId), eq(flowers.userId, userId)))
    .limit(1);

  if (!flower || flower.completedAt) return;

  // 물뿌리개 -1
  await db
    .update(wateringCans)
    .set({ count: sql`${wateringCans.count} - 1` })
    .where(eq(wateringCans.userId, userId));

  const newWaterCount = flower.waterCount + 1;
  let newStage = flower.stage;
  let completedAt: Date | null = null;

  // 단계 확인
  if (
    newStage === FLOWER_STAGES.SEEDLING &&
    newWaterCount >= WATER_THRESHOLDS[FLOWER_STAGES.BUD]
  ) {
    newStage = FLOWER_STAGES.BUD;
  }
  if (
    newStage === FLOWER_STAGES.BUD &&
    newWaterCount >= WATER_THRESHOLDS[FLOWER_STAGES.BLOOM]
  ) {
    newStage = FLOWER_STAGES.BLOOM;
    completedAt = new Date();
  }

  await db
    .update(flowers)
    .set({
      waterCount: newWaterCount,
      stage: newStage,
      completedAt,
    })
    .where(eq(flowers.id, flowerId));
}

export async function startNewFlower(flowerType: string = "flower") {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  await db.insert(flowers).values({
    userId: session.user.id,
    type: flowerType,
    stage: 1,
    waterCount: 0,
  });
}

export async function placeFlowerInGarden(flowerId: string) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;
  const cellId = session.user.cellId;
  if (!cellId) return;

  // 꽃이 완성되었고, 아직 심지 않았는지 확인
  const [flower] = await db
    .select()
    .from(flowers)
    .where(and(eq(flowers.id, flowerId), eq(flowers.userId, userId)))
    .limit(1);

  if (!flower || !flower.completedAt || flower.placedInGarden) return;

  // 이미 사용 중인 슬롯 목록 조회
  const usedSlots = await db
    .select({ slot: gardenPlots.slot })
    .from(gardenPlots)
    .where(eq(gardenPlots.cellId, cellId));

  const usedSet = new Set(usedSlots.map((r) => r.slot));

  // 비어 있는 가장 작은 슬롯 번호 찾기
  let nextSlot = 0;
  while (usedSet.has(nextSlot)) nextSlot++;

  // 꽃밭에 심기 (INSERT — 동적 행 생성)
  await db.insert(gardenPlots).values({
    cellId,
    slot: nextSlot,
    flowerId,
    placedBy: userId,
  });

  // 꽃에 심김 표시
  await db
    .update(flowers)
    .set({ placedInGarden: true })
    .where(eq(flowers.id, flowerId));
}

/** 전체 셀의 꽃 수 + 물뿌리개 합산 통계 */
export async function getCellStats() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // 셀별 심겨진 꽃 수
  const flowerStats = await db
    .select({
      cellId: gardenPlots.cellId,
      flowerCount: sql<number>`count(*)::int`,
    })
    .from(gardenPlots)
    .groupBy(gardenPlots.cellId);

  const flowerMap = new Map(flowerStats.map((r) => [r.cellId, r.flowerCount]));

  // 셀별 작성 카드 누적 수 (물병 누적 = 카드 작성 건수)
  const cardStats = await db
    .select({
      cellId: users.cellId,
      cardCount: sql<number>`count(${epitaphs.id})::int`,
    })
    .from(users)
    .leftJoin(epitaphs, eq(users.id, epitaphs.userId))
    .where(sql`${users.cellId} is not null`)
    .groupBy(users.cellId);

  const waterMap = new Map(cardStats.map((r) => [r.cellId!, r.cardCount]));

  // 전체 셀 목록
  const allCells = await db.select().from(cells);

  const result = allCells
    .map((c) => ({
      id: c.id,
      name: c.name,
      flowerCount: flowerMap.get(c.id) ?? 0,
      waterCount: waterMap.get(c.id) ?? 0,
    }))
    .sort((a, b) => b.flowerCount + b.waterCount - (a.flowerCount + a.waterCount));

  return result;
}

/** 특정 셀의 꽃밭 데이터 조회 (구경용) */
export async function getCellGardenData(cellId: string) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [cell] = await db
    .select({ name: cells.name })
    .from(cells)
    .where(eq(cells.id, cellId))
    .limit(1);

  if (!cell) return null;

  const visiblePlots = await db
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

  const [countRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(gardenPlots)
    .where(eq(gardenPlots.cellId, cellId));

  return {
    cellName: cell.name,
    visiblePlots,
    totalFlowerCount: countRow?.count ?? 0,
  };
}
