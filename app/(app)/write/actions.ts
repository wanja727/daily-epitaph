"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { epitaphs, wateringCans } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getTodayKST } from "@/lib/utils/date";

export async function upsertEpitaph(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const MAX_LENGTH = 2000;
  const yesterday = (formData.get("yesterday") as string)?.trim().slice(0, MAX_LENGTH);
  const today = (formData.get("today") as string)?.trim().slice(0, MAX_LENGTH);

  if (!yesterday || !today) return;

  const todayDate = getTodayKST();
  const userId = session.user.id;

  // 오늘 이미 작성했는지 확인
  const existing = await db
    .select({ id: epitaphs.id })
    .from(epitaphs)
    .where(and(eq(epitaphs.userId, userId), eq(epitaphs.date, todayDate)))
    .limit(1);

  if (existing.length > 0) {
    // 수정
    await db
      .update(epitaphs)
      .set({ yesterday, today, updatedAt: new Date() })
      .where(and(eq(epitaphs.userId, userId), eq(epitaphs.date, todayDate)));
  } else {
    // 신규 작성
    await db.insert(epitaphs).values({
      userId,
      yesterday,
      today,
      date: todayDate,
    });

    // 물뿌리개 +1 (최초 작성 시에만)
    await db
      .update(wateringCans)
      .set({ count: sql`${wateringCans.count} + 1` })
      .where(eq(wateringCans.userId, userId));
  }

  redirect("/main");
}
