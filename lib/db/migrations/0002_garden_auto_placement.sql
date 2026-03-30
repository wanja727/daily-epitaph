-- Migration: garden_plot 5x5 grid → slot-based auto-placement
-- 1. 기존 flowerId가 있는 행에 slot 할당 (y*5+x)
-- 2. 빈 행(프리시딩) 삭제
-- 3. x, y 컬럼 제거 → slot 컬럼 추가
-- 4. NOT NULL 제약 적용

-- Add slot column (nullable for now)
ALTER TABLE "garden_plot" ADD COLUMN "slot" integer;--> statement-breakpoint

-- Assign slot to existing placed flowers
UPDATE "garden_plot" SET "slot" = "y" * 5 + "x" WHERE "flowerId" IS NOT NULL;--> statement-breakpoint

-- Delete empty pre-seeded rows
DELETE FROM "garden_plot" WHERE "flowerId" IS NULL;--> statement-breakpoint

-- Make slot NOT NULL
ALTER TABLE "garden_plot" ALTER COLUMN "slot" SET NOT NULL;--> statement-breakpoint

-- Drop old unique constraint
ALTER TABLE "garden_plot" DROP CONSTRAINT "garden_plot_cellId_x_y_unique";--> statement-breakpoint

-- Drop old columns
ALTER TABLE "garden_plot" DROP COLUMN "x";--> statement-breakpoint
ALTER TABLE "garden_plot" DROP COLUMN "y";--> statement-breakpoint

-- Make flowerId and placedBy NOT NULL
ALTER TABLE "garden_plot" ALTER COLUMN "flowerId" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "garden_plot" ALTER COLUMN "placedBy" SET NOT NULL;--> statement-breakpoint

-- Make placedAt NOT NULL with default
ALTER TABLE "garden_plot" ALTER COLUMN "placedAt" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "garden_plot" ALTER COLUMN "placedAt" SET NOT NULL;--> statement-breakpoint

-- Add new unique constraint
ALTER TABLE "garden_plot" ADD CONSTRAINT "garden_plot_cellId_slot_unique" UNIQUE("cellId","slot");
