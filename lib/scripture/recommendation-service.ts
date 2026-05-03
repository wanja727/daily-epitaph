import { db } from "@/lib/db";
import { scriptureRecommendations } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { buildEpitaphRecommendationText, sanitizeForGemini } from "./sanitize";
import {
  compactVerseForPrompt,
  fetchVerseCandidates,
  findVerseCandidatesByEmbedding,
  type VerseCandidate,
} from "./verse-repository";
import {
  embedText,
  selectScriptureRecommendations,
  type AiRecommendationResult,
} from "@/lib/ai/gemini";

// TODO: 개역개정 원문 직접 저장/노출 전 대한성서공회 저작권 검토 필요

const CANDIDATE_LIMIT = 24;
const MAX_RECOMMENDATIONS = 3;
const REASON_MIN = 12;
const REASON_MAX = 60;

export type StoredRecommendation = {
  reference: string;
  reason: string;
  deepLinkUrl: string;
};

export type RecommendationPayload = {
  epitaphId: string;
  isAuthor: true;
  themes: string[];
  situationTags: string[];
  emotionTags: string[];
  recommendations: StoredRecommendation[];
};

export type SafeRecommendationResult = {
  themes: string[];
  situationTags: string[];
  emotionTags: string[];
  recommendations: StoredRecommendation[];
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
 * 핵심 추천 흐름.
 *   1. 카드 텍스트 → sanitize
 *   2. Gemini Embedding API 로 768차원 벡터화
 *   3. pgvector 로 후보 24개 검색 (실패 시 weight fallback)
 *   4. Gemini 생성 모델로 후보 안에서 2~3개 선택 (verseId 만 반환)
 *   5. 서버 검증 후 reference / deepLinkUrl 을 DB 값으로 붙여 저장
 */
export async function createScriptureRecommendationForEpitaph(epitaph: {
  id: string;
  userId: string;
  yesterday: string;
  today: string;
}): Promise<SafeRecommendationResult> {
  const rawText = buildEpitaphRecommendationText({
    yesterday: epitaph.yesterday,
    today: epitaph.today,
  });
  const sanitizedText = sanitizeForGemini(rawText);

  // Step 1: embed
  let queryEmbedding: number[] | null = null;
  try {
    queryEmbedding = await embedText(sanitizedText);
  } catch (err) {
    console.error("[scripture] embedText failed, fallback to weight-based candidates", err);
  }

  // Step 2: candidates
  let candidates: VerseCandidate[];
  if (queryEmbedding) {
    try {
      candidates = await findVerseCandidatesByEmbedding({
        embedding: queryEmbedding,
        limit: CANDIDATE_LIMIT,
      });
      if (candidates.length === 0) {
        candidates = await fetchVerseCandidates(CANDIDATE_LIMIT);
      }
    } catch (err) {
      console.error("[scripture] vector search failed, fallback to weight-based", err);
      candidates = await fetchVerseCandidates(CANDIDATE_LIMIT);
    }
  } else {
    candidates = await fetchVerseCandidates(CANDIDATE_LIMIT);
  }

  if (candidates.length === 0) {
    throw new Error("추천 후보 구절이 비어 있습니다. verses 시드를 먼저 실행하세요.");
  }

  // Step 3: Gemini final selection (verseId only)
  let aiResult: AiRecommendationResult;
  try {
    aiResult = await selectScriptureRecommendations({
      sanitizedText,
      candidates: candidates.map(compactVerseForPrompt),
    });
  } catch (err) {
    console.error("[scripture] Gemini selection failed, using top candidates fallback", err);
    aiResult = buildFallbackAiResult(candidates);
  }

  // Step 4: server-side validation
  const safeResult = normalizeAndValidateRecommendation({ aiResult, candidates });

  // Step 5: persist
  await upsertScriptureRecommendation({
    epitaphId: epitaph.id,
    ...safeResult,
  });

  return safeResult;
}

/**
 * 기존 인터페이스 유지용 wrapper.
 * write/actions.ts 에서 호출하던 generateAndStoreRecommendation 호환.
 */
export async function generateAndStoreRecommendation(params: {
  epitaphId: string;
  userId: string;
  yesterday: string;
  today: string;
}): Promise<RecommendationPayload> {
  const safe = await createScriptureRecommendationForEpitaph({
    id: params.epitaphId,
    userId: params.userId,
    yesterday: params.yesterday,
    today: params.today,
  });
  return {
    epitaphId: params.epitaphId,
    isAuthor: true,
    ...safe,
  };
}

// ─── 검증 ─────────────────────────────────────────────────────────────────

export function normalizeAndValidateRecommendation({
  aiResult,
  candidates,
}: {
  aiResult: AiRecommendationResult;
  candidates: VerseCandidate[];
}): SafeRecommendationResult {
  const byId = new Map(candidates.map((c) => [c.id, c]));

  const seenId = new Set<string>();
  const seenPerspective = new Set<string>();
  const out: StoredRecommendation[] = [];
  let genericCount = 0;

  for (const r of aiResult.recommendations ?? []) {
    if (out.length >= MAX_RECOMMENDATIONS) break;
    if (!r || typeof r !== "object") continue;
    const cand = byId.get(r.verseId);
    if (!cand) continue; // 후보 밖 verseId 폐기
    if (seenId.has(cand.id)) continue;

    // 같은 perspectiveKey 가 이미 있으면 스킵 (다양성 확보)
    if (cand.perspectiveKey) {
      if (seenPerspective.has(cand.perspectiveKey)) continue;
    }

    // generic 만 2개 이상이면 스킵
    if (cand.isGeneric && genericCount >= 1) continue;

    const reason = clampReason(r.reason, cand);
    seenId.add(cand.id);
    if (cand.perspectiveKey) seenPerspective.add(cand.perspectiveKey);
    if (cand.isGeneric) genericCount++;

    out.push({
      reference: cand.referenceKo,
      reason,
      deepLinkUrl: cand.deepLinkUrl,
    });
  }

  // 추천이 부족하면 후보 상위에서 채우되, 위 다양성 규칙은 동일하게 적용
  if (out.length < 2) {
    for (const cand of candidates) {
      if (out.length >= MAX_RECOMMENDATIONS) break;
      if (seenId.has(cand.id)) continue;
      if (cand.perspectiveKey && seenPerspective.has(cand.perspectiveKey)) continue;
      if (cand.isGeneric && genericCount >= 1) continue;
      seenId.add(cand.id);
      if (cand.perspectiveKey) seenPerspective.add(cand.perspectiveKey);
      if (cand.isGeneric) genericCount++;
      out.push({
        reference: cand.referenceKo,
        reason: clampReason("", cand),
        deepLinkUrl: cand.deepLinkUrl,
      });
    }
  }

  return {
    themes: clampStrings(aiResult.themes),
    situationTags: clampStrings(aiResult.situationTags),
    emotionTags: clampStrings(aiResult.emotionTags),
    recommendations: out,
  };
}

function clampReason(reason: string, cand: VerseCandidate): string {
  const trimmed = (reason ?? "").trim();
  // 비어 있거나 비정상적으로 짧으면 summary 기반 fallback
  if (!trimmed || trimmed.length < REASON_MIN) {
    return summaryToReason(cand);
  }
  if (trimmed.length > REASON_MAX) return trimmed.slice(0, REASON_MAX);
  return trimmed;
}

function summaryToReason(cand: VerseCandidate): string {
  if (cand.summary) {
    const s = cand.summary.trim();
    return s.length > REASON_MAX ? s.slice(0, REASON_MAX) : s;
  }
  return "오늘의 마음을 다시 돌아보게 합니다.";
}

function clampStrings(v: string[] | undefined, max = 5): string[] {
  if (!Array.isArray(v)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const x of v) {
    if (typeof x !== "string") continue;
    const s = x.trim();
    if (!s || seen.has(s)) continue;
    seen.add(s);
    out.push(s);
    if (out.length >= max) break;
  }
  return out;
}

function buildFallbackAiResult(candidates: VerseCandidate[]): AiRecommendationResult {
  return {
    themes: [],
    situationTags: [],
    emotionTags: [],
    recommendations: candidates.slice(0, MAX_RECOMMENDATIONS).map((c) => ({
      verseId: c.id,
      reason: c.summary ?? "",
    })),
  };
}

// ─── DB ───────────────────────────────────────────────────────────────────

async function upsertScriptureRecommendation(input: {
  epitaphId: string;
  themes: string[];
  situationTags: string[];
  emotionTags: string[];
  recommendations: StoredRecommendation[];
}): Promise<void> {
  const existing = await db
    .select({ id: scriptureRecommendations.id })
    .from(scriptureRecommendations)
    .where(eq(scriptureRecommendations.epitaphId, input.epitaphId))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(scriptureRecommendations)
      .set({
        themes: input.themes,
        situationTags: input.situationTags,
        emotionTags: input.emotionTags,
        recommendations: input.recommendations,
        updatedAt: new Date(),
      })
      .where(eq(scriptureRecommendations.epitaphId, input.epitaphId));
  } else {
    await db.insert(scriptureRecommendations).values({
      epitaphId: input.epitaphId,
      themes: input.themes,
      situationTags: input.situationTags,
      emotionTags: input.emotionTags,
      recommendations: input.recommendations,
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
