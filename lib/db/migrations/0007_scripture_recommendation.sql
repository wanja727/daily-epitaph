ALTER TABLE "epitaph" ADD COLUMN "requestScriptureRecommendation" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "epitaph" ADD COLUMN "recommendationUpdatedAt" timestamp;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "verse" (
	"id" text PRIMARY KEY NOT NULL,
	"referenceKo" text NOT NULL,
	"bookAbbrEn" text NOT NULL,
	"chapter" integer NOT NULL,
	"verseStart" integer NOT NULL,
	"verseEnd" integer,
	"deepLinkUrl" text NOT NULL,
	"themes" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"situationTags" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"emotionTags" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"summary" text,
	"weight" integer DEFAULT 0 NOT NULL,
	"isGeneric" boolean DEFAULT false NOT NULL,
	CONSTRAINT "verse_bookAbbrEn_chapter_verseStart_verseEnd_unique" UNIQUE("bookAbbrEn","chapter","verseStart","verseEnd")
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "verse_bookAbbrEn_idx" ON "verse" USING btree ("bookAbbrEn");--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "scripture_recommendation" (
	"id" text PRIMARY KEY NOT NULL,
	"epitaphId" text NOT NULL,
	"themes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"situationTags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"emotionTags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"recommendations" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "scripture_recommendation_epitaphId_unique" UNIQUE("epitaphId")
);--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "scripture_recommendation" ADD CONSTRAINT "scripture_recommendation_epitaphId_epitaph_id_fk" FOREIGN KEY ("epitaphId") REFERENCES "public"."epitaph"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
