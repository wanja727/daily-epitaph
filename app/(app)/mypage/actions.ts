"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function updateNickname(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { error: "로그인이 필요합니다." };

  const nickname = (formData.get("nickname") as string)?.trim();

  if (!nickname) return { error: "닉네임을 입력해주세요." };
  if (nickname.length > 20) return { error: "닉네임은 20자 이내로 입력해주세요." };

  await db
    .update(users)
    .set({ nickname })
    .where(eq(users.id, session.user.id));

  revalidatePath("/mypage");
  return { success: true };
}
