CREATE TABLE "epitaph_reaction" (
	"id" text PRIMARY KEY NOT NULL,
	"epitaphId" text NOT NULL,
	"userId" text NOT NULL,
	"type" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "epitaph_reaction_epitaphId_userId_unique" UNIQUE("epitaphId","userId")
);
--> statement-breakpoint
INSERT INTO "epitaph_reaction" ("id", "epitaphId", "userId", "type", "createdAt")
SELECT "id", "epitaphId", "userId", 'amen', "createdAt" FROM "epitaph_amen";
--> statement-breakpoint
ALTER TABLE "epitaph_reaction" ADD CONSTRAINT "epitaph_reaction_epitaphId_epitaph_id_fk" FOREIGN KEY ("epitaphId") REFERENCES "public"."epitaph"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "epitaph_reaction" ADD CONSTRAINT "epitaph_reaction_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
DROP TABLE "epitaph_amen" CASCADE;
