"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { epitaphs, epitaphAmens } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function toggleAmen(epitaphId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "로그인이 필요합니다." };

  const userId = session.user.id;

  const [existing] = await db
    .select({ id: epitaphAmens.id })
    .from(epitaphAmens)
    .where(
      and(
        eq(epitaphAmens.epitaphId, epitaphId),
        eq(epitaphAmens.userId, userId)
      )
    )
    .limit(1);

  if (existing) {
    await db.delete(epitaphAmens).where(eq(epitaphAmens.id, existing.id));
    await db
      .update(epitaphs)
      .set({ amenCount: sql`GREATEST(${epitaphs.amenCount} - 1, 0)` })
      .where(eq(epitaphs.id, epitaphId));
  } else {
    await db.insert(epitaphAmens).values({ epitaphId, userId });
    await db
      .update(epitaphs)
      .set({ amenCount: sql`${epitaphs.amenCount} + 1` })
      .where(eq(epitaphs.id, epitaphId));
  }

  revalidatePath("/main");
  return { amened: !existing };
}
