import { db } from "@/lib/db";
import { verses } from "@/lib/db/schema";
import { desc } from "drizzle-orm";

export type VerseCandidate = {
  id: string;
  referenceKo: string;
  deepLinkUrl: string;
  themes: string[];
  situationTags: string[];
  emotionTags: string[];
  summary: string | null;
  isGeneric: boolean;
  weight: number;
};

/**
 * 추천 후보 구절을 조회한다.
 * MVP: 복잡한 벡터/검색 없이 weight 내림차순으로 상위 N개를 전달한다.
 * isGeneric=true 구절은 비중을 줄이기 위해 뒤쪽에 배치한다.
 */
export async function fetchVerseCandidates(limit = 80): Promise<VerseCandidate[]> {
  const rows = await db
    .select({
      id: verses.id,
      referenceKo: verses.referenceKo,
      deepLinkUrl: verses.deepLinkUrl,
      themes: verses.themes,
      situationTags: verses.situationTags,
      emotionTags: verses.emotionTags,
      summary: verses.summary,
      isGeneric: verses.isGeneric,
      weight: verses.weight,
    })
    .from(verses)
    .orderBy(desc(verses.weight))
    .limit(limit);

  return rows.sort((a, b) => Number(a.isGeneric) - Number(b.isGeneric));
}
