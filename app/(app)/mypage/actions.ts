"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, cellMembers } from "@/lib/db/schema";
import { eq, and, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function updateNickname(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { error: "로그인이 필요합니다." };

  const nickname = (formData.get("nickname") as string)?.trim();

  if (!nickname) return { error: "닉네임을 입력해주세요." };
  if (nickname.length > 20) return { error: "닉네임은 20자 이내로 입력해주세요." };

  // 타인 실명 사칭 방지: 닉네임이 다른 구성원의 실명과 일치하는지 확인
  const [user] = await db
    .select({ realName: users.realName })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  const [matchedMember] = await db
    .select({ name: cellMembers.name })
    .from(cellMembers)
    .where(eq(cellMembers.name, nickname))
    .limit(1);

  if (matchedMember && matchedMember.name !== user?.realName) {
    return { error: "다른 구성원의 이름은 닉네임으로 사용할 수 없습니다." };
  }

  await db
    .update(users)
    .set({ nickname })
    .where(eq(users.id, session.user.id));

  revalidatePath("/mypage");
  return { success: true };
}
