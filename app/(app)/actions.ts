"use server";

import { db } from "@/lib/db";
import { dailyVisits } from "@/lib/db/schema";
import { getTodayKST } from "@/lib/utils/date";

/** 오늘 방문 기록 (중복 시 무시) */
export async function recordDailyVisit(userId: string) {
  const today = getTodayKST();
  await db
    .insert(dailyVisits)
    .values({ userId, date: today })
    .onConflictDoNothing();
}
