"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  epitaphReactions,
  serviceImpressionReactions,
  serviceImpressions,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import type { ReactionType } from "@/lib/utils/constants";
import { REACTION_TYPES } from "@/lib/utils/constants";
import { EVENT_BANNER_COOKIE } from "@/lib/utils/event";
import { getTodayKST } from "@/lib/utils/date";

export async function toggleReaction(epitaphId: string, type: ReactionType) {
  const session = await auth();
  if (!session?.user?.id) return { error: "로그인이 필요합니다." };
  if (!(type in REACTION_TYPES)) return { error: "잘못된 반응 타입입니다." };

  const userId = session.user.id;

  const [existing] = await db
    .select({ id: epitaphReactions.id, type: epitaphReactions.type })
    .from(epitaphReactions)
    .where(
      and(
        eq(epitaphReactions.epitaphId, epitaphId),
        eq(epitaphReactions.userId, userId),
      ),
    )
    .limit(1);

  if (existing) {
    if (existing.type === type) {
      // 같은 반응 → 취소
      await db
        .delete(epitaphReactions)
        .where(eq(epitaphReactions.id, existing.id));
      revalidatePath("/main");
      return { reacted: null };
    }
    // 다른 반응 → 교체
    await db
      .update(epitaphReactions)
      .set({ type })
      .where(eq(epitaphReactions.id, existing.id));
    revalidatePath("/main");
    return { reacted: type };
  }

  // 새 반응
  await db
    .insert(epitaphReactions)
    .values({ epitaphId, userId, type });

  revalidatePath("/main");
  return { reacted: type };
}

export async function toggleImpressionReaction(
  impressionId: string,
  type: ReactionType,
) {
  const session = await auth();
  if (!session?.user?.id) return { error: "로그인이 필요합니다." };
  if (!(type in REACTION_TYPES)) return { error: "잘못된 반응 타입입니다." };

  const userId = session.user.id;

  const [existing] = await db
    .select({
      id: serviceImpressionReactions.id,
      type: serviceImpressionReactions.type,
    })
    .from(serviceImpressionReactions)
    .where(
      and(
        eq(serviceImpressionReactions.impressionId, impressionId),
        eq(serviceImpressionReactions.userId, userId),
      ),
    )
    .limit(1);

  if (existing) {
    if (existing.type === type) {
      await db
        .delete(serviceImpressionReactions)
        .where(eq(serviceImpressionReactions.id, existing.id));
      revalidatePath("/main");
      return { reacted: null };
    }
    await db
      .update(serviceImpressionReactions)
      .set({ type })
      .where(eq(serviceImpressionReactions.id, existing.id));
    revalidatePath("/main");
    return { reacted: type };
  }

  await db
    .insert(serviceImpressionReactions)
    .values({ impressionId, userId, type });

  revalidatePath("/main");
  return { reacted: type };
}

export async function updateImpression(impressionId: string, content: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "로그인이 필요합니다." };

  const IMPRESSION_MAX_LENGTH = 1000;
  const trimmed = content.trim().slice(0, IMPRESSION_MAX_LENGTH);
  if (trimmed.length === 0) return { error: "내용을 입력해 주세요." };

  // 본인 소감만 수정 가능. impressionId + userId 동시 일치 시에만 갱신.
  const result = await db
    .update(serviceImpressions)
    .set({ content: trimmed, updatedAt: new Date() })
    .where(
      and(
        eq(serviceImpressions.id, impressionId),
        eq(serviceImpressions.userId, session.user.id),
      ),
    )
    .returning({ id: serviceImpressions.id });

  if (result.length === 0) return { error: "수정 권한이 없습니다." };

  revalidatePath("/main");
  return { ok: true as const };
}

/**
 * 메인 화면 이벤트 배너의 "오늘 다시 보지 않기" 처리.
 * 쿠키 값에 KST 오늘 날짜를 저장. 배너 노출 시 쿠키 값과 오늘 날짜가 같으면 숨긴다.
 * 자정(KST)이 지나면 자동으로 다시 노출된다.
 */
export async function dismissEventBanner() {
  const cookieStore = await cookies();
  cookieStore.set(EVENT_BANNER_COOKIE, getTodayKST(), {
    path: "/",
    maxAge: 60 * 60 * 24, // 24h
    sameSite: "lax",
    httpOnly: false,
  });
  revalidatePath("/main");
}
