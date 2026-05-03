-- pgvector 확장 + verse 임베딩 / 관점 메타 컬럼 + match_verses 함수
-- TODO: 개역개정 원문 직접 저장/노출 전 대한성서공회 저작권 검토 필요
-- 본 마이그레이션은 verse 테이블에 본문(개역개정 원문)을 저장하지 않는다.

CREATE EXTENSION IF NOT EXISTS vector;
--> statement-breakpoint

ALTER TABLE "verse" ADD COLUMN IF NOT EXISTS "embeddingText" text;--> statement-breakpoint
ALTER TABLE "verse" ADD COLUMN IF NOT EXISTS "embedding" vector(768);--> statement-breakpoint
ALTER TABLE "verse" ADD COLUMN IF NOT EXISTS "embeddingModel" text;--> statement-breakpoint
ALTER TABLE "verse" ADD COLUMN IF NOT EXISTS "specificity" integer NOT NULL DEFAULT 3;--> statement-breakpoint
ALTER TABLE "verse" ADD COLUMN IF NOT EXISTS "perspectiveKey" text;--> statement-breakpoint
ALTER TABLE "verse" ADD COLUMN IF NOT EXISTS "avoidTags" text[] NOT NULL DEFAULT ARRAY[]::text[];--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "verse_embedding_hnsw_idx"
  ON "verse"
  USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "verse_perspectiveKey_idx" ON "verse" ("perspectiveKey");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "verse_isGeneric_idx" ON "verse" ("isGeneric");--> statement-breakpoint

-- 의미 유사도 기반 후보 검색 RPC
CREATE OR REPLACE FUNCTION match_verses(
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
    (1 - (v.embedding <=> query_embedding))::double precision AS similarity
  FROM verse v
  WHERE v.embedding IS NOT NULL
  ORDER BY
    v.embedding <=> query_embedding,
    v.weight DESC
  LIMIT match_count;
$$;
