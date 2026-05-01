import { db } from "@/lib/db";
import { verses } from "@/lib/db/schema";
import { desc, sql } from "drizzle-orm";

// TODO: 개역개정 원문 직접 저장/노출 전 대한성서공회 저작권 검토 필요

export type VerseCandidate = {
  id: string;
  referenceKo: string;
  bookAbbrEn: string;
  chapter: number;
  verseStart: number;
  verseEnd: number | null;
  deepLinkUrl: string;
  themes: string[];
  situationTags: string[];
  emotionTags: string[];
  summary: string | null;
  weight: number;
  isGeneric: boolean;
  specificity: number;
  perspectiveKey: string | null;
  avoidTags: string[];
  /** 말씀 톤 (권면/회복/결단/위로/소망/감사/지혜/책망). null 이면 미분류. */
  tone: string | null;
  similarity?: number;
};

/**
 * 임베딩 기반 후보 검색.
 * 우선 match_verses RPC 를 시도하고, 실패하면 raw SQL fallback 으로 cosine search.
 */
export async function findVerseCandidatesByEmbedding(input: {
  embedding: number[];
  limit?: number;
}): Promise<VerseCandidate[]> {
  const { embedding } = input;
  const limit = input.limit ?? 24;
  if (!Array.isArray(embedding) || embedding.length === 0) {
    throw new Error("findVerseCandidatesByEmbedding: embedding이 비어 있습니다.");
  }

  const literal = `[${embedding.join(",")}]`;

  // RPC 우선 시도. Supabase 환경이 아니거나 함수가 없는 경우에 대비해 fallback 보유.
  try {
    const rows = await db.execute(sql`
      select * from match_verses(${literal}::vector(768), ${limit}::int)
    `);
    const list = (rows as unknown as { rows?: unknown[] }).rows ?? (rows as unknown as unknown[]);
    if (Array.isArray(list) && list.length > 0) {
      return list.map(rowToCandidate);
    }
  } catch {
    // fall through to raw SQL fallback
  }

  const fallback = await db.execute(sql`
    select
      v."id",
      v."referenceKo",
      v."bookAbbrEn",
      v."chapter",
      v."verseStart",
      v."verseEnd",
      v."deepLinkUrl",
      v."themes",
      v."situationTags",
      v."emotionTags",
      v."summary",
      v."weight",
      v."isGeneric",
      v."specificity",
      v."perspectiveKey",
      v."avoidTags",
      v."tone",
      (1 - (v."embedding" <=> ${literal}::vector(768)))::double precision as "similarity"
    from "verse" v
    where v."embedding" is not null
    order by v."embedding" <=> ${literal}::vector(768), v."weight" desc
    limit ${limit}
  `);
  const list =
    (fallback as unknown as { rows?: unknown[] }).rows ??
    (fallback as unknown as unknown[]);
  return Array.isArray(list) ? list.map(rowToCandidate) : [];
}

/**
 * 임베딩이 없거나 검색이 실패했을 때 사용할 fallback.
 * weight 내림차순 + isGeneric 후순위.
 */
export async function fetchVerseCandidates(limit = 24): Promise<VerseCandidate[]> {
  const rows = await db
    .select({
      id: verses.id,
      referenceKo: verses.referenceKo,
      bookAbbrEn: verses.bookAbbrEn,
      chapter: verses.chapter,
      verseStart: verses.verseStart,
      verseEnd: verses.verseEnd,
      deepLinkUrl: verses.deepLinkUrl,
      themes: verses.themes,
      situationTags: verses.situationTags,
      emotionTags: verses.emotionTags,
      summary: verses.summary,
      weight: verses.weight,
      isGeneric: verses.isGeneric,
      specificity: verses.specificity,
      perspectiveKey: verses.perspectiveKey,
      avoidTags: verses.avoidTags,
      tone: verses.tone,
    })
    .from(verses)
    .orderBy(desc(verses.weight))
    .limit(limit);

  return rows
    .map((r) => ({
      ...r,
      verseEnd: r.verseEnd ?? null,
      perspectiveKey: r.perspectiveKey ?? null,
      summary: r.summary ?? null,
      tone: r.tone ?? null,
    }))
    .sort((a, b) => Number(a.isGeneric) - Number(b.isGeneric));
}

function rowToCandidate(row: unknown): VerseCandidate {
  const r = row as Record<string, unknown>;
  return {
    id: String(r.id ?? ""),
    referenceKo: String(r.referenceKo ?? ""),
    bookAbbrEn: String(r.bookAbbrEn ?? ""),
    chapter: Number(r.chapter ?? 0),
    verseStart: Number(r.verseStart ?? 0),
    verseEnd: r.verseEnd === null || r.verseEnd === undefined ? null : Number(r.verseEnd),
    deepLinkUrl: String(r.deepLinkUrl ?? ""),
    themes: Array.isArray(r.themes) ? (r.themes as string[]) : [],
    situationTags: Array.isArray(r.situationTags) ? (r.situationTags as string[]) : [],
    emotionTags: Array.isArray(r.emotionTags) ? (r.emotionTags as string[]) : [],
    summary: r.summary === null || r.summary === undefined ? null : String(r.summary),
    weight: Number(r.weight ?? 0),
    isGeneric: Boolean(r.isGeneric),
    specificity: Number(r.specificity ?? 3),
    perspectiveKey:
      r.perspectiveKey === null || r.perspectiveKey === undefined
        ? null
        : String(r.perspectiveKey),
    avoidTags: Array.isArray(r.avoidTags) ? (r.avoidTags as string[]) : [],
    tone: r.tone === null || r.tone === undefined ? null : String(r.tone),
    similarity:
      r.similarity === null || r.similarity === undefined ? undefined : Number(r.similarity),
  };
}

/**
 * verse 메타데이터 → 임베딩에 사용할 텍스트.
 * 절대 성경 본문을 포함하지 않는다. summary 도 사람이 쓴 추천 상황 설명이어야 한다.
 *
 * 라벨은 모두 "한글 라벨: 값" 형식으로 통일한다.
 * isGeneric 은 specificity 로 충분히 판단 가능하므로 여기에 포함하지 않는다.
 */
export function buildVerseEmbeddingText(verse: {
  referenceKo: string;
  themes: string[];
  situationTags: string[];
  emotionTags: string[];
  summary?: string | null;
  specificity?: number;
  perspectiveKey?: string | null;
  avoidTags?: string[];
  tone?: string | null;
}): string {
  return [
    `장절: ${verse.referenceKo}`,
    `주제: ${verse.themes.join(", ")}`,
    `상황: ${verse.situationTags.join(", ")}`,
    `감정: ${verse.emotionTags.join(", ")}`,
    verse.summary ? `추천 상황: ${verse.summary}` : "",
    verse.perspectiveKey ? `추천 관점: ${verse.perspectiveKey}` : "",
    `구체성: ${verse.specificity ?? 3}`,
    verse.tone ? `톤: ${verse.tone}` : "",
    verse.avoidTags && verse.avoidTags.length > 0
      ? `회피 상황: ${verse.avoidTags.join(", ")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Gemini 생성 모델에 보낼 압축 후보 객체.
 * 보내지 않는 필드: deepLinkUrl, bookAbbrEn, chapter, verseStart, verseEnd,
 * weight, embedding, embeddingText, avoidTags, isGeneric.
 * - deepLinkUrl 은 서버에서 DB 기준으로 붙인다.
 * - weight 는 서버 정렬/운영 가중치용이다.
 * - avoidTags 는 토큰을 늘리고 AI 판단을 복잡하게 만들 수 있다.
 * - isGeneric 은 specificity 로 판단 가능하다.
 */
export function compactVerseForPrompt(v: VerseCandidate) {
  return {
    id: v.id,
    ref: v.referenceKo,
    th: v.themes,
    st: v.situationTags,
    em: v.emotionTags,
    sum: v.summary,
    sp: v.specificity,
    pk: v.perspectiveKey,
    tn: v.tone,
  };
}
