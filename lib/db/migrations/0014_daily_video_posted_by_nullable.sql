-- daily_video.postedBy 를 nullable 로 변경.
-- cron 으로 자동 등록되는 영상은 등록자 user 를 특정할 수 없기 때문.

ALTER TABLE "daily_video" ALTER COLUMN "postedBy" DROP NOT NULL;
