-- 회개 카테고리(다중 선택). 작성 화면에서 최소 1개 선택을 강제한다.
-- 값 도메인: god | self | others | world (lib/utils/constants 의 REPENT_CATEGORIES 참조)

ALTER TABLE "epitaph"
  ADD COLUMN IF NOT EXISTS "repentCategories" text[] DEFAULT ARRAY[]::text[] NOT NULL;
