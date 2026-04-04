import { config } from "dotenv";
config({ path: ".env.local" });

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
  gardenPlots,
  dailyVisits,
  wateringCans,
  epitaphReactions,
  epitaphs,
  flowers,
  sessions,
  accounts,
  verificationTokens,
  cellMembers,
  users,
  cells,
} from "./schema";

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client);

// FK 의존성 순서대로 삭제 (자식 → 부모)
const tables = [
  { table: gardenPlots, name: "garden_plot" },
  { table: dailyVisits, name: "daily_visit" },
  { table: wateringCans, name: "watering_can" },
  { table: epitaphReactions, name: "epitaph_reaction" },
  { table: epitaphs, name: "epitaph" },
  { table: flowers, name: "flower" },
  { table: sessions, name: "session" },
  { table: accounts, name: "account" },
  { table: verificationTokens, name: "verificationToken" },
  { table: cellMembers, name: "cell_member" },
  { table: users, name: "user" },
  { table: cells, name: "cell" },
];

async function reset() {
  console.log("🗑️  DB 전체 데이터 삭제 시작...\n");

  for (const { table, name } of tables) {
    const result = await db.delete(table).returning();
    console.log(`  ✓ ${name}: ${result.length}건 삭제`);
  }

  console.log("\n✅ 모든 데이터 삭제 완료!");
  process.exit(0);
}

reset().catch((e) => {
  console.error("❌ 삭제 실패:", e);
  process.exit(1);
});
