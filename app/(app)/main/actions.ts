"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { epitaphReactions } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type { ReactionType } from "@/lib/utils/constants";
import { REACTION_TYPES } from "@/lib/utils/constants";

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
