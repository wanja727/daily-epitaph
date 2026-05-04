"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  epitaphs,
  serviceImpressions,
  users,
  wateringCans,
} from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getTodayKST } from "@/lib/utils/date";
import { generateAndStoreRecommendation } from "@/lib/scripture/recommendation-service";
import { REPENT_CATEGORY_VALUES } from "@/lib/utils/constants";

// TODO: 개역개정 원문 직접 저장/노출 전 대한성서공회 저작권 검토 필요

export async function upsertEpitaph(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const MAX_LENGTH = 2000;
  const IMPRESSION_MAX_LENGTH = 1000;
  const yesterday = (formData.get("yesterday") as string)?.trim().slice(0, MAX_LENGTH);
  const today = (formData.get("today") as string)?.trim().slice(0, MAX_LENGTH);
  const impressionRaw = formData.get("impression");
  const impression =
    typeof impressionRaw === "string"
      ? impressionRaw.trim().slice(0, IMPRESSION_MAX_LENGTH)
      : "";
  const requestedRecommendation =
    formData.get("requestScriptureRecommendation") === "true";

  // 회개 카테고리: 알려진 값만 허용하고 중복 제거. 최소 1개 미만이면 무시(클라이언트 가드 우회 차단).
  const allowedCategories = new Set<string>(REPENT_CATEGORY_VALUES);
  const repentCategories = Array.from(
    new Set(
      formData
        .getAll("repentCategories")
        .filter((v): v is string => typeof v === "string")
        .filter((v) => allowedCategories.has(v)),
    ),
  );

  if (!yesterday || !today || repentCategories.length === 0) return;

  const todayDate = getTodayKST();
  const userId = session.user.id;

  // 화이트리스트 가드: 클라이언트에서 어떤 값을 보내든, 권한 없는 사용자는 무시한다.
  // (UI 에서 토글이 숨겨져 있어도 서버 측에서 다시 한 번 차단)
  let requestScriptureRecommendation = false;
  if (requestedRecommendation) {
    const [u] = await db
      .select({ enabled: users.scriptureRecommendationEnabled })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    requestScriptureRecommendation = u?.enabled === true;
  }

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
        repentCategories,
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
        repentCategories,
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

  // 빈무덤 소감: 사용자당 1회만 허용. 이미 작성한 사람의 입력은 무시한다.
  // (UI 에서 영역이 숨겨져 있어도 서버 측에서 다시 한 번 차단)
  if (impression.length > 0) {
    await db
      .insert(serviceImpressions)
      .values({ userId, content: impression })
      .onConflictDoNothing({ target: serviceImpressions.userId });
  }

  // opt-in인 경우에만 Gemini 호출 — 단일 요청/응답 안에서 동기 처리.
  // 실패해도 카드 저장은 유지하고 조용히 무시한다.
  if (requestScriptureRecommendation) {
    try {
      await generateAndStoreRecommendation({ epitaphId, userId, yesterday, today });
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
