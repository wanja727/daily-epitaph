CREATE INDEX "cell_member_name_idx" ON "cell_member" USING btree ("name");--> statement-breakpoint
CREATE INDEX "daily_visit_date_idx" ON "daily_visit" USING btree ("date");--> statement-breakpoint
CREATE INDEX "epitaph_date_idx" ON "epitaph" USING btree ("date");--> statement-breakpoint
CREATE INDEX "epitaph_userId_idx" ON "epitaph" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "flower_userId_idx" ON "flower" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "garden_plot_cellId_idx" ON "garden_plot" USING btree ("cellId");--> statement-breakpoint
CREATE INDEX "user_cellId_idx" ON "user" USING btree ("cellId");--> statement-breakpoint
CREATE INDEX "epitaph_reaction_epitaphId_idx" ON "epitaph_reaction" USING btree ("epitaphId");--> statement-breakpoint
CREATE INDEX "epitaph_reaction_userId_idx" ON "epitaph_reaction" USING btree ("userId");