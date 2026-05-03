-- 매일 묵상 영상. 관리자가 메인 피드 최상단 고정 카드로 노출할 유튜브 영상을 날짜별로 등록한다.
-- 같은 날짜에 두 번 등록 시 갱신(upsert)되도록 date 에 UNIQUE.

CREATE TABLE IF NOT EXISTS "daily_video" (
  "id" text PRIMARY KEY NOT NULL,
  "date" date NOT NULL,
  "youtubeVideoId" text NOT NULL,
  "title" text,
  "postedBy" text NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "daily_video_date_unique" UNIQUE("date"),
  CONSTRAINT "daily_video_postedBy_user_id_fk" FOREIGN KEY ("postedBy") REFERENCES "user"("id") ON DELETE no action ON UPDATE no action
);

CREATE INDEX IF NOT EXISTS "daily_video_date_idx" ON "daily_video" ("date");
