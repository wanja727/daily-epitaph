"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, cellMembers, wateringCans } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

export async function completeOnboarding(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const realName = (formData.get("realName") as string)?.trim();
  const nickname = (formData.get("nickname") as string)?.trim();

  if (!realName) return { error: "실명을 입력해주세요." };
  if (!nickname) return { error: "닉네임을 입력해주세요." };

  // 타인 실명 사칭 방지: 닉네임에 다른 구성원의 실명이 포함되는지 확인
  const allMembers = await db
    .select({ name: cellMembers.name })
    .from(cellMembers);

  const otherNames = allMembers
    .map((m) => m.name)
    .filter((name) => name !== realName);

  if (otherNames.some((name) => nickname.includes(name))) {
    return { error: "다른 구성원의 이름이 포함된 닉네임은 사용할 수 없습니다." };
  }

  // 셀 자동 매칭: cellMembers에서 실명으로 검색
  const [matched] = await db
    .select({ cellId: cellMembers.cellId })
    .from(cellMembers)
    .where(eq(cellMembers.name, realName))
    .limit(1);

  // 사용자 정보 업데이트
  await db
    .update(users)
    .set({
      realName,
      nickname,
      cellId: matched?.cellId ?? null,
      onboardingCompleted: true,
    })
    .where(eq(users.id, session.user.id));

  // 물뿌리개 초기화
  await db
    .insert(wateringCans)
    .values({ userId: session.user.id, count: 0 })
    .onConflictDoNothing();

  redirect("/main");
}
