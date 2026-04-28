import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { epitaphs } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  emptyRecommendation,
  loadRecommendationForAuthor,
} from "@/lib/scripture/recommendation-service";

// TODO: 개역개정 원문 직접 저장/노출 전 대한성서공회 저작권 검토 필요

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const rows = await db
    .select({ id: epitaphs.id, userId: epitaphs.userId })
    .from(epitaphs)
    .where(eq(epitaphs.id, id))
    .limit(1);

  if (rows.length === 0) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (rows[0].userId !== session.user.id) {
    // 작성자 본인만 조회 가능 — 추천 내용은 절대 공개하지 않는다.
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const payload = await loadRecommendationForAuthor(id).catch(() =>
    emptyRecommendation(id)
  );
  return NextResponse.json(payload);
}
