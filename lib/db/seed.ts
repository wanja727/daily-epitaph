import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { cells, cellMembers, gardenPlots } from "./schema";
import { GARDEN_SIZE } from "../utils/constants";

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client);

// ━━━ 셀 데이터 (여기에 실제 셀 이름과 구성원을 추가하세요) ━━━
const CELL_DATA: { name: string; members: string[] }[] = [
  {
    name: "1셀",
    members: ["홍길동", "김철수", "이영희"],
  },
  {
    name: "2셀",
    members: ["박지민", "최수현", "정민호"],
  },
  // TODO: 실제 셀 데이터로 교체
];

async function seed() {
  console.log("🌱 Seeding database...");

  for (const cellData of CELL_DATA) {
    // 셀 생성
    const [cell] = await db
      .insert(cells)
      .values({ name: cellData.name })
      .returning({ id: cells.id });

    console.log(`  ✓ 셀 생성: ${cellData.name} (${cell.id})`);

    // 셀 멤버 등록
    if (cellData.members.length > 0) {
      await db.insert(cellMembers).values(
        cellData.members.map((name) => ({
          cellId: cell.id,
          name,
        }))
      );
      console.log(`    멤버 ${cellData.members.length}명 등록`);
    }

    // 5×5 꽃밭 그리드 생성
    const plots = [];
    for (let y = 0; y < GARDEN_SIZE; y++) {
      for (let x = 0; x < GARDEN_SIZE; x++) {
        plots.push({ cellId: cell.id, x, y });
      }
    }
    await db.insert(gardenPlots).values(plots);
    console.log(`    꽃밭 ${GARDEN_SIZE}×${GARDEN_SIZE} 생성`);
  }

  console.log("\n✅ Seed 완료!");
  process.exit(0);
}

seed().catch((e) => {
  console.error("❌ Seed 실패:", e);
  process.exit(1);
});
