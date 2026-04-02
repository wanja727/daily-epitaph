CREATE TABLE "daily_visit" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"date" date NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "daily_visit_userId_date_unique" UNIQUE("userId","date")
);
--> statement-breakpoint
ALTER TABLE "daily_visit" ADD CONSTRAINT "daily_visit_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;