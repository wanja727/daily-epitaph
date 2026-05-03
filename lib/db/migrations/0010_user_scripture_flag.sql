-- AI 말씀 추천 기능 화이트리스트 플래그.
-- 기본 false. 운영자가 DB 에서 직접 true 로 바꾼 사용자만 작성 화면에서 추천 토글을 본다.

ALTER TABLE "user"
  ADD COLUMN IF NOT EXISTS "scriptureRecommendationEnabled" boolean DEFAULT false NOT NULL;
