import { config } from "dotenv";
config({ path: ".env.local" });

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { cells, cellMembers } from "./schema";
import { eq } from "drizzle-orm";

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client);

// ━━━ 셀 데이터 (여기에 실제 셀 이름과 구성원을 추가하세요) ━━━
const CELL_DATA: { name: string; members: string[] }[] = [
  {
    name: "정윤경셀",
    members: [
      "정윤경",
      "오동해",
      "장예정",
      "한상임",
      "이정신",
      "조보경",
      "이유진",
      "임채일",
      "정윤교",
      "홍종철",
    ],
  },
  {
    name: "추현호셀",
    members: [
      "추현호",
      "곽은경",
      "백재열",
      "전미혜",
      "윤현진",
      "곽선영",
      "권지현",
      "윤지윤",
      "남정민",
      "서주연",
    ],
  },
  {
    name: "허윤희셀",
    members: [
      "허윤희",
      "김보영",
      "장형기",
      "조정민",
      "최희원",
      "이혜련",
      "윤혜지",
      "장수연",
      "윤성훈",
      "김지원",
      "하인호",
    ],
  },
  {
    name: "김재민셀",
    members: [
      "김재민",
      "박영서",
      "우경미",
      "유은경",
      "최정현",
      "이규하",
      "남궁경",
      "전성민",
      "박성희",
      "강은혜",
      "성희용",
    ],
  },
  {
    name: "권주희셀",
    members: [
      "권주희",
      "이아람",
      "장유미",
      "이보라",
      "이민희",
      "김선경",
      "김유정",
      "김선영",
    ],
  },
  {
    name: "김혜리셀",
    members: [
      "김혜리",
      "정용택",
      "홍울",
      "전수영",
      "박태수",
      "고혜민",
      "이시현",
      "박예은",
      "박미순",
      "지다영",
    ],
  },
  {
    name: "홍수경셀",
    members: [
      "홍수경",
      "오영진",
      "조은비",
      "임성혜",
      "김보라",
      "최은아",
      "김건식",
      "윤지은",
      "이진희",
      "송마리아",
    ],
  },
  {
    name: "오주원셀",
    members: [
      "오주원",
      "윤선재",
      "조유민",
      "이은지",
      "박나눔",
      "최가영",
      "김예람",
      "홍성은",
      "장상훈",
      "서정아",
    ],
  },
  {
    name: "정안나셀",
    members: [
      "정안나",
      "김화정",
      "김지수",
      "이조은",
      "김성현",
      "박유한",
      "최나영",
      "장은선",
      "임지희",
    ],
  },
  {
    name: "김제완셀",
    members: [
      "김제완",
      "윤정원",
      "김슬기",
      "이가희",
      "윤남형",
      "신명",
      "하지혜",
      "이혁진",
    ],
  },
  {
    name: "임주원셀",
    members: [
      "임주원",
      "정소준",
      "최석원",
      "홍승민",
      "이유진",
      "김은혜",
      "김제시카",
      "정가연",
    ],
  },
  {
    name: "이예은셀",
    members: [
      "이예은",
      "이성우",
      "오미리",
      "박혜미",
      "박여운",
      "임수연",
      "박지민",
      "손유승",
      "이선민",
    ],
  },
  {
    name: "설온유셀",
    members: [
      "설온유",
      "전예림",
      "이충환",
      "김지애",
      "조혜선",
      "신자영",
      "임윤아",
      "양아름",
      "공규현",
    ],
  },
  {
    name: "신혜진셀",
    members: [
      "신혜진",
      "박민희",
      "김진욱",
      "길지원",
      "유진",
      "김광수",
      "김현혜",
      "박연수",
    ],
  },
  {
    name: "이솔지셀",
    members: [
      "이솔지",
      "정다은",
      "김영서",
      "구은반",
      "강현주",
      "이유신",
      "김소망",
      "홍주희",
    ],
  },
  {
    name: "서예린셀",
    members: [
      "서예린",
      "이여찬",
      "박선하",
      "박지수",
      "조강우",
      "고현지",
      "김민주",
    ],
  },
  {
    name: "허수빈셀",
    members: [
      "허수빈",
      "박미리내",
      "이지성",
      "이창욱",
      "박은혜",
      "강하경",
      "박예진",
      "정한나",
    ],
  },
  {
    name: "경규성셀",
    members: ["경규성", "박희경", "이준형", "장주영", "곽하은", "고은수"],
  },
  {
    name: "김지영셀",
    members: [
      "김지영",
      "박이솔",
      "정유미",
      "김송원",
      "한동희",
      "부민지",
      "김동석",
      "김소연",
    ],
  },
  {
    name: "이지원셀",
    members: [
      "이지원",
      "정예린",
      "박율범",
      "조하경",
      "오혜림",
      "신수인",
      "이성풍",
      "심솔희",
    ],
  },
  {
    name: "이규희셀",
    members: [
      "이규희",
      "강민주",
      "임지환",
      "이가영",
      "유일청",
      "김진환",
      "김홍은",
      "하소민",
    ],
  },
  {
    name: "고수연셀",
    members: [
      "고수연",
      "배태랑",
      "최수창",
      "김혜린",
      "김산성",
      "박은총",
      "최수현",
      "김승현",
    ],
  },
  {
    name: "민채림셀",
    members: ["민채림", "한동석", "오영주", "김예은", "이유나", "김보현"],
  },
  {
    name: "조혜원셀",
    members: ["조혜원", "한문종", "오예진", "이윤선"],
  },
  {
    name: "백향목",
    members: ["백향목"],
  },
];

const mode = process.argv[2]; // "sync" or undefined

async function seed() {
  console.log("🌱 Seeding database...");

  for (const cellData of CELL_DATA) {
    // 셀 조회, 없으면 생성
    const existing = await db
      .select({ id: cells.id })
      .from(cells)
      .where(eq(cells.name, cellData.name))
      .limit(1);

    const cellId =
      existing[0]?.id ??
      (
        await db
          .insert(cells)
          .values({ name: cellData.name })
          .returning({ id: cells.id })
      )[0].id;

    console.log(`  ✓ 셀: ${cellData.name} (${cellId})`);

    if (mode === "sync") {
      // sync 모드: 기존 멤버 삭제 후 재등록
      await db.delete(cellMembers).where(eq(cellMembers.cellId, cellId));
    }

    // 셀 멤버 등록
    if (cellData.members.length > 0) {
      await db
        .insert(cellMembers)
        .values(
          cellData.members.map((name) => ({
            cellId,
            name,
          })),
        )
        .onConflictDoNothing();
      console.log(`    멤버 ${cellData.members.length}명 등록`);
    }
  }

  console.log("\n✅ Seed 완료!");
  process.exit(0);
}

seed().catch((e) => {
  console.error("❌ Seed 실패:", e);
  process.exit(1);
});
