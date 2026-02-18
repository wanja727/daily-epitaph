"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { epitaphs } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { redirect } from "next/navigation";

function getTodayKST(): string {
  return new Date()
    .toLocaleDateString("ko-KR", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
    .replace(/\. /g, "-")
    .replace(/\.$/, "");
}

export async function upsertEpitaph(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const content = formData.get("content");
  if (typeof content !== "string" || content.trim().length === 0) {
    return { error: "내용을 입력해주세요." };
  }
  if (content.trim().length > 100) {
    return { error: "100자 이하로 작성해주세요." };
  }

  const today = getTodayKST();
  const userId = session.user.id;

  // Check if today's epitaph already exists
  const existing = await db
    .select({ id: epitaphs.id })
    .from(epitaphs)
    .where(and(eq(epitaphs.userId, userId), eq(epitaphs.date, today)))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(epitaphs)
      .set({ content: content.trim(), updatedAt: new Date() })
      .where(and(eq(epitaphs.userId, userId), eq(epitaphs.date, today)));
  } else {
    await db.insert(epitaphs).values({
      userId,
      content: content.trim(),
      date: today,
    });
  }

  redirect("/");
}
