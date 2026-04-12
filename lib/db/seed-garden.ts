/**
 * 개발 DB용 꽃밭 테스트 유틸리티
 *
 * 사용법:
 *   npx tsx lib/db/seed-garden.ts plant [셀이름]    — 셀 꽃밭에 120송이 심기
 *   npx tsx lib/db/seed-garden.ts give  <닉네임>    — 유저에게 완성된 꽃 120송이 지급
 *   npx tsx lib/db/seed-garden.ts clear [셀이름]    — 셀 꽃밭 비우기
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { flowers, gardenPlots, cells, users } from "./schema";
import { eq, inArray } from "drizzle-orm";

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client);

const FLOWER_TYPES = [
  "flower", "purple", "sunflower",
  "daffodil", "cherry", "zinnia",
  "hyacinth", "rose", "dandelion",
];
const TOTAL = 120;

// ─── 헬퍼 ────────────────────────────────────────────────────────────────────

async function findCell(name?: string) {
  const allCells = await db.select().from(cells);
  const cell = name
    ? allCells.find((c) => c.name.includes(name))
    : allCells[0];
  if (!cell) {
    console.error(`셀을 찾을 수 없습니다: ${name ?? "(없음)"}`);
    process.exit(1);
  }
  return cell;
}

async function findUser(keyword: string) {
  const allUsers = await db
    .select({ id: users.id, nickname: users.nickname, realName: users.realName })
    .from(users);
  const user = allUsers.find(
    (u) =>
      u.nickname?.includes(keyword) || u.realName?.includes(keyword),
  );
  if (!user) {
    console.error(`유저를 찾을 수 없습니다: ${keyword}`);
    console.log(
      "등록된 유저:",
      allUsers.map((u) => u.nickname ?? u.realName).join(", "),
    );
    process.exit(1);
  }
  return user;
}

// ─── plant: 셀 꽃밭에 120송이 심기 ──────────────────────────────────────────

async function plant(cellName?: string) {
  const cell = await findCell(cellName);

  const cellUsers = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.cellId, cell.id));

  // 기존 꽃밭 비우기
  await db.delete(gardenPlots).where(eq(gardenPlots.cellId, cell.id));
  console.log(`🧹 ${cell.name} 기존 꽃밭 삭제`);

  console.log(`🌷 ${cell.name}에 ${TOTAL}송이 심는 중...`);

  for (let i = 0; i < TOTAL; i++) {
    const flowerType = FLOWER_TYPES[i % FLOWER_TYPES.length];
    const userId =
      cellUsers.length > 0
        ? cellUsers[i % cellUsers.length].id
        : "seed-user";

    const [f] = await db
      .insert(flowers)
      .values({
        userId,
        type: flowerType,
        stage: 3,
        waterCount: 3,
        completedAt: new Date(),
        placedInGarden: true,
      })
      .returning({ id: flowers.id });

    await db.insert(gardenPlots).values({
      cellId: cell.id,
      slot: i,
      flowerId: f.id,
      placedBy: userId,
    });
  }

  console.log(
    `✅ 완료! ${FLOWER_TYPES.map((t) => `${t}: ${Math.floor(TOTAL / FLOWER_TYPES.length)}송이`).join(", ")}`,
  );
}

// ─── give: 유저에게 완성된 꽃 120송이 지급 ──────────────────────────────────

async function give(keyword: string) {
  const user = await findUser(keyword);

  console.log(`🌸 ${user.nickname ?? user.realName}에게 ${TOTAL}송이 지급 중...`);

  for (let i = 0; i < TOTAL; i++) {
    const flowerType = FLOWER_TYPES[i % FLOWER_TYPES.length];

    await db.insert(flowers).values({
      userId: user.id,
      type: flowerType,
      stage: 3,
      waterCount: 3,
      completedAt: new Date(),
      placedInGarden: false,
    });
  }

  console.log(
    `✅ 완료! ${FLOWER_TYPES.map((t) => `${t}: ${Math.floor(TOTAL / FLOWER_TYPES.length)}송이`).join(", ")}`,
  );
  console.log("꽃밭에 심기는 UI에서 직접 해보세요!");
}

// ─── clear: 셀 꽃밭 비우기 ──────────────────────────────────────────────────

async function clear(cellName?: string) {
  const cell = await findCell(cellName);

  // 꽃밭에 심긴 꽃 ID 조회
  const plots = await db
    .select({ flowerId: gardenPlots.flowerId })
    .from(gardenPlots)
    .where(eq(gardenPlots.cellId, cell.id));

  // 꽃밭 삭제
  const deleted = await db
    .delete(gardenPlots)
    .where(eq(gardenPlots.cellId, cell.id))
    .returning({ id: gardenPlots.id });

  // 해당 꽃들의 placedInGarden 플래그 해제
  if (plots.length > 0) {
    const flowerIds = plots.map((p) => p.flowerId);
    await db
      .update(flowers)
      .set({ placedInGarden: false })
      .where(inArray(flowers.id, flowerIds));
  }

  console.log(`🧹 ${cell.name} 꽃밭 비움 (${deleted.length}송이 제거)`);
}

// ─── CLI 라우터 ─────────────────────────────────────────────────────────────

const [command, arg] = process.argv.slice(2);

const COMMANDS: Record<string, () => Promise<void>> = {
  plant: () => plant(arg),
  give: () => {
    if (!arg) {
      console.error("사용법: npx tsx lib/db/seed-garden.ts give <닉네임>");
      process.exit(1);
    }
    return give(arg);
  },
  clear: () => clear(arg),
};

if (!command || !COMMANDS[command]) {
  console.log(`사용법:
  npx tsx lib/db/seed-garden.ts plant [셀이름]    셀 꽃밭에 120송이 심기
  npx tsx lib/db/seed-garden.ts give  <닉네임>    유저에게 완성된 꽃 120송이 지급
  npx tsx lib/db/seed-garden.ts clear [셀이름]    셀 꽃밭 비우기`);
  process.exit(0);
}

COMMANDS[command]()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("❌ 실패:", e);
    process.exit(1);
  });
