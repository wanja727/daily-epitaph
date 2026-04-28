"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { epitaphs, wateringCans } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getTodayKST } from "@/lib/utils/date";
import { generateAndStoreRecommendation } from "@/lib/scripture/recommendation-service";

// TODO: 개역개정 원문 직접 저장/노출 전 대한성서공회 저작권 검토 필요

export async function upsertEpitaph(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const MAX_LENGTH = 2000;
  const yesterday = (formData.get("yesterday") as string)?.trim().slice(0, MAX_LENGTH);
  const today = (formData.get("today") as string)?.trim().slice(0, MAX_LENGTH);
  const requestScriptureRecommendation =
    formData.get("requestScriptureRecommendation") === "true";

  if (!yesterday || !today) return;

  const todayDate = getTodayKST();
  const userId = session.user.id;

  // 오늘 이미 작성했는지 확인
  const existing = await db
    .select({ id: epitaphs.id })
    .from(epitaphs)
    .where(and(eq(epitaphs.userId, userId), eq(epitaphs.date, todayDate)))
    .limit(1);

  let epitaphId: string;

  if (existing.length > 0) {
    // 수정
    epitaphId = existing[0].id;
    await db
      .update(epitaphs)
      .set({
        yesterday,
        today,
        requestScriptureRecommendation,
        updatedAt: new Date(),
      })
      .where(eq(epitaphs.id, epitaphId));
  } else {
    // 신규 작성
    const inserted = await db
      .insert(epitaphs)
      .values({
        userId,
        yesterday,
        today,
        date: todayDate,
        requestScriptureRecommendation,
      })
      .returning({ id: epitaphs.id });
    epitaphId = inserted[0].id;

    // 물뿌리개 +1 (최초 작성 시에만)
    await db
      .update(wateringCans)
      .set({ count: sql`${wateringCans.count} + 1` })
      .where(eq(wateringCans.userId, userId));
  }

  // opt-in인 경우에만 Gemini 호출 — 단일 요청/응답 안에서 동기 처리.
  // 실패해도 카드 저장은 유지하고 조용히 무시한다.
  if (requestScriptureRecommendation) {
    try {
      await generateAndStoreRecommendation({ epitaphId, yesterday, today });
      await db
        .update(epitaphs)
        .set({ recommendationUpdatedAt: new Date() })
        .where(eq(epitaphs.id, epitaphId));
    } catch (err) {
      console.error("[scripture] recommendation failed", err);
    }
  }

  redirect("/main");
}
