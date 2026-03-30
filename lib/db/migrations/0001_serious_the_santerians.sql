CREATE TABLE "epitaph_amen" (
	"id" text PRIMARY KEY NOT NULL,
	"epitaphId" text NOT NULL,
	"userId" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "epitaph_amen_epitaphId_userId_unique" UNIQUE("epitaphId","userId")
);
--> statement-breakpoint
ALTER TABLE "epitaph" ADD COLUMN "amenCount" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "epitaph_amen" ADD CONSTRAINT "epitaph_amen_epitaphId_epitaph_id_fk" FOREIGN KEY ("epitaphId") REFERENCES "public"."epitaph"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "epitaph_amen" ADD CONSTRAINT "epitaph_amen_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;