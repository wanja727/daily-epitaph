import { db } from "@/lib/db";
import { scriptureRecommendations } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { buildCardText, sanitizeCardText } from "./sanitize";
import { fetchVerseCandidates } from "./verse-repository";
import {
  recommendScripturesWithGemini,
  type GeminiRecommendationResult,
} from "@/lib/ai/gemini";

// TODO: 개역개정 원문 직접 저장/노출 전 대한성서공회 저작권 검토 필요

export type RecommendationPayload = {
  epitaphId: string;
  isAuthor: true;
  themes: string[];
  situationTags: string[];
  emotionTags: string[];
  recommendations: Array<{ reference: string; reason: string; deepLinkUrl: string }>;
};

export function emptyRecommendation(epitaphId: string): RecommendationPayload {
  return {
    epitaphId,
    isAuthor: true,
    themes: [],
    situationTags: [],
    emotionTags: [],
    recommendations: [],
  };
}

/**
 * epitaph 내용으로 Gemini에 말씀 추천을 요청하고 결과를 DB에 upsert 한다.
 * 실패 시 예외를 던진다. 호출부에서 try/catch 로 조용히 무시해도 좋다.
 */
export async function generateAndStoreRecommendation(params: {
  epitaphId: string;
  yesterday: string;
  today: string;
}): Promise<RecommendationPayload> {
  const { epitaphId, yesterday, today } = params;

  const cardText = buildCardText(yesterday, today);
  const sanitizedText = sanitizeCardText(cardText);

  const candidates = await fetchVerseCandidates(80);
  if (candidates.length === 0) {
    throw new Error("추천 후보 구절이 비어 있습니다. verses 시드를 먼저 실행하세요.");
  }

  const result = await recommendScripturesWithGemini(sanitizedText, candidates);
  await upsertRecommendation(epitaphId, result);

  return { epitaphId, isAuthor: true, ...result };
}

async function upsertRecommendation(
  epitaphId: string,
  result: GeminiRecommendationResult
): Promise<void> {
  const existing = await db
    .select({ id: scriptureRecommendations.id })
    .from(scriptureRecommendations)
    .where(eq(scriptureRecommendations.epitaphId, epitaphId))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(scriptureRecommendations)
      .set({
        themes: result.themes,
        situationTags: result.situationTags,
        emotionTags: result.emotionTags,
        recommendations: result.recommendations,
        updatedAt: new Date(),
      })
      .where(eq(scriptureRecommendations.epitaphId, epitaphId));
  } else {
    await db.insert(scriptureRecommendations).values({
      epitaphId,
      themes: result.themes,
      situationTags: result.situationTags,
      emotionTags: result.emotionTags,
      recommendations: result.recommendations,
    });
  }
}

export async function loadRecommendationForAuthor(
  epitaphId: string
): Promise<RecommendationPayload> {
  const rows = await db
    .select()
    .from(scriptureRecommendations)
    .where(eq(scriptureRecommendations.epitaphId, epitaphId))
    .limit(1);

  if (rows.length === 0) return emptyRecommendation(epitaphId);

  const r = rows[0];
  return {
    epitaphId,
    isAuthor: true,
    themes: r.themes ?? [],
    situationTags: r.situationTags ?? [],
    emotionTags: r.emotionTags ?? [],
    recommendations: r.recommendations ?? [],
  };
}
