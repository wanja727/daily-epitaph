-- verse 톤 메타 컬럼 + 인덱스 + match_verses RPC tone 컬럼 추가
-- 용도: Gemini 선택 단계에서 "책망" 톤 후보를 회피하기 위한 구조 필드.
-- 값: 권면 | 회복 | 결단 | 위로 | 소망 | 감사 | 지혜 | 책망

ALTER TABLE "verse" ADD COLUMN IF NOT EXISTS "tone" text;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "verse_tone_idx" ON "verse" ("tone");--> statement-breakpoint

-- RETURNS TABLE 에 tone 컬럼이 추가되어 row 타입이 바뀌므로,
-- CREATE OR REPLACE 로는 갱신할 수 없다 (Postgres 42P13). 먼저 DROP 후 재생성.
DROP FUNCTION IF EXISTS match_verses(vector, int);--> statement-breakpoint

CREATE FUNCTION match_verses(
  query_embedding vector(768),
  match_count int DEFAULT 24
)
RETURNS TABLE (
  id text,
  "referenceKo" text,
  "bookAbbrEn" text,
  chapter int,
  "verseStart" int,
  "verseEnd" int,
  "deepLinkUrl" text,
  themes text[],
  "situationTags" text[],
  "emotionTags" text[],
  summary text,
  weight int,
  "isGeneric" boolean,
  specificity int,
  "perspectiveKey" text,
  "avoidTags" text[],
  tone text,
  similarity double precision
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    v.id,
    v."referenceKo",
    v."bookAbbrEn",
    v.chapter,
    v."verseStart",
    v."verseEnd",
    v."deepLinkUrl",
    v.themes,
    v."situationTags",
    v."emotionTags",
    v.summary,
    v.weight,
    v."isGeneric",
    v.specificity,
    v."perspectiveKey",
    v."avoidTags",
    v.tone,
    (1 - (v.embedding <=> query_embedding))::double precision AS similarity
  FROM verse v
  WHERE v.embedding IS NOT NULL
  ORDER BY
    v.embedding <=> query_embedding,
    v.weight DESC
  LIMIT match_count;
$$;
