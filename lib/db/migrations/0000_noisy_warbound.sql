CREATE TABLE "account" (
	"userId" text NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"providerAccountId" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	CONSTRAINT "account_provider_providerAccountId_pk" PRIMARY KEY("provider","providerAccountId")
);
--> statement-breakpoint
CREATE TABLE "cell_member" (
	"id" text PRIMARY KEY NOT NULL,
	"cellId" text NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cell" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "epitaph" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"yesterday" text NOT NULL,
	"today" text NOT NULL,
	"date" date NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "epitaph_userId_date_unique" UNIQUE("userId","date")
);
--> statement-breakpoint
CREATE TABLE "flower" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"type" text NOT NULL,
	"stage" integer DEFAULT 1 NOT NULL,
	"waterCount" integer DEFAULT 0 NOT NULL,
	"completedAt" timestamp,
	"placedInGarden" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "garden_plot" (
	"id" text PRIMARY KEY NOT NULL,
	"cellId" text NOT NULL,
	"x" integer NOT NULL,
	"y" integer NOT NULL,
	"flowerId" text,
	"placedBy" text,
	"placedAt" timestamp,
	CONSTRAINT "garden_plot_cellId_x_y_unique" UNIQUE("cellId","x","y")
);
--> statement-breakpoint
CREATE TABLE "session" (
	"sessionToken" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"expires" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"email" text,
	"emailVerified" timestamp,
	"image" text,
	"realName" text,
	"nickname" text,
	"cellId" text,
	"onboardingCompleted" boolean DEFAULT false NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verificationToken" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp NOT NULL,
	CONSTRAINT "verificationToken_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
CREATE TABLE "watering_can" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "watering_can_userId_unique" UNIQUE("userId")
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cell_member" ADD CONSTRAINT "cell_member_cellId_cell_id_fk" FOREIGN KEY ("cellId") REFERENCES "public"."cell"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "epitaph" ADD CONSTRAINT "epitaph_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flower" ADD CONSTRAINT "flower_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "garden_plot" ADD CONSTRAINT "garden_plot_cellId_cell_id_fk" FOREIGN KEY ("cellId") REFERENCES "public"."cell"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "garden_plot" ADD CONSTRAINT "garden_plot_flowerId_flower_id_fk" FOREIGN KEY ("flowerId") REFERENCES "public"."flower"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "garden_plot" ADD CONSTRAINT "garden_plot_placedBy_user_id_fk" FOREIGN KEY ("placedBy") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_cellId_cell_id_fk" FOREIGN KEY ("cellId") REFERENCES "public"."cell"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "watering_can" ADD CONSTRAINT "watering_can_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;