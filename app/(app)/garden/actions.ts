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
import {
  WATER_THRESHOLDS,
  FLOWER_STAGES,
  PROJECT_DAYS,
} from "@/lib/utils/constants";
import { getProjectDay, isWritingPeriodOver } from "@/lib/utils/date";

export async function waterFlower(flowerId: string) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  // 꽃 조회
  const [flower] = await db
    .select()
    .from(flowers)
    .where(and(eq(flowers.id, flowerId), eq(flowers.userId, userId)))
    .limit(1);

  if (!flower || flower.completedAt) return;

  // 예수님꽃은 무료 물주기 (모두가 마지막 날 심을 수 있도록 안전장치)
  const isJesus = flower.type === "jesus";

  if (!isJesus) {
    // 물뿌리개 확인
    const [can] = await db
      .select({ count: wateringCans.count })
      .from(wateringCans)
      .where(eq(wateringCans.userId, userId))
      .limit(1);

    const canCount = can?.count ?? 0;

    // 작성 기간 종료(41일차+) 후엔 보유한 물을 모두 소진한 사용자도
    // 진행중인 꽃을 은혜로 마무리할 수 있도록 차감을 건너뜀.
    if (canCount <= 0 && !isWritingPeriodOver()) return;

    if (canCount > 0) {
      await db
        .update(wateringCans)
        .set({ count: sql`${wateringCans.count} - 1` })
        .where(eq(wateringCans.userId, userId));
    }
  }

  const newWaterCount = flower.waterCount + 1;
  let newStage = flower.stage;
  let completedAt: Date | null = null;

  // 예수님꽃: 물 1번으로 바로 만개
  const bloomThreshold =
    flower.type === "jesus" ? 1 : WATER_THRESHOLDS[FLOWER_STAGES.BLOOM];

  // 단계 확인
  if (
    newStage === FLOWER_STAGES.SEEDLING &&
    newWaterCount >= WATER_THRESHOLDS[FLOWER_STAGES.BUD]
  ) {
    newStage = FLOWER_STAGES.BUD;
  }
  if (
    newStage === FLOWER_STAGES.BUD &&
    newWaterCount >= bloomThreshold
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
  const userId = session.user.id;

  // 예수님꽃은 마지막 날(40일차)에만, 1인당 1회만 심을 수 있음
  if (flowerType === "jesus") {
    if (getProjectDay() !== PROJECT_DAYS) return;

    const existing = await db
      .select({ id: flowers.id })
      .from(flowers)
      .where(and(eq(flowers.userId, userId), eq(flowers.type, "jesus")))
      .limit(1);
    if (existing.length > 0) return;

    await db.insert(flowers).values({
      userId,
      type: "jesus",
      stage: FLOWER_STAGES.BUD, // 새싹/봉우리 단계 건너뜀
      waterCount: 0,
    });
    return;
  }

  // 작성 기간 종료 후엔 보유한 물뿌리개가 있을 때만 새 꽃을 시작할 수 있음
  // (은혜 모드로 무한정 새 꽃을 만들어내는 것을 방지)
  if (isWritingPeriodOver()) {
    const [can] = await db
      .select({ count: wateringCans.count })
      .from(wateringCans)
      .where(eq(wateringCans.userId, userId))
      .limit(1);
    if (!can || can.count <= 0) return;
  }

  await db.insert(flowers).values({
    userId,
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

/**
 * 모든 셀의 미니 꽃밭 프리뷰 데이터 (다른셀 구경가기 하단 5×5 그리드용).
 * 셀당 노출할 꽃 수는 호출 측 cap에 맡기지만, 트래픽 보호를 위해 쿼리 단계에서도 충분히 작게 제한한다.
 */
export async function getAllCellsGardenPreview() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // 셀별 꽃 (slot 작은 순서로 정렬 — GARDEN_SLOTS 가 center-out 정렬이므로 슬롯이 작을수록 중앙)
  const allPlots = await db
    .select({
      cellId: gardenPlots.cellId,
      slot: gardenPlots.slot,
      flowerType: flowers.type,
    })
    .from(gardenPlots)
    .innerJoin(flowers, eq(gardenPlots.flowerId, flowers.id))
    .orderBy(asc(gardenPlots.cellId), asc(gardenPlots.slot));

  // 셀별 카운트
  const flowerCountStats = await db
    .select({
      cellId: gardenPlots.cellId,
      count: sql<number>`count(*)::int`,
    })
    .from(gardenPlots)
    .groupBy(gardenPlots.cellId);
  const countMap = new Map(flowerCountStats.map((r) => [r.cellId, r.count]));

  // 전체 셀 (꽃이 없는 셀도 빈 카드로 노출)
  const allCells = await db.select().from(cells);

  // 셀별로 plots 묶기 (이미 cellId 정렬되어 있음)
  const plotsByCell = new Map<
    string,
    Array<{ slot: number; flowerType: string; placedByNickname: string | null }>
  >();
  for (const p of allPlots) {
    if (!plotsByCell.has(p.cellId)) plotsByCell.set(p.cellId, []);
    plotsByCell.get(p.cellId)!.push({
      slot: p.slot,
      flowerType: p.flowerType,
      placedByNickname: null, // 미니뷰엔 닉네임 표시 안 함 (페이로드 절약)
    });
  }

  return allCells
    .map((c) => ({
      id: c.id,
      name: c.name,
      visiblePlots: plotsByCell.get(c.id) ?? [],
      totalFlowerCount: countMap.get(c.id) ?? 0,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "ko"));
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
