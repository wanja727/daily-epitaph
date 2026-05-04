-- 빈무덤 소감. 구성원이 서비스 이용 소감을 1회만 작성하며, 메인 피드의 별도 탭에서 노출된다.
-- 사용자당 1건만 허용하기 위해 userId 에 UNIQUE.

CREATE TABLE IF NOT EXISTS "service_impression" (
  "id" text PRIMARY KEY NOT NULL,
  "userId" text NOT NULL,
  "content" text NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "service_impression_userId_unique" UNIQUE("userId"),
  CONSTRAINT "service_impression_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE cascade ON UPDATE no action
);

CREATE INDEX IF NOT EXISTS "service_impression_userId_idx" ON "service_impression" ("userId");
CREATE INDEX IF NOT EXISTS "service_impression_createdAt_idx" ON "service_impression" ("createdAt");

-- 소감 카드 공감 반응. epitaph_reaction 과 동일한 구조이며 type 도메인은 lib/utils/constants 의 REACTION_TYPES.
CREATE TABLE IF NOT EXISTS "service_impression_reaction" (
  "id" text PRIMARY KEY NOT NULL,
  "impressionId" text NOT NULL,
  "userId" text NOT NULL,
  "type" text NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "service_impression_reaction_impressionId_userId_unique" UNIQUE("impressionId","userId"),
  CONSTRAINT "service_impression_reaction_impressionId_fk" FOREIGN KEY ("impressionId") REFERENCES "service_impression"("id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "service_impression_reaction_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE cascade ON UPDATE no action
);

CREATE INDEX IF NOT EXISTS "service_impression_reaction_impressionId_idx" ON "service_impression_reaction" ("impressionId");
CREATE INDEX IF NOT EXISTS "service_impression_reaction_userId_idx" ON "service_impression_reaction" ("userId");
