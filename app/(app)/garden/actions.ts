"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { flowers, wateringCans, gardenPlots } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
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

export async function startNewFlower() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  await db.insert(flowers).values({
    userId: session.user.id,
    type: "flower",
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
