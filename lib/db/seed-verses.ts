/**
 * 추천용 장절 메타데이터 시드 — 300개 큐레이션.
 * 실행: `npx tsx lib/db/seed-verses.ts`
 *
 * 목적:
 *   사용자의 회개/결단 카드(epitaph)를 임베딩 검색했을 때 의미적으로 가까운
 *   말씀 후보를 잘 뽑기 위한 "추천용 메타데이터" 풀을 만든다.
 *   성경 본문 데이터베이스가 아니다.
 *
 * 작성 원칙 (자세한 가이드는 lib/scripture/README.md 참고):
 *   1. 개역개정 본문은 절대 저장/인용하지 않는다.
 *   2. summary 는 본문 인용이 아니라 "이 장절이 어떤 카드에 추천되면 좋은지" 설명한다.
 *   3. themes / situationTags / emotionTags 는 역할을 섞지 않는다.
 *   4. specificity 는 상황 적합도(1~5)이며, weight 는 운영상 우선순위(50~95)다.
 *   5. isGeneric 은 seed 에 직접 쓰지 않고 specificity <= 2 로 자동 계산한다.
 *   6. intentTags / userActionTags 는 사용하지 않는다.
 *   7. perspectiveKey 는 추천 결과 다양성을 위해 일관된 키로 유지한다.
 *
 * 동작:
 *   1. 각 verse 에 대해 buildVerseEmbeddingText() 로 임베딩 텍스트를 만들고,
 *      Gemini Embedding API 로 768차원 벡터를 받는다.
 *   2. verse 테이블에 upsert (deepLinkUrl/embeddingText/embedding/isGeneric 자동 생성).
 *   3. 동일 embeddingText/model 이면 임베딩은 스킵 (FORCE_REEMBED=1 로 강제 가능).
 *
 * 환경변수:
 *   DATABASE_URL              (필수)
 *   GEMINI_API_KEY            (필수)
 *   GEMINI_EMBEDDING_MODEL    (선택, 기본 gemini-embedding-001)
 *   SEED_FORCE_REEMBED=1      (선택) 동일 embeddingText 라도 강제 재임베딩.
 *   SEED_VALIDATE_ONLY=1      (선택) DB 접속/임베딩 호출 없이 validateVerseSeeds() 만 실행.
 *
 * TODO: 개역개정 원문 직접 저장/노출 전 대한성서공회 저작권 검토 필요
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sql, eq, and } from "drizzle-orm";
import { verses } from "./schema";
import { embedText } from "@/lib/ai/gemini";
import { buildVerseEmbeddingText } from "@/lib/scripture/verse-repository";

// ─── 타입 ─────────────────────────────────────────────────────────────────

/**
 * 말씀 톤. Gemini 선택 단계에서 "책망" 톤 후보를 회피하기 위한 구조 필드.
 *
 *   권면 — 일반적 권면/가르침 (기본값)
 *   회복 — 회개/돌이킴/긍휼 강조 (사유, 자비, 다시 일어남)
 *   결단 — 행동/결심/십자가/자기부인
 *   위로 — 위로/안식/평강/함께하심
 *   소망 — 소망/인내/장차의 영광
 *   감사 — 감사/찬양/기쁨
 *   지혜 — 분별/지혜/하나님의 뜻
 *   책망 — 강한 단죄/심판/멸망/지옥 톤. 사용자 카드가 회개/결단인 경우 회피 대상.
 */
export type VerseTone =
  | "권면"
  | "회복"
  | "결단"
  | "위로"
  | "소망"
  | "감사"
  | "지혜"
  | "책망";

export const VERSE_TONES: readonly VerseTone[] = [
  "권면",
  "회복",
  "결단",
  "위로",
  "소망",
  "감사",
  "지혜",
  "책망",
] as const;

/**
 * 작성자가 직접 입력하는 시드 형태.
 * 다음 필드는 시드에 직접 쓰지 않는다 (코드에서 자동 생성):
 *   deepLinkUrl, embeddingText, embedding, embeddingModel, isGeneric.
 * 다음 필드는 사용하지 않는다:
 *   intentTags, userActionTags.
 */
export type VerseSeed = {
  referenceKo: string;
  bookAbbrEn: string;
  chapter: number;
  verseStart: number;
  verseEnd?: number | null;

  themes: string[];
  situationTags: string[];
  emotionTags: string[];

  summary: string;

  /** 1~5. 5에 가까울수록 특정 회개/결단 상황에 정확히 맞음. specificity <= 2 면 isGeneric=true 로 자동 계산. */
  specificity: 1 | 2 | 3 | 4 | 5;
  /** 같은 카드에 같은 관점이 중복 추천되지 않도록 묶는 키. */
  perspectiveKey: string;
  /** 이 장절을 추천하면 부담이 될 수 있는 상황 태그. 없으면 빈 배열. */
  avoidTags: string[];

  /** 운영상 우선순위 (50~95). 절대 100 사용 금지. specificity 와 역할이 다르다. */
  weight: number;

  /** 말씀 톤. 책망 톤은 회개/결단 카드에서 가능한 한 회피된다. */
  tone: VerseTone;
};

// ─── 링크 생성 ────────────────────────────────────────────────────────────

/**
 * 대한성서공회 개역개정 딥링크.
 * 단일 절: BOOK.CH.V / 범위: BOOK.CH.START-BOOK.CH.END
 * 범위 포맷이어야 사이트에서 하이라이트가 정상 적용된다.
 */
export const link = (
  book: string,
  chapter: number,
  verseStart: number,
  verseEnd?: number | null
) => {
  const base = `https://bible.bskorea.or.kr/bible/NKRV/${book}.${chapter}.${verseStart}`;
  return verseEnd && verseEnd !== verseStart
    ? `${base}-${book}.${chapter}.${verseEnd}`
    : base;
};

// ─── 300개 큐레이션 시드 ──────────────────────────────────────────────────

/** 카테고리별 분포 (총 300):
 *  1. 회개/죄인식/돌이킴: 33
 *  2. 십자가/옛사람/새사람/부활: 28
 *  3. 게으름/성실/생활질서: 18
 *  4. 불안/두려움/염려/담대함: 28
 *  5. 분노/말/관계/용서: 34
 *  6. 정욕/정결/절제: 18
 *  7. 교만/인정욕구/비교의식: 23
 *  8. 탐심/돈/소유/만족: 14
 *  9. 기도/말씀/예배 회복: 28
 * 10. 공동체/사랑/섬김: 19
 * 11. 낙심/무기력/소망: 20
 * 12. 하나님의 뜻/진로/일/직장/맡김: 23
 * 13. 감사/기쁨/평안: 14
 */
export const VERSE_SEEDS: VerseSeed[] = [
  // ─── 1. 회개 / 죄 인식 / 돌이킴 (33) ──────────────────────────────
  { referenceKo: "시편 51:1-4", bookAbbrEn: "PSA", chapter: 51, verseStart: 1, verseEnd: 4, themes: ["회개", "겸손"], situationTags: ["죄고백", "자기정죄"], emotionTags: ["죄책감", "수치심"], summary: "자신의 죄를 변명 없이 인정하며 주님 앞에 정직히 자복하려는 상황에 적합하다.", specificity: 5, perspectiveKey: "회개돌이킴", avoidTags: ["심한자기정죄"], tone: "회복", weight: 89 },
  { referenceKo: "시편 51:10", bookAbbrEn: "PSA", chapter: 51, verseStart: 10, themes: ["회개", "정결"], situationTags: ["죄고백", "말씀회복"], emotionTags: ["죄책감"], summary: "어그러진 마음을 정직히 고백하며 새 마음을 다시 구하려는 상황에 적합하다.", specificity: 4, perspectiveKey: "회개돌이킴", avoidTags: [], tone: "회복", weight: 90 },
  { referenceKo: "시편 51:17", bookAbbrEn: "PSA", chapter: 51, verseStart: 17, themes: ["회개", "겸손"], situationTags: ["죄고백", "자기정죄"], emotionTags: ["죄책감", "낙심"], summary: "겉치레가 아니라 상한 마음으로 주님 앞에 나아가려는 상황에 적합하다.", specificity: 4, perspectiveKey: "회개돌이킴", avoidTags: ["심한자기정죄"], tone: "회복", weight: 84 },
  { referenceKo: "시편 32:3-5", bookAbbrEn: "PSA", chapter: 32, verseStart: 3, verseEnd: 5, themes: ["회개", "정결"], situationTags: ["죄고백"], emotionTags: ["죄책감", "답답함"], summary: "감추고 있던 죄를 더 이상 숨기지 않고 자복하려는 상황에 적합하다.", specificity: 5, perspectiveKey: "회개돌이킴", avoidTags: ["심한자기정죄"], tone: "회복", weight: 86 },
  { referenceKo: "시편 38:18", bookAbbrEn: "PSA", chapter: 38, verseStart: 18, themes: ["회개", "겸손"], situationTags: ["죄고백"], emotionTags: ["죄책감"], summary: "자기 죄악을 정직히 아뢰며 슬퍼하는 회개의 자리에 적합하다.", specificity: 4, perspectiveKey: "회개돌이킴", avoidTags: ["심한자기정죄"], tone: "회복", weight: 72 },
  { referenceKo: "시편 130:3-4", bookAbbrEn: "PSA", chapter: 130, verseStart: 3, verseEnd: 4, themes: ["회개", "용서"], situationTags: ["죄고백", "자기정죄"], emotionTags: ["죄책감", "낙심"], summary: "내 죄를 단죄로 끝내지 않고 사유하시는 분께 다시 나아가려는 상황에 적합하다.", specificity: 4, perspectiveKey: "회개돌이킴", avoidTags: [], tone: "위로", weight: 80 },
  { referenceKo: "시편 25:7", bookAbbrEn: "PSA", chapter: 25, verseStart: 7, themes: ["회개", "용서"], situationTags: ["죄고백", "자기정죄"], emotionTags: ["죄책감", "수치심"], summary: "지난 시절의 잘못까지 다시 끌어내며 자비를 구하려는 상황에 적합하다.", specificity: 4, perspectiveKey: "회개돌이킴", avoidTags: ["심한자기정죄"], tone: "회복", weight: 70 },
  { referenceKo: "시편 19:12-13", bookAbbrEn: "PSA", chapter: 19, verseStart: 12, verseEnd: 13, themes: ["회개", "정결"], situationTags: ["죄고백", "영적무감각"], emotionTags: ["혼란"], summary: "내가 모르고 지은 허물과 고의의 죄까지 같이 돌이키려는 상황에 적합하다.", specificity: 5, perspectiveKey: "회개돌이킴", avoidTags: [], tone: "회복", weight: 78 },
  { referenceKo: "시편 139:23-24", bookAbbrEn: "PSA", chapter: 139, verseStart: 23, verseEnd: 24, themes: ["회개", "정결"], situationTags: ["죄고백", "영적무감각"], emotionTags: ["혼란"], summary: "내 마음 깊은 동기까지 살펴 달라고 정직히 구하려는 상황에 적합하다.", specificity: 5, perspectiveKey: "회개돌이킴", avoidTags: [], tone: "회복", weight: 82 },
  { referenceKo: "잠언 28:13", bookAbbrEn: "PRO", chapter: 28, verseStart: 13, themes: ["회개", "정결"], situationTags: ["죄고백", "책임회피"], emotionTags: ["죄책감"], summary: "감추고 변명하던 죄를 자복하고 길에서 돌이키려는 상황에 적합하다.", specificity: 5, perspectiveKey: "회개돌이킴", avoidTags: [], tone: "회복", weight: 90 },
  { referenceKo: "잠언 14:9", bookAbbrEn: "PRO", chapter: 14, verseStart: 9, themes: ["회개", "겸손"], situationTags: ["책임회피", "죄고백"], emotionTags: ["죄책감"], summary: "죄를 가볍게 여기던 마음을 멈추고 진지하게 돌이키려는 상황에 적합하다.", specificity: 4, perspectiveKey: "회개돌이킴", avoidTags: ["심한자기정죄"], tone: "책망", weight: 65 },
  { referenceKo: "잠언 28:14", bookAbbrEn: "PRO", chapter: 28, verseStart: 14, themes: ["회개", "겸손"], situationTags: ["영적무감각", "자기정죄"], emotionTags: ["답답함"], summary: "마음이 무뎌지지 않도록 두려운 마음으로 자기를 돌아보려는 상황에 적합하다.", specificity: 4, perspectiveKey: "회개돌이킴", avoidTags: [], tone: "회복", weight: 66 },
  { referenceKo: "이사야 1:16-18", bookAbbrEn: "ISA", chapter: 1, verseStart: 16, verseEnd: 18, themes: ["회개", "정결"], situationTags: ["죄고백", "관계갈등"], emotionTags: ["죄책감"], summary: "악한 행위를 그치고 다시 정한 길로 돌이키려는 결단의 자리에 적합하다.", specificity: 4, perspectiveKey: "회개돌이킴", avoidTags: ["심한자기정죄"], tone: "회복", weight: 80 },
  { referenceKo: "이사야 55:6-7", bookAbbrEn: "ISA", chapter: 55, verseStart: 6, verseEnd: 7, themes: ["회개", "용서"], situationTags: ["죄고백", "영적무감각"], emotionTags: ["죄책감"], summary: "지금이라도 주님께 돌이켜 자비와 사유를 구하려는 상황에 적합하다.", specificity: 4, perspectiveKey: "회개돌이킴", avoidTags: [], tone: "회복", weight: 84 },
  { referenceKo: "호세아 6:1-3", bookAbbrEn: "HOS", chapter: 6, verseStart: 1, verseEnd: 3, themes: ["회개", "신뢰"], situationTags: ["죄고백", "기도결단"], emotionTags: ["낙심"], summary: "상한 자리에서 주님께 돌아가 다시 회복을 구하려는 결단에 적합하다.", specificity: 4, perspectiveKey: "회개돌이킴", avoidTags: [], tone: "회복", weight: 78 },
  { referenceKo: "호세아 14:1-2", bookAbbrEn: "HOS", chapter: 14, verseStart: 1, verseEnd: 2, themes: ["회개", "겸손"], situationTags: ["죄고백", "기도결단"], emotionTags: ["죄책감"], summary: "걸려 넘어진 자리에서 다시 말씀을 가지고 주께 돌아가려는 상황에 적합하다.", specificity: 4, perspectiveKey: "회개돌이킴", avoidTags: [], tone: "회복", weight: 74 },
  { referenceKo: "요엘 2:12-13", bookAbbrEn: "JOL", chapter: 2, verseStart: 12, verseEnd: 13, themes: ["회개", "겸손"], situationTags: ["죄고백", "기도결단"], emotionTags: ["죄책감"], summary: "옷이 아니라 마음을 찢고 주님께 돌이키려는 진심의 자리에 적합하다.", specificity: 4, perspectiveKey: "회개돌이킴", avoidTags: ["심한자기정죄"], tone: "회복", weight: 78 },
  { referenceKo: "예레미야 31:18-19", bookAbbrEn: "JER", chapter: 31, verseStart: 18, verseEnd: 19, themes: ["회개", "겸손"], situationTags: ["죄고백", "자기정죄"], emotionTags: ["죄책감", "수치심"], summary: "스스로의 어리석음을 깨닫고 다시 주님께 돌아가려는 탄식에 적합하다.", specificity: 4, perspectiveKey: "회개돌이킴", avoidTags: ["심한자기정죄"], tone: "회복", weight: 70 },
  { referenceKo: "예레미야애가 3:40", bookAbbrEn: "LAM", chapter: 3, verseStart: 40, themes: ["회개", "정결"], situationTags: ["죄고백", "영적무감각"], emotionTags: ["답답함"], summary: "오늘의 행위를 정직히 살피고 주님께로 돌이키려는 결단에 적합하다.", specificity: 4, perspectiveKey: "회개돌이킴", avoidTags: [], tone: "회복", weight: 72 },
  { referenceKo: "다니엘 9:5", bookAbbrEn: "DAN", chapter: 9, verseStart: 5, themes: ["회개", "겸손"], situationTags: ["죄고백", "공동체회복"], emotionTags: ["죄책감"], summary: "공동체와 자신의 죄를 회피 없이 함께 자복하려는 상황에 적합하다.", specificity: 4, perspectiveKey: "회개돌이킴", avoidTags: [], tone: "회복", weight: 68 },
  { referenceKo: "에스겔 18:30-32", bookAbbrEn: "EZK", chapter: 18, verseStart: 30, verseEnd: 32, themes: ["회개", "새사람"], situationTags: ["죄고백", "기도결단"], emotionTags: ["죄책감"], summary: "지금 자리에서 돌이켜 새 마음으로 다시 살아가려는 결단에 적합하다.", specificity: 4, perspectiveKey: "회개돌이킴", avoidTags: ["심한자기정죄"], tone: "회복", weight: 76 },
  { referenceKo: "마태복음 3:8", bookAbbrEn: "MAT", chapter: 3, verseStart: 8, themes: ["회개", "성실"], situationTags: ["기도결단", "책임회피"], emotionTags: ["답답함"], summary: "말과 다짐만이 아니라 합당한 열매로 회개를 보이려는 결단에 적합하다.", specificity: 4, perspectiveKey: "회개돌이킴", avoidTags: ["심한자기정죄"], tone: "회복", weight: 70 },
  { referenceKo: "마태복음 4:17", bookAbbrEn: "MAT", chapter: 4, verseStart: 17, themes: ["회개"], situationTags: ["기도결단"], emotionTags: ["혼란"], summary: "지금 이 자리에서 천국 백성으로 마음을 돌이키려는 부르심에 적합하다.", specificity: 3, perspectiveKey: "회개돌이킴", avoidTags: [], tone: "회복", weight: 68 },
  { referenceKo: "누가복음 15:18-21", bookAbbrEn: "LUK", chapter: 15, verseStart: 18, verseEnd: 21, themes: ["회개", "용서"], situationTags: ["죄고백", "관계갈등"], emotionTags: ["죄책감", "수치심"], summary: "멀어졌던 자리를 인정하고 아버지께 다시 돌아가려는 결단에 적합하다.", specificity: 5, perspectiveKey: "회개돌이킴", avoidTags: [], tone: "회복", weight: 86 },
  { referenceKo: "누가복음 18:13", bookAbbrEn: "LUK", chapter: 18, verseStart: 13, themes: ["회개", "겸손"], situationTags: ["죄고백", "자기정죄"], emotionTags: ["죄책감", "수치심"], summary: "내세울 것 없이 죄인의 자리에서 자비를 구하려는 기도에 적합하다.", specificity: 4, perspectiveKey: "회개돌이킴", avoidTags: ["심한자기정죄"], tone: "회복", weight: 80 },
  { referenceKo: "사도행전 2:38", bookAbbrEn: "ACT", chapter: 2, verseStart: 38, themes: ["회개", "성령"], situationTags: ["죄고백", "기도결단"], emotionTags: ["혼란"], summary: "회개와 성령을 함께 구하며 새로 출발하려는 결단의 자리에 적합하다.", specificity: 3, perspectiveKey: "회개돌이킴", avoidTags: [], tone: "회복", weight: 64 },
  { referenceKo: "사도행전 3:19", bookAbbrEn: "ACT", chapter: 3, verseStart: 19, themes: ["회개", "정결"], situationTags: ["죄고백", "기도결단"], emotionTags: ["죄책감"], summary: "죄가 도말되기를 구하며 다시 주님께로 돌이키려는 상황에 적합하다.", specificity: 4, perspectiveKey: "회개돌이킴", avoidTags: [], tone: "회복", weight: 72 },
  { referenceKo: "로마서 2:4", bookAbbrEn: "ROM", chapter: 2, verseStart: 4, themes: ["회개", "사랑"], situationTags: ["죄고백", "자기정죄"], emotionTags: ["죄책감"], summary: "정죄가 아니라 인자하심이 회개로 이끄심을 다시 붙들려는 상황에 적합하다.", specificity: 4, perspectiveKey: "회개돌이킴", avoidTags: [], tone: "위로", weight: 78 },
  { referenceKo: "고린도후서 7:9-10", bookAbbrEn: "2CO", chapter: 7, verseStart: 9, verseEnd: 10, themes: ["회개", "정결"], situationTags: ["죄고백", "자기정죄"], emotionTags: ["죄책감", "낙심"], summary: "후회로만 끝나지 않는 진짜 회개로 마음을 돌이키려는 상황에 적합하다.", specificity: 5, perspectiveKey: "회개돌이킴", avoidTags: ["심한자기정죄"], tone: "회복", weight: 82 },
  { referenceKo: "야고보서 4:8-10", bookAbbrEn: "JAS", chapter: 4, verseStart: 8, verseEnd: 10, themes: ["회개", "겸손"], situationTags: ["죄고백", "기도결단"], emotionTags: ["죄책감"], summary: "두 마음을 정리하고 주님 앞에 정직히 가까이 나아가려는 결단에 적합하다.", specificity: 4, perspectiveKey: "회개돌이킴", avoidTags: ["심한자기정죄"], tone: "회복", weight: 78 },
  { referenceKo: "요한일서 1:9", bookAbbrEn: "1JN", chapter: 1, verseStart: 9, themes: ["회개", "용서", "정결"], situationTags: ["죄고백", "자기정죄"], emotionTags: ["죄책감"], summary: "자백한 죄를 사하시고 깨끗하게 하시는 주님께 다시 나아가려는 상황에 적합하다.", specificity: 4, perspectiveKey: "회개돌이킴", avoidTags: [], tone: "회복", weight: 92 },
  { referenceKo: "요한계시록 2:5", bookAbbrEn: "REV", chapter: 2, verseStart: 5, themes: ["회개"], situationTags: ["영적무감각", "예배회복"], emotionTags: ["공허함"], summary: "처음 사랑에서 떨어진 자리를 기억하고 다시 첫마음으로 돌이키려는 상황에 적합하다.", specificity: 4, perspectiveKey: "회개돌이킴", avoidTags: ["심한자기정죄"], tone: "회복", weight: 74 },
  { referenceKo: "요한계시록 3:19", bookAbbrEn: "REV", chapter: 3, verseStart: 19, themes: ["회개", "사랑"], situationTags: ["죄고백", "영적무감각"], emotionTags: ["답답함"], summary: "주님의 책망까지 사랑으로 받아 회개하려는 진지한 결단에 적합하다.", specificity: 3, perspectiveKey: "회개돌이킴", avoidTags: ["심한자기정죄"], tone: "회복", weight: 64 },

  // ─── 2. 십자가 / 옛사람 / 새사람 / 부활 (28) ──────────────────────
  { referenceKo: "마태복음 16:24-25", bookAbbrEn: "MAT", chapter: 16, verseStart: 24, verseEnd: 25, themes: ["십자가", "순종"], situationTags: ["기도결단", "자기방임"], emotionTags: ["답답함"], summary: "내 뜻을 내려놓고 자기 십자가를 지고 주님을 따르려는 결단에 적합하다.", specificity: 4, perspectiveKey: "십자가자기부인", avoidTags: [], tone: "결단", weight: 86 },
  { referenceKo: "마가복음 8:34-35", bookAbbrEn: "MRK", chapter: 8, verseStart: 34, verseEnd: 35, themes: ["십자가", "순종"], situationTags: ["기도결단"], emotionTags: ["답답함"], summary: "자기 생명을 붙들지 않고 주님을 위해 내려놓으려는 결단에 적합하다.", specificity: 4, perspectiveKey: "십자가자기부인", avoidTags: [], tone: "결단", weight: 78 },
  { referenceKo: "누가복음 9:23", bookAbbrEn: "LUK", chapter: 9, verseStart: 23, themes: ["십자가", "성실"], situationTags: ["기도결단", "생활질서무너짐"], emotionTags: ["답답함", "무기력"], summary: "단번이 아니라 매일 자기를 부인하는 일상의 결단에 적합하다.", specificity: 4, perspectiveKey: "십자가자기부인", avoidTags: [], tone: "결단", weight: 84 },
  { referenceKo: "갈라디아서 2:20", bookAbbrEn: "GAL", chapter: 2, verseStart: 20, themes: ["십자가", "새사람", "정체성"], situationTags: ["죄고백", "기도결단"], emotionTags: ["죄책감"], summary: "옛 자아가 죽고 그리스도께서 내 안에 사시는 정체성을 다시 붙들려는 상황에 적합하다.", specificity: 4, perspectiveKey: "새사람정체성", avoidTags: [], tone: "결단", weight: 93 },
  { referenceKo: "갈라디아서 5:24", bookAbbrEn: "GAL", chapter: 5, verseStart: 24, themes: ["십자가", "정결", "절제"], situationTags: ["정욕유혹", "중독습관"], emotionTags: ["죄책감", "답답함"], summary: "육체의 욕심을 십자가에 못 박는 결단으로 정결을 회복하려는 상황에 적합하다.", specificity: 5, perspectiveKey: "정욕정결", avoidTags: [], tone: "결단", weight: 86 },
  { referenceKo: "로마서 6:4-5", bookAbbrEn: "ROM", chapter: 6, verseStart: 4, verseEnd: 5, themes: ["부활", "새사람"], situationTags: ["죄고백", "영적무감각"], emotionTags: ["죄책감"], summary: "옛 삶에 장사된 정체성을 붙들고 새 생명 가운데 다시 일어서려는 상황에 적합하다.", specificity: 4, perspectiveKey: "새사람정체성", avoidTags: [], tone: "결단", weight: 84 },
  { referenceKo: "로마서 6:6", bookAbbrEn: "ROM", chapter: 6, verseStart: 6, themes: ["십자가", "새사람", "정결"], situationTags: ["중독습관", "죄고백"], emotionTags: ["죄책감"], summary: "옛사람이 십자가에 못 박혔음을 붙들고 죄의 종노릇에서 벗어나려는 상황에 적합하다.", specificity: 5, perspectiveKey: "새사람정체성", avoidTags: [], tone: "결단", weight: 91 },
  { referenceKo: "로마서 6:11-13", bookAbbrEn: "ROM", chapter: 6, verseStart: 11, verseEnd: 13, themes: ["새사람", "순종", "정결"], situationTags: ["중독습관", "정욕유혹"], emotionTags: ["죄책감", "답답함"], summary: "내 지체를 죄에 내어주지 않고 의의 도구로 다시 드리려는 결단에 적합하다.", specificity: 5, perspectiveKey: "새사람정체성", avoidTags: [], tone: "결단", weight: 84 },
  { referenceKo: "로마서 12:1-2", bookAbbrEn: "ROM", chapter: 12, verseStart: 1, verseEnd: 2, themes: ["순종", "예배", "새사람"], situationTags: ["기도결단", "예배회복"], emotionTags: ["혼란"], summary: "내 몸을 산 제사로 드리며 세상에 휩쓸리지 않으려는 결단에 적합하다.", specificity: 4, perspectiveKey: "새사람정체성", avoidTags: [], tone: "결단", weight: 92 },
  { referenceKo: "고린도후서 5:14-15", bookAbbrEn: "2CO", chapter: 5, verseStart: 14, verseEnd: 15, themes: ["사랑", "십자가", "순종"], situationTags: ["기도결단", "예배회복"], emotionTags: ["감사"], summary: "주님의 사랑에 사로잡혀 더 이상 자기를 위해 살지 않으려는 결단에 적합하다.", specificity: 4, perspectiveKey: "십자가자기부인", avoidTags: [], tone: "결단", weight: 80 },
  { referenceKo: "고린도후서 5:17", bookAbbrEn: "2CO", chapter: 5, verseStart: 17, themes: ["새사람", "정체성", "부활"], situationTags: ["죄고백", "영적무감각"], emotionTags: ["죄책감", "수치심"], summary: "옛 삶의 방식에서 벗어나 그리스도 안의 새 정체성을 다시 붙들려는 상황에 적합하다.", specificity: 2, perspectiveKey: "새사람정체성", avoidTags: [], tone: "회복", weight: 88 },
  { referenceKo: "고린도후서 5:21", bookAbbrEn: "2CO", chapter: 5, verseStart: 21, themes: ["십자가", "정체성"], situationTags: ["죄고백", "자기정죄"], emotionTags: ["죄책감", "수치심"], summary: "내 죄가 그분께 전가된 은혜를 붙들고 다시 일어서려는 상황에 적합하다.", specificity: 4, perspectiveKey: "새사람정체성", avoidTags: [], tone: "위로", weight: 80 },
  { referenceKo: "에베소서 2:4-6", bookAbbrEn: "EPH", chapter: 2, verseStart: 4, verseEnd: 6, themes: ["부활", "새사람", "사랑"], situationTags: ["죄고백", "영적무감각"], emotionTags: ["낙심"], summary: "허물 가운데서 함께 살리신 은혜를 다시 붙들려는 상황에 적합하다.", specificity: 3, perspectiveKey: "새사람정체성", avoidTags: [], tone: "위로", weight: 78 },
  { referenceKo: "에베소서 4:22-24", bookAbbrEn: "EPH", chapter: 4, verseStart: 22, verseEnd: 24, themes: ["새사람", "정결"], situationTags: ["중독습관", "죄고백"], emotionTags: ["답답함", "죄책감"], summary: "옛사람의 행실을 벗고 새사람을 다시 입으려는 결단에 적합하다.", specificity: 5, perspectiveKey: "새사람정체성", avoidTags: [], tone: "결단", weight: 90 },
  { referenceKo: "골로새서 2:12", bookAbbrEn: "COL", chapter: 2, verseStart: 12, themes: ["부활", "새사람"], situationTags: ["죄고백", "영적무감각"], emotionTags: ["답답함"], summary: "그리스도와 함께 장사되고 함께 일으켜진 정체성을 다시 붙들려는 상황에 적합하다.", specificity: 3, perspectiveKey: "새사람정체성", avoidTags: [], tone: "결단", weight: 70 },
  { referenceKo: "골로새서 3:1-4", bookAbbrEn: "COL", chapter: 3, verseStart: 1, verseEnd: 4, themes: ["새사람", "정체성"], situationTags: ["영적무감각", "예배회복"], emotionTags: ["공허함"], summary: "땅에 묶인 생각을 들어 위의 것을 다시 사모하려는 상황에 적합하다.", specificity: 3, perspectiveKey: "새사람정체성", avoidTags: [], tone: "결단", weight: 76 },
  { referenceKo: "골로새서 3:5-10", bookAbbrEn: "COL", chapter: 3, verseStart: 5, verseEnd: 10, themes: ["새사람", "정결", "절제"], situationTags: ["정욕유혹", "탐심", "분노폭발"], emotionTags: ["죄책감", "답답함"], summary: "옛사람의 욕심과 행실을 벗고 새사람의 모습을 입으려는 결단에 적합하다.", specificity: 5, perspectiveKey: "새사람정체성", avoidTags: ["심한자기정죄"], tone: "결단", weight: 88 },
  { referenceKo: "빌립보서 3:7-8", bookAbbrEn: "PHP", chapter: 3, verseStart: 7, verseEnd: 8, themes: ["십자가", "정체성"], situationTags: ["인정욕구", "기도결단"], emotionTags: ["혼란"], summary: "내 자랑과 이력을 배설물로 여기고 그리스도만을 다시 붙들려는 상황에 적합하다.", specificity: 4, perspectiveKey: "교만겸손", avoidTags: [], tone: "결단", weight: 80 },
  { referenceKo: "빌립보서 3:10-11", bookAbbrEn: "PHP", chapter: 3, verseStart: 10, verseEnd: 11, themes: ["부활", "십자가"], situationTags: ["기도결단", "예배회복"], emotionTags: ["답답함"], summary: "주의 부활의 권능과 고난에 동참하기를 다시 사모하려는 상황에 적합하다.", specificity: 4, perspectiveKey: "새사람정체성", avoidTags: [], tone: "결단", weight: 76 },
  { referenceKo: "빌립보서 3:12-14", bookAbbrEn: "PHP", chapter: 3, verseStart: 12, verseEnd: 14, themes: ["순종", "소망"], situationTags: ["미루는습관", "기도결단"], emotionTags: ["낙심"], summary: "지난 실패에 매이지 않고 푯대를 향해 다시 달려가려는 결단에 적합하다.", specificity: 4, perspectiveKey: "새사람정체성", avoidTags: ["심한자기정죄"], tone: "소망", weight: 80 },
  { referenceKo: "베드로전서 1:3", bookAbbrEn: "1PE", chapter: 1, verseStart: 3, themes: ["부활", "소망"], situationTags: ["영적무감각", "예배회복"], emotionTags: ["낙심"], summary: "산 소망을 다시 붙들고 부활하신 주님 안에서 일어서려는 상황에 적합하다.", specificity: 3, perspectiveKey: "새사람정체성", avoidTags: [], tone: "소망", weight: 76 },
  { referenceKo: "베드로전서 1:18-19", bookAbbrEn: "1PE", chapter: 1, verseStart: 18, verseEnd: 19, themes: ["십자가", "정체성"], situationTags: ["죄고백", "자기정죄"], emotionTags: ["죄책감"], summary: "보배로운 피로 값주고 사신 정체성을 다시 기억하려는 상황에 적합하다.", specificity: 3, perspectiveKey: "새사람정체성", avoidTags: [], tone: "위로", weight: 74 },
  { referenceKo: "베드로전서 2:24", bookAbbrEn: "1PE", chapter: 2, verseStart: 24, themes: ["십자가", "정결"], situationTags: ["죄고백", "중독습관"], emotionTags: ["죄책감"], summary: "주님의 짐 지심으로 죄에 대해 죽고 의에 대해 살려는 상황에 적합하다.", specificity: 4, perspectiveKey: "새사람정체성", avoidTags: [], tone: "위로", weight: 78 },
  { referenceKo: "요한복음 11:25-26", bookAbbrEn: "JHN", chapter: 11, verseStart: 25, verseEnd: 26, themes: ["부활", "신뢰"], situationTags: ["기도결단", "예배회복"], emotionTags: ["낙심", "두려움"], summary: "죽음 너머의 부활과 생명을 다시 붙들고 일어서려는 상황에 적합하다.", specificity: 3, perspectiveKey: "새사람정체성", avoidTags: ["애도"], tone: "소망", weight: 72 },
  { referenceKo: "요한복음 12:24-25", bookAbbrEn: "JHN", chapter: 12, verseStart: 24, verseEnd: 25, themes: ["십자가", "순종"], situationTags: ["기도결단"], emotionTags: ["답답함"], summary: "한 알의 밀처럼 자기 자리를 내어놓아 다음 열매로 이어지려는 결단에 적합하다.", specificity: 4, perspectiveKey: "십자가자기부인", avoidTags: [], tone: "결단", weight: 78 },
  { referenceKo: "누가복음 24:5-6", bookAbbrEn: "LUK", chapter: 24, verseStart: 5, verseEnd: 6, themes: ["부활", "정체성"], situationTags: ["영적무감각", "예배회복"], emotionTags: ["낙심"], summary: "옛 무덤에 매이지 않고 살아나신 주님을 다시 따라가려는 상황에 적합하다.", specificity: 3, perspectiveKey: "새사람정체성", avoidTags: ["애도"], tone: "소망", weight: 78 },
  { referenceKo: "마가복음 16:6", bookAbbrEn: "MRK", chapter: 16, verseStart: 6, themes: ["부활"], situationTags: ["영적무감각", "예배회복"], emotionTags: ["낙심"], summary: "비어 있는 무덤 앞에서 부활하신 주님을 다시 바라보려는 상황에 적합하다.", specificity: 2, perspectiveKey: "새사람정체성", avoidTags: ["애도"], tone: "소망", weight: 64 },
  { referenceKo: "사도행전 4:33", bookAbbrEn: "ACT", chapter: 4, verseStart: 33, themes: ["부활", "공동체"], situationTags: ["예배회복", "공동체회복"], emotionTags: ["기쁨"], summary: "부활하신 주님을 함께 증거하는 공동체의 자리에 다시 서려는 상황에 적합하다.", specificity: 3, perspectiveKey: "새사람정체성", avoidTags: [], tone: "결단", weight: 60 },

  // ─── 3. 게으름 / 성실 / 생활질서 (18) ─────────────────────────────
  { referenceKo: "잠언 24:30-34", bookAbbrEn: "PRO", chapter: 24, verseStart: 30, verseEnd: 34, themes: ["성실", "생활질서", "회개"], situationTags: ["생활질서무너짐", "자기방임", "미루는습관"], emotionTags: ["무기력", "답답함"], summary: "무너진 생활 질서와 자기방임을 돌아보며 작은 책임을 다시 붙들려는 상황에 적합하다.", specificity: 5, perspectiveKey: "생활질서회복", avoidTags: ["심한자기정죄"], tone: "권면", weight: 94 },
  { referenceKo: "잠언 6:6-11", bookAbbrEn: "PRO", chapter: 6, verseStart: 6, verseEnd: 11, themes: ["성실", "지혜", "생활질서"], situationTags: ["미루는습관", "자기방임"], emotionTags: ["무기력"], summary: "쉽게 미뤄온 일들을 다시 정직하게 시작해 보려는 결단에 적합하다.", specificity: 5, perspectiveKey: "성실책임", avoidTags: ["심한자기정죄"], tone: "권면", weight: 86 },
  { referenceKo: "잠언 10:4-5", bookAbbrEn: "PRO", chapter: 10, verseStart: 4, verseEnd: 5, themes: ["성실", "지혜"], situationTags: ["미루는습관", "자기방임"], emotionTags: ["무기력"], summary: "때를 놓치지 않고 오늘의 작은 책임을 다시 붙들려는 상황에 적합하다.", specificity: 4, perspectiveKey: "성실책임", avoidTags: ["심한자기정죄"], tone: "권면", weight: 74 },
  { referenceKo: "잠언 12:24", bookAbbrEn: "PRO", chapter: 12, verseStart: 24, themes: ["성실", "지혜"], situationTags: ["미루는습관", "자기방임"], emotionTags: ["무기력"], summary: "일을 미루기보다 부지런히 자기 자리를 지키려는 결단에 적합하다.", specificity: 4, perspectiveKey: "성실책임", avoidTags: ["심한자기정죄"], tone: "권면", weight: 70 },
  { referenceKo: "잠언 13:4", bookAbbrEn: "PRO", chapter: 13, verseStart: 4, themes: ["성실"], situationTags: ["자기방임", "미루는습관"], emotionTags: ["무기력", "답답함"], summary: "원하기만 하고 움직이지 못하던 자리에서 다시 손을 들어 시작하려는 상황에 적합하다.", specificity: 4, perspectiveKey: "성실책임", avoidTags: [], tone: "권면", weight: 70 },
  { referenceKo: "잠언 14:23", bookAbbrEn: "PRO", chapter: 14, verseStart: 23, themes: ["성실", "지혜"], situationTags: ["미루는습관", "자기방임"], emotionTags: ["답답함"], summary: "말이 아니라 작은 수고로 오늘을 다시 살아가려는 결단에 적합하다.", specificity: 3, perspectiveKey: "성실책임", avoidTags: [], tone: "권면", weight: 66 },
  { referenceKo: "잠언 18:9", bookAbbrEn: "PRO", chapter: 18, verseStart: 9, themes: ["성실", "성실"], situationTags: ["자기방임", "책임회피"], emotionTags: ["답답함"], summary: "내가 맡은 자리를 흘려보내지 않고 다시 챙기려는 상황에 적합하다.", specificity: 4, perspectiveKey: "성실책임", avoidTags: ["심한자기정죄"], tone: "권면", weight: 64 },
  { referenceKo: "잠언 19:15", bookAbbrEn: "PRO", chapter: 19, verseStart: 15, themes: ["성실", "생활질서"], situationTags: ["자기방임", "미루는습관"], emotionTags: ["무기력"], summary: "잠과 미룸의 고리를 끊고 일상의 리듬을 다시 잡으려는 상황에 적합하다.", specificity: 4, perspectiveKey: "생활질서회복", avoidTags: ["심한자기정죄"], tone: "권면", weight: 70 },
  { referenceKo: "잠언 20:4", bookAbbrEn: "PRO", chapter: 20, verseStart: 4, themes: ["성실", "지혜"], situationTags: ["미루는습관", "책임회피"], emotionTags: ["무기력"], summary: "때를 핑계 삼지 않고 지금 해야 할 일에 손을 대려는 결단에 적합하다.", specificity: 4, perspectiveKey: "성실책임", avoidTags: ["심한자기정죄"], tone: "권면", weight: 64 },
  { referenceKo: "잠언 21:25-26", bookAbbrEn: "PRO", chapter: 21, verseStart: 25, verseEnd: 26, themes: ["성실"], situationTags: ["자기방임", "미루는습관"], emotionTags: ["무기력", "답답함"], summary: "원하기만 하고 손을 움직이지 않던 자리를 돌아보려는 상황에 적합하다.", specificity: 4, perspectiveKey: "성실책임", avoidTags: ["심한자기정죄"], tone: "권면", weight: 64 },
  { referenceKo: "잠언 22:13", bookAbbrEn: "PRO", chapter: 22, verseStart: 13, themes: ["성실", "지혜"], situationTags: ["책임회피", "미루는습관"], emotionTags: ["답답함"], summary: "두려움과 핑계로 미뤄두던 일을 다시 정면으로 마주하려는 상황에 적합하다.", specificity: 4, perspectiveKey: "성실책임", avoidTags: ["심한자기정죄"], tone: "권면", weight: 60 },
  { referenceKo: "잠언 26:13-15", bookAbbrEn: "PRO", chapter: 26, verseStart: 13, verseEnd: 15, themes: ["성실"], situationTags: ["책임회피", "자기방임"], emotionTags: ["무기력"], summary: "꾸며대던 핑계를 멈추고 오늘 작은 일에 다시 손을 대려는 상황에 적합하다.", specificity: 4, perspectiveKey: "성실책임", avoidTags: ["심한자기정죄"], tone: "권면", weight: 62 },
  { referenceKo: "전도서 9:10", bookAbbrEn: "ECC", chapter: 9, verseStart: 10, themes: ["성실"], situationTags: ["자기방임", "미루는습관"], emotionTags: ["무기력"], summary: "오늘 손에 잡힌 일에 마음을 다해 다시 임하려는 결단에 적합하다.", specificity: 4, perspectiveKey: "성실책임", avoidTags: [], tone: "권면", weight: 78 },
  { referenceKo: "전도서 11:6", bookAbbrEn: "ECC", chapter: 11, verseStart: 6, themes: ["성실", "신뢰"], situationTags: ["미루는습관", "계획맡김"], emotionTags: ["답답함"], summary: "결과를 정해놓지 않고 아침저녁 작은 씨를 다시 뿌리려는 상황에 적합하다.", specificity: 4, perspectiveKey: "성실책임", avoidTags: [], tone: "권면", weight: 70 },
  { referenceKo: "골로새서 3:23", bookAbbrEn: "COL", chapter: 3, verseStart: 23, themes: ["성실", "예배"], situationTags: ["일의부담", "회사어려움"], emotionTags: ["답답함"], summary: "오늘의 일을 사람이 아니라 주님께 드리듯 다시 임하려는 결단에 적합하다.", specificity: 4, perspectiveKey: "성실책임", avoidTags: [], tone: "권면", weight: 78 },
  { referenceKo: "데살로니가후서 3:10-12", bookAbbrEn: "2TH", chapter: 3, verseStart: 10, verseEnd: 12, themes: ["성실", "공동체"], situationTags: ["자기방임", "공동체회복"], emotionTags: ["답답함"], summary: "공동체에 짐이 되지 않도록 자기 자리를 다시 붙들려는 상황에 적합하다.", specificity: 4, perspectiveKey: "성실책임", avoidTags: ["심한자기정죄"], tone: "권면", weight: 64 },
  { referenceKo: "에베소서 5:15-16", bookAbbrEn: "EPH", chapter: 5, verseStart: 15, verseEnd: 16, themes: ["지혜", "생활질서"], situationTags: ["미루는습관", "생활질서무너짐"], emotionTags: ["답답함"], summary: "흘려보내던 시간을 멈추고 오늘을 지혜롭게 다시 다잡으려는 상황에 적합하다.", specificity: 4, perspectiveKey: "생활질서회복", avoidTags: [], tone: "권면", weight: 76 },
  { referenceKo: "디도서 3:14", bookAbbrEn: "TIT", chapter: 3, verseStart: 14, themes: ["성실", "공동체"], situationTags: ["섬김회피", "자기방임"], emotionTags: ["답답함"], summary: "꼭 필요한 자리에서 손을 들어 함께 일을 감당하려는 결단에 적합하다.", specificity: 4, perspectiveKey: "성실책임", avoidTags: [], tone: "권면", weight: 60 },

  // ─── 4. 불안 / 두려움 / 염려 / 담대함 (28) ────────────────────────
  { referenceKo: "빌립보서 4:6-7", bookAbbrEn: "PHP", chapter: 4, verseStart: 6, verseEnd: 7, themes: ["기도", "감사", "평안"], situationTags: ["기도결단", "감사회복", "계획맡김"], emotionTags: ["불안", "답답함", "초조함"], summary: "불안과 답답함 속에서 기도와 감사로 마음을 주님께 돌이키려는 상황에 적합하다.", specificity: 4, perspectiveKey: "불안기도", avoidTags: [], tone: "위로", weight: 92 },
  { referenceKo: "베드로전서 5:7", bookAbbrEn: "1PE", chapter: 5, verseStart: 7, themes: ["기도", "신뢰"], situationTags: ["기도결단", "계획맡김"], emotionTags: ["불안", "답답함"], summary: "혼자 끌어안고 있던 염려를 주님께 다시 맡기려는 상황에 적합하다.", specificity: 3, perspectiveKey: "불안기도", avoidTags: [], tone: "위로", weight: 86 },
  { referenceKo: "마태복음 6:25-27", bookAbbrEn: "MAT", chapter: 6, verseStart: 25, verseEnd: 27, themes: ["신뢰", "평안"], situationTags: ["돈염려", "계획맡김"], emotionTags: ["불안", "초조함"], summary: "내일의 먹을 것 입을 것에 매인 마음을 아버지의 돌보심에 맡기려는 상황에 적합하다.", specificity: 4, perspectiveKey: "불안기도", avoidTags: [], tone: "위로", weight: 80 },
  { referenceKo: "마태복음 6:33-34", bookAbbrEn: "MAT", chapter: 6, verseStart: 33, verseEnd: 34, themes: ["하나님의뜻", "신뢰"], situationTags: ["계획맡김", "돈염려"], emotionTags: ["불안", "초조함"], summary: "내일을 미리 끌어와 흔들리기보다 오늘 그분의 나라를 먼저 구하려는 상황에 적합하다.", specificity: 4, perspectiveKey: "계획맡김", avoidTags: [], tone: "지혜", weight: 88 },
  { referenceKo: "여호수아 1:9", bookAbbrEn: "JOS", chapter: 1, verseStart: 9, themes: ["담대함", "신뢰"], situationTags: ["회사어려움", "리더십부담"], emotionTags: ["두려움", "불안"], summary: "두렵게 보이는 자리에서도 함께하시는 분을 의지해 다시 일어서려는 상황에 적합하다.", specificity: 4, perspectiveKey: "두려움담대함", avoidTags: [], tone: "위로", weight: 90 },
  { referenceKo: "신명기 31:6", bookAbbrEn: "DEU", chapter: 31, verseStart: 6, themes: ["담대함", "신뢰"], situationTags: ["회사어려움", "리더십부담"], emotionTags: ["두려움"], summary: "버려두지 않으시는 주님을 의지해 두려움 앞에서 다시 발걸음을 내딛으려는 상황에 적합하다.", specificity: 3, perspectiveKey: "두려움담대함", avoidTags: [], tone: "위로", weight: 78 },
  { referenceKo: "이사야 41:10", bookAbbrEn: "ISA", chapter: 41, verseStart: 10, themes: ["담대함", "신뢰", "평안"], situationTags: ["회사어려움", "기도결단"], emotionTags: ["두려움", "불안"], summary: "함께하시고 붙드시는 분을 의지해 두려움을 다시 내려놓으려는 상황에 적합하다.", specificity: 3, perspectiveKey: "두려움담대함", avoidTags: [], tone: "위로", weight: 88 },
  { referenceKo: "이사야 41:13", bookAbbrEn: "ISA", chapter: 41, verseStart: 13, themes: ["담대함", "신뢰"], situationTags: ["회사어려움", "기도결단"], emotionTags: ["두려움"], summary: "내 손을 잡아주시는 주님을 의지해 두려움 앞에서 다시 일어서려는 상황에 적합하다.", specificity: 3, perspectiveKey: "두려움담대함", avoidTags: [], tone: "위로", weight: 78 },
  { referenceKo: "이사야 43:1-2", bookAbbrEn: "ISA", chapter: 43, verseStart: 1, verseEnd: 2, themes: ["담대함", "신뢰"], situationTags: ["회사어려움", "기도결단"], emotionTags: ["두려움", "불안"], summary: "물과 불 같은 어려움 가운데서도 부르신 이름을 다시 붙들려는 상황에 적합하다.", specificity: 4, perspectiveKey: "두려움담대함", avoidTags: ["애도"], tone: "위로", weight: 84 },
  { referenceKo: "이사야 26:3", bookAbbrEn: "ISA", chapter: 26, verseStart: 3, themes: ["평안", "신뢰"], situationTags: ["기도결단", "계획맡김"], emotionTags: ["불안", "초조함"], summary: "흔들리는 마음을 다시 주님께 모으며 평강을 구하려는 상황에 적합하다.", specificity: 4, perspectiveKey: "평안회복", avoidTags: [], tone: "위로", weight: 80 },
  { referenceKo: "시편 23:1-4", bookAbbrEn: "PSA", chapter: 23, verseStart: 1, verseEnd: 4, themes: ["신뢰", "평안"], situationTags: ["기도결단"], emotionTags: ["두려움", "불안"], summary: "어두운 골짜기 같은 자리에서도 함께 가시는 목자를 의지하려는 상황에 적합하다.", specificity: 2, perspectiveKey: "평안회복", avoidTags: [], tone: "위로", weight: 78 },
  { referenceKo: "시편 27:1", bookAbbrEn: "PSA", chapter: 27, verseStart: 1, themes: ["담대함", "신뢰"], situationTags: ["회사어려움", "기도결단"], emotionTags: ["두려움", "불안"], summary: "두려움의 대상보다 빛이신 주님을 더 크게 바라보려는 상황에 적합하다.", specificity: 3, perspectiveKey: "두려움담대함", avoidTags: [], tone: "위로", weight: 72 },
  { referenceKo: "시편 34:4", bookAbbrEn: "PSA", chapter: 34, verseStart: 4, themes: ["기도", "신뢰"], situationTags: ["기도결단", "계획맡김"], emotionTags: ["두려움", "불안"], summary: "두려움을 혼자 다스리려 하지 않고 다시 주님께 부르짖으려는 상황에 적합하다.", specificity: 3, perspectiveKey: "불안기도", avoidTags: [], tone: "위로", weight: 72 },
  { referenceKo: "시편 46:1-3", bookAbbrEn: "PSA", chapter: 46, verseStart: 1, verseEnd: 3, themes: ["담대함", "평안", "신뢰"], situationTags: ["회사어려움", "기도결단"], emotionTags: ["두려움", "불안"], summary: "땅이 흔들리는 듯한 상황에서도 피난처 되시는 주님을 다시 의지하려는 상황에 적합하다.", specificity: 3, perspectiveKey: "두려움담대함", avoidTags: [], tone: "위로", weight: 78 },
  { referenceKo: "시편 56:3-4", bookAbbrEn: "PSA", chapter: 56, verseStart: 3, verseEnd: 4, themes: ["신뢰", "담대함"], situationTags: ["기도결단", "회사어려움"], emotionTags: ["두려움", "불안"], summary: "두려움이 밀려올 때마다 다시 주님을 의지하려는 결단에 적합하다.", specificity: 4, perspectiveKey: "두려움담대함", avoidTags: [], tone: "위로", weight: 76 },
  { referenceKo: "시편 91:1-2", bookAbbrEn: "PSA", chapter: 91, verseStart: 1, verseEnd: 2, themes: ["신뢰", "평안"], situationTags: ["기도결단"], emotionTags: ["두려움", "불안"], summary: "지존자의 그늘 아래로 다시 들어가 평안과 보호를 구하려는 상황에 적합하다.", specificity: 2, perspectiveKey: "평안회복", avoidTags: [], tone: "위로", weight: 70 },
  { referenceKo: "시편 121:1-2", bookAbbrEn: "PSA", chapter: 121, verseStart: 1, verseEnd: 2, themes: ["신뢰", "담대함"], situationTags: ["기도결단", "계획맡김"], emotionTags: ["불안", "두려움"], summary: "막막한 자리에서 천지 지으신 주님을 다시 우러러보려는 상황에 적합하다.", specificity: 3, perspectiveKey: "두려움담대함", avoidTags: [], tone: "위로", weight: 78 },
  { referenceKo: "시편 138:7", bookAbbrEn: "PSA", chapter: 138, verseStart: 7, themes: ["담대함", "신뢰"], situationTags: ["회사어려움", "기도결단"], emotionTags: ["두려움", "낙심"], summary: "환난 한가운데서 살리시는 주님의 손을 다시 의지하려는 상황에 적합하다.", specificity: 3, perspectiveKey: "두려움담대함", avoidTags: [], tone: "위로", weight: 70 },
  { referenceKo: "시편 55:22", bookAbbrEn: "PSA", chapter: 55, verseStart: 22, themes: ["기도", "신뢰"], situationTags: ["기도결단", "계획맡김"], emotionTags: ["불안", "답답함"], summary: "혼자 짊어진 짐을 다시 주님께 맡기려는 상황에 적합하다.", specificity: 3, perspectiveKey: "불안기도", avoidTags: [], tone: "위로", weight: 78 },
  { referenceKo: "잠언 3:5-6", bookAbbrEn: "PRO", chapter: 3, verseStart: 5, verseEnd: 6, themes: ["신뢰", "지혜", "하나님의뜻"], situationTags: ["계획맡김", "기도결단"], emotionTags: ["불안", "혼란"], summary: "내 명철에 기대지 않고 모든 길에서 주님을 다시 인정하려는 결단에 적합하다.", specificity: 3, perspectiveKey: "계획맡김", avoidTags: [], tone: "지혜", weight: 86 },
  { referenceKo: "잠언 12:25", bookAbbrEn: "PRO", chapter: 12, verseStart: 25, themes: ["평안", "공동체"], situationTags: ["기도결단", "공동체회복"], emotionTags: ["불안", "낙심"], summary: "마음을 무겁게 짓누르는 근심을 좋은 말과 기도로 다시 풀어내려는 상황에 적합하다.", specificity: 4, perspectiveKey: "불안기도", avoidTags: [], tone: "위로", weight: 64 },
  { referenceKo: "디모데후서 1:7", bookAbbrEn: "2TI", chapter: 1, verseStart: 7, themes: ["담대함", "성령", "절제"], situationTags: ["회사어려움", "리더십부담"], emotionTags: ["두려움", "불안"], summary: "두려워하는 마음에 머물지 않고 능력과 사랑과 절제의 마음을 다시 구하려는 상황에 적합하다.", specificity: 4, perspectiveKey: "두려움담대함", avoidTags: [], tone: "위로", weight: 86 },
  { referenceKo: "요한복음 14:1", bookAbbrEn: "JHN", chapter: 14, verseStart: 1, themes: ["평안", "신뢰"], situationTags: ["기도결단"], emotionTags: ["불안", "두려움"], summary: "흔들리는 마음을 다잡고 다시 주님을 신뢰하려는 상황에 적합하다.", specificity: 3, perspectiveKey: "평안회복", avoidTags: [], tone: "위로", weight: 72 },
  { referenceKo: "요한복음 14:27", bookAbbrEn: "JHN", chapter: 14, verseStart: 27, themes: ["평안"], situationTags: ["기도결단"], emotionTags: ["불안", "두려움", "초조함"], summary: "세상이 주는 평안 대신 주님이 주시는 평강을 다시 구하려는 상황에 적합하다.", specificity: 3, perspectiveKey: "평안회복", avoidTags: [], tone: "위로", weight: 78 },
  { referenceKo: "요한복음 16:33", bookAbbrEn: "JHN", chapter: 16, verseStart: 33, themes: ["담대함", "평안"], situationTags: ["회사어려움", "기도결단"], emotionTags: ["불안", "두려움"], summary: "환난 가운데서도 이미 이기신 주님을 의지해 다시 담대함을 회복하려는 상황에 적합하다.", specificity: 3, perspectiveKey: "두려움담대함", avoidTags: [], tone: "위로", weight: 80 },
  { referenceKo: "누가복음 12:22-26", bookAbbrEn: "LUK", chapter: 12, verseStart: 22, verseEnd: 26, themes: ["신뢰", "평안"], situationTags: ["돈염려", "계획맡김"], emotionTags: ["불안", "초조함"], summary: "내 키 한 자도 더할 수 없는 염려를 멈추고 아버지의 돌보심에 맡기려는 상황에 적합하다.", specificity: 4, perspectiveKey: "불안기도", avoidTags: [], tone: "위로", weight: 76 },
  { referenceKo: "마가복음 4:39-40", bookAbbrEn: "MRK", chapter: 4, verseStart: 39, verseEnd: 40, themes: ["담대함", "신뢰"], situationTags: ["회사어려움", "기도결단"], emotionTags: ["두려움", "불안"], summary: "풍랑같이 흔들리는 마음 가운데서 다시 주님을 신뢰하려는 상황에 적합하다.", specificity: 3, perspectiveKey: "두려움담대함", avoidTags: [], tone: "위로", weight: 70 },
  { referenceKo: "시편 16:8", bookAbbrEn: "PSA", chapter: 16, verseStart: 8, themes: ["담대함", "신뢰"], situationTags: ["기도결단"], emotionTags: ["불안"], summary: "흔들리지 않도록 늘 주님을 내 앞에 모시려는 결단에 적합하다.", specificity: 3, perspectiveKey: "평안회복", avoidTags: [], tone: "위로", weight: 68 },

  // ─── 5. 분노 / 말 / 관계 / 용서 (34) ──────────────────────────────
  { referenceKo: "야고보서 1:19-20", bookAbbrEn: "JAS", chapter: 1, verseStart: 19, verseEnd: 20, themes: ["절제", "겸손"], situationTags: ["분노폭발", "관계갈등"], emotionTags: ["분노", "답답함"], summary: "쉽게 끓던 분과 말의 자리를 멈추고 다시 듣는 자리로 돌이키려는 상황에 적합하다.", specificity: 5, perspectiveKey: "분노절제", avoidTags: [], tone: "권면", weight: 90 },
  { referenceKo: "야고보서 3:5-6", bookAbbrEn: "JAS", chapter: 3, verseStart: 5, verseEnd: 6, themes: ["절제"], situationTags: ["말의죄", "관계갈등"], emotionTags: ["분노", "죄책감"], summary: "혀가 만든 작은 불꽃이 번지지 않도록 말을 다시 다스리려는 상황에 적합하다.", specificity: 5, perspectiveKey: "말의죄절제", avoidTags: [], tone: "책망", weight: 80 },
  { referenceKo: "야고보서 4:11-12", bookAbbrEn: "JAS", chapter: 4, verseStart: 11, verseEnd: 12, themes: ["겸손", "공동체"], situationTags: ["말의죄", "관계갈등"], emotionTags: ["분노"], summary: "형제를 비방하던 말의 자리에서 다시 멈춰 서려는 상황에 적합하다.", specificity: 4, perspectiveKey: "말의죄절제", avoidTags: [], tone: "책망", weight: 70 },
  { referenceKo: "마태복음 5:21-22", bookAbbrEn: "MAT", chapter: 5, verseStart: 21, verseEnd: 22, themes: ["회개", "절제"], situationTags: ["분노폭발", "말의죄"], emotionTags: ["분노", "죄책감"], summary: "겉으로 드러난 행위만이 아니라 마음의 분노까지 다시 돌아보려는 상황에 적합하다.", specificity: 5, perspectiveKey: "분노절제", avoidTags: ["심한자기정죄"], tone: "책망", weight: 78 },
  { referenceKo: "마태복음 5:23-24", bookAbbrEn: "MAT", chapter: 5, verseStart: 23, verseEnd: 24, themes: ["용서", "예배"], situationTags: ["관계갈등", "용서어려움"], emotionTags: ["답답함", "죄책감"], summary: "예배보다 먼저 끊어진 관계로 가서 화해하려는 결단에 적합하다.", specificity: 5, perspectiveKey: "관계화해", avoidTags: ["관계폭력"], tone: "결단", weight: 88 },
  { referenceKo: "마태복음 5:38-42", bookAbbrEn: "MAT", chapter: 5, verseStart: 38, verseEnd: 42, themes: ["사랑", "절제"], situationTags: ["관계갈등", "분노폭발"], emotionTags: ["분노", "상처"], summary: "되갚으려는 마음을 멈추고 더 길게 사랑하려는 결단에 적합하다.", specificity: 4, perspectiveKey: "관계용서", avoidTags: ["관계폭력"], tone: "결단", weight: 72 },
  { referenceKo: "마태복음 5:43-48", bookAbbrEn: "MAT", chapter: 5, verseStart: 43, verseEnd: 48, themes: ["사랑", "용서"], situationTags: ["관계갈등", "용서어려움"], emotionTags: ["분노", "상처"], summary: "원수처럼 느껴지는 사람을 위해 다시 기도하기로 결단하는 상황에 적합하다.", specificity: 4, perspectiveKey: "관계용서", avoidTags: ["관계폭력"], tone: "결단", weight: 80 },
  { referenceKo: "마태복음 6:14-15", bookAbbrEn: "MAT", chapter: 6, verseStart: 14, verseEnd: 15, themes: ["용서"], situationTags: ["용서어려움", "관계갈등"], emotionTags: ["분노", "상처"], summary: "받은 용서를 기억하며 미루던 용서를 다시 시작하려는 상황에 적합하다.", specificity: 4, perspectiveKey: "관계용서", avoidTags: ["심한자기정죄"], tone: "권면", weight: 78 },
  { referenceKo: "마태복음 18:15", bookAbbrEn: "MAT", chapter: 18, verseStart: 15, themes: ["공동체", "용서"], situationTags: ["관계갈등", "공동체회복"], emotionTags: ["답답함"], summary: "쌓아두지 않고 직접 가서 정직하게 풀어보려는 결단에 적합하다.", specificity: 4, perspectiveKey: "관계화해", avoidTags: ["관계폭력"], tone: "권면", weight: 70 },
  { referenceKo: "마태복음 18:21-22", bookAbbrEn: "MAT", chapter: 18, verseStart: 21, verseEnd: 22, themes: ["용서"], situationTags: ["용서어려움", "관계갈등"], emotionTags: ["분노", "상처"], summary: "한계까지 왔다고 느낄 때 다시 한 번 용서의 자리로 돌이키려는 상황에 적합하다.", specificity: 4, perspectiveKey: "관계용서", avoidTags: ["관계폭력"], tone: "권면", weight: 78 },
  { referenceKo: "마태복음 18:23-35", bookAbbrEn: "MAT", chapter: 18, verseStart: 23, verseEnd: 35, themes: ["용서", "겸손"], situationTags: ["용서어려움", "관계갈등"], emotionTags: ["분노", "상처"], summary: "내가 받은 큰 빚 탕감을 기억하며 작은 빚을 다시 놓아주려는 상황에 적합하다.", specificity: 5, perspectiveKey: "관계용서", avoidTags: ["관계폭력"], tone: "권면", weight: 78 },
  { referenceKo: "누가복음 6:27-31", bookAbbrEn: "LUK", chapter: 6, verseStart: 27, verseEnd: 31, themes: ["사랑", "용서"], situationTags: ["관계갈등", "용서어려움"], emotionTags: ["분노", "상처"], summary: "맞은 자리에서도 축복과 사랑으로 응답하려는 결단에 적합하다.", specificity: 4, perspectiveKey: "관계용서", avoidTags: ["관계폭력"], tone: "권면", weight: 74 },
  { referenceKo: "누가복음 17:3-4", bookAbbrEn: "LUK", chapter: 17, verseStart: 3, verseEnd: 4, themes: ["용서", "공동체"], situationTags: ["용서어려움", "관계갈등"], emotionTags: ["분노"], summary: "회개하는 형제를 향해 다시 용서의 자리로 나아가려는 상황에 적합하다.", specificity: 4, perspectiveKey: "관계용서", avoidTags: ["관계폭력"], tone: "권면", weight: 70 },
  { referenceKo: "누가복음 23:34", bookAbbrEn: "LUK", chapter: 23, verseStart: 34, themes: ["용서", "사랑"], situationTags: ["용서어려움", "관계갈등"], emotionTags: ["상처", "분노"], summary: "상처 한복판에서도 용서를 위해 다시 기도하려는 결단에 적합하다.", specificity: 3, perspectiveKey: "관계용서", avoidTags: ["관계폭력"], tone: "권면", weight: 76 },
  { referenceKo: "로마서 12:14-21", bookAbbrEn: "ROM", chapter: 12, verseStart: 14, verseEnd: 21, themes: ["사랑", "용서", "절제"], situationTags: ["관계갈등", "분노폭발"], emotionTags: ["분노", "상처"], summary: "되갚지 않고 선으로 악을 이기려는 결단의 자리에 적합하다.", specificity: 4, perspectiveKey: "관계용서", avoidTags: ["관계폭력"], tone: "권면", weight: 80 },
  { referenceKo: "에베소서 4:25", bookAbbrEn: "EPH", chapter: 4, verseStart: 25, themes: ["정결", "공동체"], situationTags: ["거짓말", "관계갈등"], emotionTags: ["죄책감"], summary: "꾸며낸 말을 멈추고 형제에게 정직한 말을 다시 회복하려는 상황에 적합하다.", specificity: 5, perspectiveKey: "말의죄절제", avoidTags: ["심한자기정죄"], tone: "결단", weight: 76 },
  { referenceKo: "에베소서 4:26-27", bookAbbrEn: "EPH", chapter: 4, verseStart: 26, verseEnd: 27, themes: ["절제", "용서"], situationTags: ["분노폭발", "관계갈등"], emotionTags: ["분노"], summary: "분을 품은 채 잠들지 않고 그날 안에 정리하려는 결단에 적합하다.", specificity: 5, perspectiveKey: "분노절제", avoidTags: [], tone: "결단", weight: 84 },
  { referenceKo: "에베소서 4:29", bookAbbrEn: "EPH", chapter: 4, verseStart: 29, themes: ["절제", "공동체", "사랑"], situationTags: ["말의죄", "관계갈등"], emotionTags: ["답답함"], summary: "허는 말 대신 듣는 자에게 은혜를 끼치는 말로 다시 돌이키려는 상황에 적합하다.", specificity: 5, perspectiveKey: "말의죄절제", avoidTags: [], tone: "권면", weight: 92 },
  { referenceKo: "에베소서 4:31-32", bookAbbrEn: "EPH", chapter: 4, verseStart: 31, verseEnd: 32, themes: ["용서", "사랑", "절제"], situationTags: ["분노폭발", "용서어려움"], emotionTags: ["분노", "상처"], summary: "악독과 분노를 버리고 받은 용서대로 서로를 용납하려는 결단에 적합하다.", specificity: 5, perspectiveKey: "관계용서", avoidTags: ["관계폭력"], tone: "권면", weight: 86 },
  { referenceKo: "골로새서 3:8-9", bookAbbrEn: "COL", chapter: 3, verseStart: 8, verseEnd: 9, themes: ["새사람", "절제", "정결"], situationTags: ["분노폭발", "말의죄", "거짓말"], emotionTags: ["분노", "죄책감"], summary: "분과 악의와 거짓을 버리고 새사람의 모습을 다시 입으려는 결단에 적합하다.", specificity: 5, perspectiveKey: "분노절제", avoidTags: ["심한자기정죄"], tone: "권면", weight: 78 },
  { referenceKo: "골로새서 3:13", bookAbbrEn: "COL", chapter: 3, verseStart: 13, themes: ["용서", "사랑", "공동체"], situationTags: ["용서어려움", "관계갈등"], emotionTags: ["분노", "상처"], summary: "주께 용서받은 만큼 서로 용납하고 용서하려는 결단에 적합하다.", specificity: 5, perspectiveKey: "관계용서", avoidTags: ["관계폭력"], tone: "권면", weight: 88 },
  { referenceKo: "잠언 10:19", bookAbbrEn: "PRO", chapter: 10, verseStart: 19, themes: ["절제", "지혜"], situationTags: ["말의죄"], emotionTags: ["답답함"], summary: "말이 많아 허물이 쌓이던 자리를 돌아보고 입을 다시 지키려는 상황에 적합하다.", specificity: 4, perspectiveKey: "말의죄절제", avoidTags: [], tone: "권면", weight: 66 },
  { referenceKo: "잠언 12:18", bookAbbrEn: "PRO", chapter: 12, verseStart: 18, themes: ["절제", "사랑"], situationTags: ["말의죄", "관계갈등"], emotionTags: ["상처", "죄책감"], summary: "찌르는 말 대신 살리는 말로 사람을 다시 세우려는 상황에 적합하다.", specificity: 4, perspectiveKey: "말의죄절제", avoidTags: [], tone: "권면", weight: 70 },
  { referenceKo: "잠언 15:1", bookAbbrEn: "PRO", chapter: 15, verseStart: 1, themes: ["절제", "지혜"], situationTags: ["분노폭발", "관계갈등"], emotionTags: ["분노"], summary: "분을 더 키우는 말 대신 유순한 대답으로 다툼을 멈추려는 상황에 적합하다.", specificity: 5, perspectiveKey: "분노절제", avoidTags: [], tone: "권면", weight: 76 },
  { referenceKo: "잠언 17:9", bookAbbrEn: "PRO", chapter: 17, verseStart: 9, themes: ["사랑", "용서"], situationTags: ["관계갈등", "말의죄"], emotionTags: ["상처"], summary: "허물을 들춰내기보다 덮어주며 관계를 다시 회복하려는 상황에 적합하다.", specificity: 4, perspectiveKey: "관계용서", avoidTags: ["관계폭력"], tone: "권면", weight: 72 },
  { referenceKo: "잠언 17:14", bookAbbrEn: "PRO", chapter: 17, verseStart: 14, themes: ["절제", "지혜"], situationTags: ["관계갈등", "분노폭발"], emotionTags: ["분노"], summary: "다툼이 커지기 전에 먼저 멈춰 서려는 결단에 적합하다.", specificity: 4, perspectiveKey: "분노절제", avoidTags: [], tone: "권면", weight: 68 },
  { referenceKo: "잠언 18:21", bookAbbrEn: "PRO", chapter: 18, verseStart: 21, themes: ["절제", "사랑"], situationTags: ["말의죄"], emotionTags: ["답답함"], summary: "죽이고 살리는 혀의 무게를 기억하며 말을 다시 다스리려는 상황에 적합하다.", specificity: 4, perspectiveKey: "말의죄절제", avoidTags: [], tone: "권면", weight: 70 },
  { referenceKo: "잠언 19:11", bookAbbrEn: "PRO", chapter: 19, verseStart: 11, themes: ["절제", "용서"], situationTags: ["분노폭발", "관계갈등"], emotionTags: ["분노"], summary: "허물을 즉시 받아치지 않고 천천히 노를 다스리려는 결단에 적합하다.", specificity: 5, perspectiveKey: "분노절제", avoidTags: [], tone: "권면", weight: 76 },
  { referenceKo: "잠언 21:23", bookAbbrEn: "PRO", chapter: 21, verseStart: 23, themes: ["절제", "지혜"], situationTags: ["말의죄"], emotionTags: ["답답함"], summary: "함부로 새어 나오던 말을 멈추고 입을 다시 지키려는 결단에 적합하다.", specificity: 4, perspectiveKey: "말의죄절제", avoidTags: [], tone: "권면", weight: 66 },
  { referenceKo: "잠언 25:11", bookAbbrEn: "PRO", chapter: 25, verseStart: 11, themes: ["지혜", "사랑"], situationTags: ["말의죄", "관계갈등"], emotionTags: ["답답함"], summary: "때에 맞는 말로 사람을 다시 세우려는 결단에 적합하다.", specificity: 3, perspectiveKey: "말의죄절제", avoidTags: [], tone: "권면", weight: 60 },
  { referenceKo: "잠언 29:11", bookAbbrEn: "PRO", chapter: 29, verseStart: 11, themes: ["절제", "지혜"], situationTags: ["분노폭발", "말의죄"], emotionTags: ["분노"], summary: "노를 즉시 다 쏟지 않고 마음을 다시 다스리려는 결단에 적합하다.", specificity: 4, perspectiveKey: "분노절제", avoidTags: [], tone: "권면", weight: 68 },
  { referenceKo: "베드로전서 3:8-9", bookAbbrEn: "1PE", chapter: 3, verseStart: 8, verseEnd: 9, themes: ["사랑", "공동체", "용서"], situationTags: ["관계갈등", "용서어려움"], emotionTags: ["분노", "상처"], summary: "악을 악으로 갚지 않고 서로 마음을 같이하여 다시 축복하려는 결단에 적합하다.", specificity: 4, perspectiveKey: "관계용서", avoidTags: ["관계폭력"], tone: "권면", weight: 74 },
  { referenceKo: "베드로전서 4:8", bookAbbrEn: "1PE", chapter: 4, verseStart: 8, themes: ["사랑", "용서", "공동체"], situationTags: ["관계갈등", "용서어려움"], emotionTags: ["상처"], summary: "지나간 허물을 사랑으로 덮어주며 관계를 다시 세우려는 상황에 적합하다.", specificity: 4, perspectiveKey: "관계용서", avoidTags: ["관계폭력"], tone: "권면", weight: 76 },
  { referenceKo: "시편 141:3", bookAbbrEn: "PSA", chapter: 141, verseStart: 3, themes: ["절제", "기도"], situationTags: ["말의죄"], emotionTags: ["답답함", "죄책감"], summary: "터져 나오던 말 앞에 주님이 친히 파수꾼이 되어 주시기를 구하는 상황에 적합하다.", specificity: 4, perspectiveKey: "말의죄절제", avoidTags: [], tone: "권면", weight: 70 },

  // ─── 6. 정욕 / 정결 / 절제 (18) ───────────────────────────────────
  { referenceKo: "데살로니가전서 4:3-5", bookAbbrEn: "1TH", chapter: 4, verseStart: 3, verseEnd: 5, themes: ["정결", "순종", "절제"], situationTags: ["정욕유혹", "중독습관"], emotionTags: ["죄책감"], summary: "음란을 버리고 자기 몸을 거룩하게 다스리려는 결단에 적합하다.", specificity: 5, perspectiveKey: "정욕정결", avoidTags: ["심한자기정죄"], tone: "결단", weight: 90 },
  { referenceKo: "고린도전서 6:18-20", bookAbbrEn: "1CO", chapter: 6, verseStart: 18, verseEnd: 20, themes: ["정결", "정체성"], situationTags: ["정욕유혹", "중독습관"], emotionTags: ["죄책감", "수치심"], summary: "성령의 전된 몸을 기억하며 음행을 피해 정결로 다시 돌이키려는 상황에 적합하다.", specificity: 5, perspectiveKey: "정욕정결", avoidTags: ["심한자기정죄"], tone: "결단", weight: 86 },
  { referenceKo: "고린도전서 10:13", bookAbbrEn: "1CO", chapter: 10, verseStart: 13, themes: ["절제", "신뢰"], situationTags: ["정욕유혹", "중독습관"], emotionTags: ["답답함", "죄책감"], summary: "감당하지 못할 시험은 없다는 약속을 의지해 다시 피할 길을 구하려는 상황에 적합하다.", specificity: 4, perspectiveKey: "절제훈련", avoidTags: ["심한자기정죄"], tone: "결단", weight: 88 },
  { referenceKo: "시편 119:9-11", bookAbbrEn: "PSA", chapter: 119, verseStart: 9, verseEnd: 11, themes: ["말씀", "정결"], situationTags: ["정욕유혹", "말씀회복"], emotionTags: ["죄책감"], summary: "흔들리던 마음을 말씀에 다시 쌓아 정결한 길을 지키려는 결단에 적합하다.", specificity: 5, perspectiveKey: "정욕정결", avoidTags: [], tone: "결단", weight: 88 },
  { referenceKo: "마태복음 5:27-28", bookAbbrEn: "MAT", chapter: 5, verseStart: 27, verseEnd: 28, themes: ["정결", "회개"], situationTags: ["정욕유혹", "죄고백"], emotionTags: ["죄책감", "수치심"], summary: "행위만이 아니라 마음 속 음욕까지 다시 정직히 돌아보려는 상황에 적합하다.", specificity: 5, perspectiveKey: "정욕정결", avoidTags: ["심한자기정죄"], tone: "책망", weight: 80 },
  { referenceKo: "디모데후서 2:22", bookAbbrEn: "2TI", chapter: 2, verseStart: 22, themes: ["정결", "절제"], situationTags: ["정욕유혹", "중독습관"], emotionTags: ["죄책감"], summary: "정욕은 피하고 의와 사랑과 화평을 다시 좇으려는 결단에 적합하다.", specificity: 5, perspectiveKey: "정욕정결", avoidTags: [], tone: "결단", weight: 80 },
  { referenceKo: "베드로전서 1:13-16", bookAbbrEn: "1PE", chapter: 1, verseStart: 13, verseEnd: 16, themes: ["정결", "순종", "정체성"], situationTags: ["정욕유혹", "예배회복"], emotionTags: ["죄책감"], summary: "지난 욕심을 따르던 길에서 벗어나 거룩한 자녀의 자리로 다시 서려는 상황에 적합하다.", specificity: 4, perspectiveKey: "정욕정결", avoidTags: ["심한자기정죄"], tone: "결단", weight: 78 },
  { referenceKo: "베드로전서 2:11", bookAbbrEn: "1PE", chapter: 2, verseStart: 11, themes: ["정결", "절제"], situationTags: ["정욕유혹", "중독습관"], emotionTags: ["죄책감"], summary: "영혼을 거스르는 정욕을 멀리하고 다시 정결의 자리에 서려는 상황에 적합하다.", specificity: 4, perspectiveKey: "정욕정결", avoidTags: [], tone: "결단", weight: 76 },
  { referenceKo: "베드로후서 1:5-7", bookAbbrEn: "2PE", chapter: 1, verseStart: 5, verseEnd: 7, themes: ["절제", "성실"], situationTags: ["정욕유혹", "중독습관"], emotionTags: ["답답함"], summary: "절제와 인내, 사랑까지 한 단계씩 다시 더해가려는 결단에 적합하다.", specificity: 4, perspectiveKey: "절제훈련", avoidTags: [], tone: "결단", weight: 72 },
  { referenceKo: "갈라디아서 5:16-17", bookAbbrEn: "GAL", chapter: 5, verseStart: 16, verseEnd: 17, themes: ["성령", "정결", "절제"], situationTags: ["정욕유혹", "중독습관"], emotionTags: ["답답함"], summary: "정욕에 끌려가지 않고 성령을 따라 다시 걸으려는 결단에 적합하다.", specificity: 5, perspectiveKey: "정욕정결", avoidTags: [], tone: "결단", weight: 84 },
  { referenceKo: "갈라디아서 5:22-23", bookAbbrEn: "GAL", chapter: 5, verseStart: 22, verseEnd: 23, themes: ["성령", "절제", "사랑"], situationTags: ["분노폭발", "정욕유혹"], emotionTags: ["답답함"], summary: "내 노력으로 끌어내지 못한 절제를 성령의 열매로 다시 구하려는 상황에 적합하다.", specificity: 3, perspectiveKey: "절제훈련", avoidTags: [], tone: "결단", weight: 78 },
  { referenceKo: "로마서 13:13-14", bookAbbrEn: "ROM", chapter: 13, verseStart: 13, verseEnd: 14, themes: ["정결", "절제"], situationTags: ["정욕유혹", "중독습관"], emotionTags: ["죄책감"], summary: "옛 욕심을 위한 자리를 미리 끊고 그리스도로 옷 입으려는 결단에 적합하다.", specificity: 5, perspectiveKey: "정욕정결", avoidTags: [], tone: "결단", weight: 78 },
  { referenceKo: "잠언 4:23", bookAbbrEn: "PRO", chapter: 4, verseStart: 23, themes: ["정결", "지혜"], situationTags: ["정욕유혹", "영적무감각"], emotionTags: ["답답함"], summary: "흘러나올 말과 행동의 근원인 마음을 다시 지키려는 결단에 적합하다.", specificity: 4, perspectiveKey: "정욕정결", avoidTags: [], tone: "결단", weight: 78 },
  { referenceKo: "잠언 5:18-21", bookAbbrEn: "PRO", chapter: 5, verseStart: 18, verseEnd: 21, themes: ["정결", "신뢰"], situationTags: ["정욕유혹", "가정갈등"], emotionTags: ["죄책감"], summary: "내 자리를 지키며 가정의 사랑을 다시 회복하려는 결단에 적합하다.", specificity: 5, perspectiveKey: "정욕정결", avoidTags: ["심한자기정죄"], tone: "결단", weight: 70 },
  { referenceKo: "잠언 6:25-27", bookAbbrEn: "PRO", chapter: 6, verseStart: 25, verseEnd: 27, themes: ["정결", "지혜"], situationTags: ["정욕유혹"], emotionTags: ["죄책감"], summary: "마음으로 탐하던 자리에서 한 발 물러서려는 결단에 적합하다.", specificity: 5, perspectiveKey: "정욕정결", avoidTags: ["심한자기정죄"], tone: "결단", weight: 70 },
  { referenceKo: "욥기 31:1", bookAbbrEn: "JOB", chapter: 31, verseStart: 1, themes: ["정결", "순종"], situationTags: ["정욕유혹"], emotionTags: ["죄책감"], summary: "눈으로 짓는 죄까지 미리 끊겠다고 다시 약속하려는 결단에 적합하다.", specificity: 5, perspectiveKey: "정욕정결", avoidTags: [], tone: "결단", weight: 74 },
  { referenceKo: "야고보서 1:13-15", bookAbbrEn: "JAS", chapter: 1, verseStart: 13, verseEnd: 15, themes: ["회개", "정결"], situationTags: ["정욕유혹", "중독습관"], emotionTags: ["죄책감"], summary: "유혹의 흐름을 정직하게 인정하고 죄로 자라기 전에 멈추려는 상황에 적합하다.", specificity: 4, perspectiveKey: "정욕정결", avoidTags: ["심한자기정죄"], tone: "결단", weight: 78 },
  { referenceKo: "디도서 2:11-12", bookAbbrEn: "TIT", chapter: 2, verseStart: 11, verseEnd: 12, themes: ["정결", "절제", "겸손"], situationTags: ["정욕유혹", "탐심"], emotionTags: ["답답함"], summary: "은혜를 따라 정욕과 세상 욕심을 다시 내려놓으려는 결단에 적합하다.", specificity: 4, perspectiveKey: "정욕정결", avoidTags: [], tone: "결단", weight: 76 },

  // ─── 7. 교만 / 인정욕구 / 비교의식 (23) ───────────────────────────
  { referenceKo: "잠언 16:18", bookAbbrEn: "PRO", chapter: 16, verseStart: 18, themes: ["겸손", "지혜"], situationTags: ["인정욕구", "비교의식"], emotionTags: ["답답함"], summary: "높아지려던 마음을 멈추고 다시 낮은 자리로 내려서려는 상황에 적합하다.", specificity: 4, perspectiveKey: "교만겸손", avoidTags: ["심한자기정죄"], tone: "권면", weight: 78 },
  { referenceKo: "잠언 11:2", bookAbbrEn: "PRO", chapter: 11, verseStart: 2, themes: ["겸손", "지혜"], situationTags: ["인정욕구", "비교의식"], emotionTags: ["수치심"], summary: "교만이 부른 부끄러움 앞에서 다시 겸손한 지혜를 구하려는 상황에 적합하다.", specificity: 3, perspectiveKey: "교만겸손", avoidTags: ["심한자기정죄"], tone: "책망", weight: 64 },
  { referenceKo: "잠언 16:5", bookAbbrEn: "PRO", chapter: 16, verseStart: 5, themes: ["겸손", "회개"], situationTags: ["인정욕구", "비교의식"], emotionTags: ["답답함"], summary: "남보다 앞서려던 마음의 자리를 솔직히 돌아보려는 상황에 적합하다.", specificity: 3, perspectiveKey: "교만겸손", avoidTags: ["심한자기정죄"], tone: "책망", weight: 64 },
  { referenceKo: "잠언 22:4", bookAbbrEn: "PRO", chapter: 22, verseStart: 4, themes: ["겸손", "신뢰"], situationTags: ["인정욕구", "기도결단"], emotionTags: ["답답함"], summary: "성취보다 먼저 겸손과 경외함을 다시 붙들려는 결단에 적합하다.", specificity: 3, perspectiveKey: "교만겸손", avoidTags: [], tone: "권면", weight: 64 },
  { referenceKo: "잠언 27:2", bookAbbrEn: "PRO", chapter: 27, verseStart: 2, themes: ["겸손"], situationTags: ["인정욕구", "비교의식"], emotionTags: ["답답함"], summary: "스스로 자랑하려던 입을 멈추고 다른 사람의 평가에 마음을 비우려는 상황에 적합하다.", specificity: 3, perspectiveKey: "교만겸손", avoidTags: [], tone: "권면", weight: 60 },
  { referenceKo: "잠언 29:23", bookAbbrEn: "PRO", chapter: 29, verseStart: 23, themes: ["겸손", "지혜"], situationTags: ["인정욕구"], emotionTags: ["답답함"], summary: "오히려 낮아질 때 높여 주시는 길을 다시 신뢰하려는 상황에 적합하다.", specificity: 3, perspectiveKey: "교만겸손", avoidTags: [], tone: "권면", weight: 64 },
  { referenceKo: "시편 10:4", bookAbbrEn: "PSA", chapter: 10, verseStart: 4, themes: ["겸손", "회개"], situationTags: ["인정욕구", "영적무감각"], emotionTags: ["답답함"], summary: "주님을 찾지 않던 교만의 자리에서 정직하게 다시 돌이키려는 상황에 적합하다.", specificity: 4, perspectiveKey: "교만겸손", avoidTags: ["심한자기정죄"], tone: "책망", weight: 60 },
  { referenceKo: "미가 6:8", bookAbbrEn: "MIC", chapter: 6, verseStart: 8, themes: ["겸손", "사랑", "순종"], situationTags: ["인정욕구", "예배회복"], emotionTags: ["혼란"], summary: "복잡한 종교성 대신 정의와 인자와 겸손한 동행을 다시 붙들려는 상황에 적합하다.", specificity: 4, perspectiveKey: "교만겸손", avoidTags: [], tone: "권면", weight: 78 },
  { referenceKo: "마태복음 23:11-12", bookAbbrEn: "MAT", chapter: 23, verseStart: 11, verseEnd: 12, themes: ["겸손", "공동체"], situationTags: ["인정욕구", "리더십부담"], emotionTags: ["답답함"], summary: "더 큰 자리를 좇기보다 섬기는 자리로 다시 내려서려는 결단에 적합하다.", specificity: 4, perspectiveKey: "교만겸손", avoidTags: [], tone: "권면", weight: 70 },
  { referenceKo: "마태복음 6:1-4", bookAbbrEn: "MAT", chapter: 6, verseStart: 1, verseEnd: 4, themes: ["겸손", "예배"], situationTags: ["인정욕구", "하나님보다사람의식"], emotionTags: ["답답함"], summary: "사람의 시선을 좇는 의의 자리를 멈추고 아버지 앞으로 다시 돌이키려는 상황에 적합하다.", specificity: 5, perspectiveKey: "교만겸손", avoidTags: ["심한자기정죄"], tone: "권면", weight: 78 },
  { referenceKo: "마태복음 6:5-6", bookAbbrEn: "MAT", chapter: 6, verseStart: 5, verseEnd: 6, themes: ["기도", "겸손"], situationTags: ["인정욕구", "기도결단"], emotionTags: ["답답함"], summary: "보여주기 위한 기도가 아니라 골방의 자리로 다시 들어가려는 결단에 적합하다.", specificity: 5, perspectiveKey: "기도회복", avoidTags: [], tone: "권면", weight: 76 },
  { referenceKo: "누가복음 14:7-11", bookAbbrEn: "LUK", chapter: 14, verseStart: 7, verseEnd: 11, themes: ["겸손"], situationTags: ["인정욕구", "비교의식"], emotionTags: ["답답함"], summary: "높은 자리에 마음을 두던 것을 멈추고 다시 낮은 자리로 가려는 결단에 적합하다.", specificity: 4, perspectiveKey: "교만겸손", avoidTags: [], tone: "권면", weight: 70 },
  { referenceKo: "누가복음 18:9-14", bookAbbrEn: "LUK", chapter: 18, verseStart: 9, verseEnd: 14, themes: ["겸손", "회개"], situationTags: ["인정욕구", "자기정죄"], emotionTags: ["수치심", "죄책감"], summary: "남과 비교해 자랑하던 자리를 내려놓고 죄인의 자리에서 자비를 구하려는 상황에 적합하다.", specificity: 5, perspectiveKey: "교만겸손", avoidTags: ["심한자기정죄"], tone: "권면", weight: 78 },
  { referenceKo: "요한복음 12:42-43", bookAbbrEn: "JHN", chapter: 12, verseStart: 42, verseEnd: 43, themes: ["겸손", "정체성"], situationTags: ["하나님보다사람의식", "인정욕구"], emotionTags: ["두려움"], summary: "사람의 영광이 두려워 신앙을 감추던 자리에서 다시 주님 앞에 서려는 상황에 적합하다.", specificity: 5, perspectiveKey: "비교인정욕구", avoidTags: ["심한자기정죄"], tone: "권면", weight: 78 },
  { referenceKo: "갈라디아서 1:10", bookAbbrEn: "GAL", chapter: 1, verseStart: 10, themes: ["겸손", "정체성", "순종"], situationTags: ["하나님보다사람의식", "인정욕구"], emotionTags: ["답답함"], summary: "사람을 기쁘게 하려던 자리에서 주님을 기쁘시게 하려는 자리로 다시 돌이키려는 상황에 적합하다.", specificity: 5, perspectiveKey: "비교인정욕구", avoidTags: [], tone: "권면", weight: 80 },
  { referenceKo: "갈라디아서 6:3-4", bookAbbrEn: "GAL", chapter: 6, verseStart: 3, verseEnd: 4, themes: ["겸손"], situationTags: ["비교의식", "인정욕구"], emotionTags: ["답답함"], summary: "남과 비교해 자랑하기를 멈추고 자기 일을 정직히 살피려는 상황에 적합하다.", specificity: 5, perspectiveKey: "비교인정욕구", avoidTags: [], tone: "권면", weight: 78 },
  { referenceKo: "빌립보서 2:3-4", bookAbbrEn: "PHP", chapter: 2, verseStart: 3, verseEnd: 4, themes: ["겸손", "공동체", "사랑"], situationTags: ["인정욕구", "공동체회복"], emotionTags: ["답답함"], summary: "다툼과 허영을 내려놓고 다른 이를 더 낫게 여기려는 결단에 적합하다.", specificity: 5, perspectiveKey: "교만겸손", avoidTags: [], tone: "결단", weight: 84 },
  { referenceKo: "빌립보서 2:5-8", bookAbbrEn: "PHP", chapter: 2, verseStart: 5, verseEnd: 8, themes: ["겸손", "십자가", "순종"], situationTags: ["인정욕구", "예배회복"], emotionTags: ["답답함"], summary: "내 자리를 비우신 그리스도의 마음을 다시 품으려는 결단에 적합하다.", specificity: 4, perspectiveKey: "교만겸손", avoidTags: [], tone: "결단", weight: 80 },
  { referenceKo: "야고보서 4:6", bookAbbrEn: "JAS", chapter: 4, verseStart: 6, themes: ["겸손"], situationTags: ["인정욕구"], emotionTags: ["답답함"], summary: "교만의 자리에서 한 발 내려와 은혜를 다시 받으려는 상황에 적합하다.", specificity: 3, perspectiveKey: "교만겸손", avoidTags: [], tone: "권면", weight: 70 },
  { referenceKo: "야고보서 4:13-15", bookAbbrEn: "JAS", chapter: 4, verseStart: 13, verseEnd: 15, themes: ["하나님의뜻", "겸손", "신뢰"], situationTags: ["계획맡김", "회사어려움", "일의부담"], emotionTags: ["불안", "혼란", "답답함"], summary: "내 계획을 단정하지 않고 일과 미래를 주님의 뜻에 겸손히 맡기려는 상황에 적합하다.", specificity: 5, perspectiveKey: "계획맡김", avoidTags: [], tone: "지혜", weight: 90 },
  { referenceKo: "베드로전서 5:5-6", bookAbbrEn: "1PE", chapter: 5, verseStart: 5, verseEnd: 6, themes: ["겸손", "공동체"], situationTags: ["인정욕구", "공동체회복"], emotionTags: ["답답함"], summary: "교만의 자리를 내려놓고 때를 따라 높여 주실 주님을 다시 신뢰하려는 결단에 적합하다.", specificity: 4, perspectiveKey: "교만겸손", avoidTags: [], tone: "권면", weight: 78 },
  { referenceKo: "로마서 12:3", bookAbbrEn: "ROM", chapter: 12, verseStart: 3, themes: ["겸손", "지혜"], situationTags: ["인정욕구", "비교의식"], emotionTags: ["답답함"], summary: "나에 대한 과한 평가를 내려놓고 받은 분량 안에서 다시 정직히 서려는 상황에 적합하다.", specificity: 4, perspectiveKey: "교만겸손", avoidTags: [], tone: "권면", weight: 70 },
  { referenceKo: "로마서 12:16", bookAbbrEn: "ROM", chapter: 12, verseStart: 16, themes: ["겸손", "공동체"], situationTags: ["비교의식", "공동체회복"], emotionTags: ["답답함"], summary: "높은 자리만 좇던 마음을 멈추고 낮은 자리의 사람들과 다시 마음을 같이하려는 상황에 적합하다.", specificity: 4, perspectiveKey: "교만겸손", avoidTags: [], tone: "권면", weight: 68 },

  // ─── 8. 탐심 / 돈 / 소유 / 만족 (14) ──────────────────────────────
  { referenceKo: "마태복음 6:19-21", bookAbbrEn: "MAT", chapter: 6, verseStart: 19, verseEnd: 21, themes: ["청지기", "정체성"], situationTags: ["탐심", "돈염려"], emotionTags: ["불안"], summary: "땅의 보물에 매인 마음을 다시 하늘의 보물을 향해 돌이키려는 상황에 적합하다.", specificity: 4, perspectiveKey: "탐심만족", avoidTags: [], tone: "권면", weight: 84 },
  { referenceKo: "마태복음 6:24", bookAbbrEn: "MAT", chapter: 6, verseStart: 24, themes: ["청지기", "순종"], situationTags: ["탐심", "돈염려"], emotionTags: ["답답함"], summary: "재물과 주님을 동시에 섬기려던 두 마음을 정리하려는 결단에 적합하다.", specificity: 4, perspectiveKey: "탐심만족", avoidTags: [], tone: "권면", weight: 80 },
  { referenceKo: "누가복음 12:15", bookAbbrEn: "LUK", chapter: 12, verseStart: 15, themes: ["청지기", "절제"], situationTags: ["탐심"], emotionTags: ["불안"], summary: "삶의 의미를 소유에서 찾던 자리를 멈추고 탐심을 다시 물리치려는 결단에 적합하다.", specificity: 5, perspectiveKey: "탐심만족", avoidTags: [], tone: "권면", weight: 80 },
  { referenceKo: "누가복음 12:16-21", bookAbbrEn: "LUK", chapter: 12, verseStart: 16, verseEnd: 21, themes: ["청지기", "지혜"], situationTags: ["탐심", "돈염려"], emotionTags: ["불안"], summary: "쌓아두기에만 마음을 두던 자리에서 하나님께 부요하려는 결단에 적합하다.", specificity: 5, perspectiveKey: "탐심만족", avoidTags: [], tone: "책망", weight: 76 },
  { referenceKo: "디모데전서 6:6-8", bookAbbrEn: "1TI", chapter: 6, verseStart: 6, verseEnd: 8, themes: ["청지기", "감사", "절제"], situationTags: ["탐심", "감사회복"], emotionTags: ["불안", "답답함"], summary: "있는 것에 자족하는 자리로 다시 돌이키려는 결단에 적합하다.", specificity: 5, perspectiveKey: "탐심만족", avoidTags: [], tone: "권면", weight: 84 },
  { referenceKo: "디모데전서 6:9-10", bookAbbrEn: "1TI", chapter: 6, verseStart: 9, verseEnd: 10, themes: ["청지기", "회개"], situationTags: ["탐심", "돈염려"], emotionTags: ["죄책감", "답답함"], summary: "돈을 사랑하던 자리에서 다시 빠져나오려는 결단에 적합하다.", specificity: 5, perspectiveKey: "탐심만족", avoidTags: ["심한자기정죄"], tone: "책망", weight: 80 },
  { referenceKo: "디모데전서 6:17-19", bookAbbrEn: "1TI", chapter: 6, verseStart: 17, verseEnd: 19, themes: ["청지기", "겸손", "사랑"], situationTags: ["탐심", "돈염려"], emotionTags: ["불안"], summary: "재물에 마음을 두지 않고 선한 일에 다시 부요해지려는 결단에 적합하다.", specificity: 4, perspectiveKey: "청지기재정", avoidTags: [], tone: "권면", weight: 76 },
  { referenceKo: "히브리서 13:5", bookAbbrEn: "HEB", chapter: 13, verseStart: 5, themes: ["청지기", "신뢰", "절제"], situationTags: ["탐심", "돈염려"], emotionTags: ["불안"], summary: "돈을 사랑하던 마음을 멈추고 떠나지 않으시는 분만 의지하려는 상황에 적합하다.", specificity: 5, perspectiveKey: "탐심만족", avoidTags: [], tone: "권면", weight: 84 },
  { referenceKo: "빌립보서 4:11-13", bookAbbrEn: "PHP", chapter: 4, verseStart: 11, verseEnd: 13, themes: ["청지기", "감사", "신뢰"], situationTags: ["탐심", "돈염려"], emotionTags: ["불안", "낙심"], summary: "어떤 형편에서도 자족하기를 다시 배우려는 결단에 적합하다.", specificity: 4, perspectiveKey: "탐심만족", avoidTags: [], tone: "권면", weight: 86 },
  { referenceKo: "잠언 11:24-25", bookAbbrEn: "PRO", chapter: 11, verseStart: 24, verseEnd: 25, themes: ["청지기", "사랑"], situationTags: ["탐심", "섬김회피"], emotionTags: ["답답함"], summary: "움켜쥐기보다 흩어 나누는 자리로 다시 마음을 돌리려는 결단에 적합하다.", specificity: 4, perspectiveKey: "청지기재정", avoidTags: [], tone: "권면", weight: 70 },
  { referenceKo: "잠언 23:4-5", bookAbbrEn: "PRO", chapter: 23, verseStart: 4, verseEnd: 5, themes: ["청지기", "지혜"], situationTags: ["탐심", "돈염려"], emotionTags: ["불안"], summary: "부에 매여 애쓰던 자리를 멈추고 잠시 머무는 재물의 본질을 다시 보려는 상황에 적합하다.", specificity: 4, perspectiveKey: "탐심만족", avoidTags: [], tone: "권면", weight: 72 },
  { referenceKo: "잠언 30:7-9", bookAbbrEn: "PRO", chapter: 30, verseStart: 7, verseEnd: 9, themes: ["청지기", "겸손", "신뢰"], situationTags: ["탐심", "돈염려"], emotionTags: ["불안"], summary: "지나친 가난도 부도 구하지 않고 일용할 양식을 다시 구하려는 상황에 적합하다.", specificity: 5, perspectiveKey: "탐심만족", avoidTags: [], tone: "권면", weight: 76 },
  { referenceKo: "전도서 5:10", bookAbbrEn: "ECC", chapter: 5, verseStart: 10, themes: ["청지기", "지혜"], situationTags: ["탐심"], emotionTags: ["공허함", "답답함"], summary: "더 가져도 채워지지 않던 갈증을 정직히 인정하려는 상황에 적합하다.", specificity: 4, perspectiveKey: "탐심만족", avoidTags: [], tone: "권면", weight: 68 },
  { referenceKo: "말라기 3:8-10", bookAbbrEn: "MAL", chapter: 3, verseStart: 8, verseEnd: 10, themes: ["청지기", "예배", "신뢰"], situationTags: ["탐심", "예배회복"], emotionTags: ["답답함"], summary: "주님 것을 다시 주님께 드리는 청지기의 자리로 돌이키려는 결단에 적합하다.", specificity: 4, perspectiveKey: "청지기재정", avoidTags: ["심한자기정죄"], tone: "권면", weight: 68 },

  // ─── 9. 기도 / 말씀 / 예배 회복 (28) ──────────────────────────────
  { referenceKo: "시편 1:1-3", bookAbbrEn: "PSA", chapter: 1, verseStart: 1, verseEnd: 3, themes: ["말씀", "성실"], situationTags: ["말씀회복", "영적무감각"], emotionTags: ["공허함"], summary: "말씀을 묵상하는 자리로 일상을 다시 옮기려는 결단에 적합하다.", specificity: 3, perspectiveKey: "말씀회복", avoidTags: [], tone: "권면", weight: 76 },
  { referenceKo: "시편 19:7-11", bookAbbrEn: "PSA", chapter: 19, verseStart: 7, verseEnd: 11, themes: ["말씀", "지혜"], situationTags: ["말씀회복"], emotionTags: ["공허함"], summary: "흐릿해진 마음을 회복시키는 말씀의 자리로 다시 돌아가려는 상황에 적합하다.", specificity: 3, perspectiveKey: "말씀회복", avoidTags: [], tone: "권면", weight: 70 },
  { referenceKo: "시편 119:18", bookAbbrEn: "PSA", chapter: 119, verseStart: 18, themes: ["말씀", "기도"], situationTags: ["말씀회복", "기도결단"], emotionTags: ["공허함"], summary: "말씀의 놀라움을 다시 보게 해 달라고 정직히 구하려는 상황에 적합하다.", specificity: 4, perspectiveKey: "말씀회복", avoidTags: [], tone: "권면", weight: 70 },
  { referenceKo: "시편 119:105", bookAbbrEn: "PSA", chapter: 119, verseStart: 105, themes: ["말씀", "지혜"], situationTags: ["말씀회복", "계획맡김"], emotionTags: ["혼란"], summary: "어둑한 길에서 말씀을 다시 등불 삼아 발걸음을 내딛으려는 상황에 적합하다.", specificity: 3, perspectiveKey: "말씀회복", avoidTags: [], tone: "권면", weight: 78 },
  { referenceKo: "시편 119:130", bookAbbrEn: "PSA", chapter: 119, verseStart: 130, themes: ["말씀", "지혜"], situationTags: ["말씀회복", "혼란"], emotionTags: ["혼란"], summary: "혼란한 마음에 말씀의 빛을 다시 들이려는 상황에 적합하다.", specificity: 3, perspectiveKey: "말씀회복", avoidTags: [], tone: "권면", weight: 64 },
  { referenceKo: "시편 42:1-2", bookAbbrEn: "PSA", chapter: 42, verseStart: 1, verseEnd: 2, themes: ["기도", "예배"], situationTags: ["예배회복", "기도결단"], emotionTags: ["공허함"], summary: "메말라 있던 영혼이 주님을 다시 갈망하는 자리로 나아가려는 상황에 적합하다.", specificity: 4, perspectiveKey: "예배회복", avoidTags: [], tone: "권면", weight: 80 },
  { referenceKo: "시편 63:1-3", bookAbbrEn: "PSA", chapter: 63, verseStart: 1, verseEnd: 3, themes: ["기도", "예배"], situationTags: ["예배회복", "기도결단"], emotionTags: ["공허함"], summary: "주님을 간절히 사모하는 마음을 다시 회복하려는 결단에 적합하다.", specificity: 4, perspectiveKey: "예배회복", avoidTags: [], tone: "권면", weight: 78 },
  { referenceKo: "시편 84:1-2", bookAbbrEn: "PSA", chapter: 84, verseStart: 1, verseEnd: 2, themes: ["예배"], situationTags: ["예배회복"], emotionTags: ["공허함"], summary: "주님의 장막을 다시 사모하는 마음으로 예배의 자리에 서려는 상황에 적합하다.", specificity: 4, perspectiveKey: "예배회복", avoidTags: [], tone: "권면", weight: 70 },
  { referenceKo: "시편 100:1-2", bookAbbrEn: "PSA", chapter: 100, verseStart: 1, verseEnd: 2, themes: ["예배", "기쁨"], situationTags: ["예배회복", "감사회복"], emotionTags: ["감사"], summary: "흩어졌던 마음을 모아 다시 즐거운 찬송으로 주님 앞에 서려는 상황에 적합하다.", specificity: 3, perspectiveKey: "예배회복", avoidTags: [], tone: "권면", weight: 64 },
  { referenceKo: "시편 95:6-7", bookAbbrEn: "PSA", chapter: 95, verseStart: 6, verseEnd: 7, themes: ["예배", "겸손"], situationTags: ["예배회복", "공동체회복"], emotionTags: ["공허함"], summary: "굽혀 경배하는 자리로 일상을 다시 가져오려는 결단에 적합하다.", specificity: 3, perspectiveKey: "예배회복", avoidTags: [], tone: "권면", weight: 64 },
  { referenceKo: "시편 27:4", bookAbbrEn: "PSA", chapter: 27, verseStart: 4, themes: ["예배", "기도"], situationTags: ["예배회복", "기도결단"], emotionTags: ["공허함"], summary: "여러 일에 흩어진 마음을 한 가지 일로 다시 모으려는 결단에 적합하다.", specificity: 4, perspectiveKey: "예배회복", avoidTags: [], tone: "권면", weight: 76 },
  { referenceKo: "시편 5:3", bookAbbrEn: "PSA", chapter: 5, verseStart: 3, themes: ["기도", "성실"], situationTags: ["기도결단", "생활질서무너짐"], emotionTags: ["답답함"], summary: "아침의 한 자리를 다시 주님께 드리려는 결단에 적합하다.", specificity: 4, perspectiveKey: "기도회복", avoidTags: [], tone: "권면", weight: 70 },
  { referenceKo: "누가복음 11:9-10", bookAbbrEn: "LUK", chapter: 11, verseStart: 9, verseEnd: 10, themes: ["기도", "신뢰"], situationTags: ["기도결단"], emotionTags: ["답답함"], summary: "막막함 속에서 다시 구하고 찾고 두드리려는 결단에 적합하다.", specificity: 3, perspectiveKey: "기도회복", avoidTags: [], tone: "권면", weight: 72 },
  { referenceKo: "마태복음 6:9-13", bookAbbrEn: "MAT", chapter: 6, verseStart: 9, verseEnd: 13, themes: ["기도", "예배"], situationTags: ["기도결단", "예배회복"], emotionTags: ["혼란"], summary: "주기도의 자리에서 흩어진 마음을 다시 정렬하려는 결단에 적합하다.", specificity: 3, perspectiveKey: "기도회복", avoidTags: [], tone: "권면", weight: 78 },
  { referenceKo: "마가복음 1:35", bookAbbrEn: "MRK", chapter: 1, verseStart: 35, themes: ["기도", "성실"], situationTags: ["기도결단", "생활질서무너짐"], emotionTags: ["답답함"], summary: "분주함보다 먼저 기도의 자리를 다시 회복하려는 결단에 적합하다.", specificity: 4, perspectiveKey: "기도회복", avoidTags: [], tone: "권면", weight: 76 },
  { referenceKo: "누가복음 18:1", bookAbbrEn: "LUK", chapter: 18, verseStart: 1, themes: ["기도", "성실"], situationTags: ["기도결단", "낙심"], emotionTags: ["낙심", "답답함"], summary: "낙심에 멈춰 있기보다 다시 끈기 있게 기도하려는 결단에 적합하다.", specificity: 4, perspectiveKey: "기도회복", avoidTags: [], tone: "권면", weight: 76 },
  { referenceKo: "누가복음 21:36", bookAbbrEn: "LUK", chapter: 21, verseStart: 36, themes: ["기도", "절제"], situationTags: ["기도결단", "영적무감각"], emotionTags: ["답답함"], summary: "느슨해진 영적 자리를 다시 깨어 기도하려는 결단에 적합하다.", specificity: 3, perspectiveKey: "기도회복", avoidTags: [], tone: "권면", weight: 64 },
  { referenceKo: "데살로니가전서 5:16-18", bookAbbrEn: "1TH", chapter: 5, verseStart: 16, verseEnd: 18, themes: ["기도", "감사", "기쁨"], situationTags: ["기도결단", "감사회복"], emotionTags: ["답답함"], summary: "흩어진 일상의 결을 기쁨과 기도와 감사로 다시 묶으려는 결단에 적합하다.", specificity: 3, perspectiveKey: "기도회복", avoidTags: [], tone: "감사", weight: 80 },
  { referenceKo: "야고보서 5:13-16", bookAbbrEn: "JAS", chapter: 5, verseStart: 13, verseEnd: 16, themes: ["기도", "공동체"], situationTags: ["기도결단", "공동체회복"], emotionTags: ["답답함"], summary: "혼자 짊어지지 않고 서로를 위해 기도하는 자리로 다시 돌아가려는 상황에 적합하다.", specificity: 4, perspectiveKey: "기도회복", avoidTags: [], tone: "권면", weight: 74 },
  { referenceKo: "골로새서 4:2", bookAbbrEn: "COL", chapter: 4, verseStart: 2, themes: ["기도", "감사"], situationTags: ["기도결단", "감사회복"], emotionTags: ["답답함"], summary: "기도를 계속하며 감사함으로 깨어 있으려는 결단에 적합하다.", specificity: 3, perspectiveKey: "기도회복", avoidTags: [], tone: "권면", weight: 68 },
  { referenceKo: "에베소서 6:18", bookAbbrEn: "EPH", chapter: 6, verseStart: 18, themes: ["기도", "성령"], situationTags: ["기도결단", "공동체회복"], emotionTags: ["답답함"], summary: "성령 안에서 다시 깨어 형제를 위해 기도하려는 결단에 적합하다.", specificity: 3, perspectiveKey: "기도회복", avoidTags: [], tone: "권면", weight: 70 },
  { referenceKo: "히브리서 4:12", bookAbbrEn: "HEB", chapter: 4, verseStart: 12, themes: ["말씀"], situationTags: ["말씀회복", "영적무감각"], emotionTags: ["답답함"], summary: "마음 깊은 자리까지 비추는 말씀 앞에 다시 정직히 서려는 상황에 적합하다.", specificity: 3, perspectiveKey: "말씀회복", avoidTags: [], tone: "권면", weight: 72 },
  { referenceKo: "디모데후서 3:16-17", bookAbbrEn: "2TI", chapter: 3, verseStart: 16, verseEnd: 17, themes: ["말씀", "성실"], situationTags: ["말씀회복", "예배회복"], emotionTags: ["답답함"], summary: "말씀으로 다시 점검받고 정렬되려는 결단에 적합하다.", specificity: 3, perspectiveKey: "말씀회복", avoidTags: [], tone: "권면", weight: 70 },
  { referenceKo: "신명기 6:6-9", bookAbbrEn: "DEU", chapter: 6, verseStart: 6, verseEnd: 9, themes: ["말씀", "공동체"], situationTags: ["말씀회복", "가정갈등"], emotionTags: ["답답함"], summary: "말씀을 마음과 가정 일상에 다시 새기려는 결단에 적합하다.", specificity: 4, perspectiveKey: "말씀회복", avoidTags: [], tone: "권면", weight: 70 },
  { referenceKo: "여호수아 1:8", bookAbbrEn: "JOS", chapter: 1, verseStart: 8, themes: ["말씀", "순종"], situationTags: ["말씀회복", "예배회복"], emotionTags: ["답답함"], summary: "말씀을 입에서 떠나지 않게 하며 다시 묵상의 자리로 돌아가려는 결단에 적합하다.", specificity: 4, perspectiveKey: "말씀회복", avoidTags: [], tone: "권면", weight: 70 },
  { referenceKo: "요한복음 15:7", bookAbbrEn: "JHN", chapter: 15, verseStart: 7, themes: ["말씀", "기도"], situationTags: ["말씀회복", "기도결단"], emotionTags: ["답답함"], summary: "주님 안에 거하며 말씀이 내 안에 거하는 자리로 다시 들어가려는 결단에 적합하다.", specificity: 4, perspectiveKey: "말씀회복", avoidTags: [], tone: "권면", weight: 76 },
  { referenceKo: "요한복음 4:23-24", bookAbbrEn: "JHN", chapter: 4, verseStart: 23, verseEnd: 24, themes: ["예배"], situationTags: ["예배회복"], emotionTags: ["공허함"], summary: "형식이 아니라 영과 진리로 드리는 예배의 자리로 다시 돌이키려는 상황에 적합하다.", specificity: 3, perspectiveKey: "예배회복", avoidTags: [], tone: "권면", weight: 76 },
  { referenceKo: "로마서 12:11-12", bookAbbrEn: "ROM", chapter: 12, verseStart: 11, verseEnd: 12, themes: ["기도", "성실", "소망"], situationTags: ["기도결단", "예배회복"], emotionTags: ["답답함", "낙심"], summary: "느슨해진 열심을 다시 모아 환난 중에도 기도에 항상 힘쓰려는 결단에 적합하다.", specificity: 4, perspectiveKey: "기도회복", avoidTags: [], tone: "권면", weight: 72 },

  // ─── 10. 공동체 / 사랑 / 섬김 (19) ────────────────────────────────
  { referenceKo: "요한복음 13:34-35", bookAbbrEn: "JHN", chapter: 13, verseStart: 34, verseEnd: 35, themes: ["사랑", "공동체"], situationTags: ["관계갈등", "공동체회복"], emotionTags: ["답답함"], summary: "관계의 균열 한가운데서 서로 사랑하라는 새 계명을 다시 붙들려는 상황에 적합하다.", specificity: 3, perspectiveKey: "공동체사랑", avoidTags: [], tone: "권면", weight: 76 },
  { referenceKo: "요한복음 15:12-13", bookAbbrEn: "JHN", chapter: 15, verseStart: 12, verseEnd: 13, themes: ["사랑", "공동체", "십자가"], situationTags: ["공동체회복", "섬김회피"], emotionTags: ["답답함"], summary: "내 자리를 넘어 친구를 위해 다시 사랑하려는 결단에 적합하다.", specificity: 4, perspectiveKey: "공동체사랑", avoidTags: [], tone: "권면", weight: 74 },
  { referenceKo: "요한복음 13:14-15", bookAbbrEn: "JHN", chapter: 13, verseStart: 14, verseEnd: 15, themes: ["겸손", "공동체"], situationTags: ["섬김회피", "공동체회복"], emotionTags: ["답답함"], summary: "내가 먼저 낮은 자리에서 발 씻기는 섬김으로 돌아가려는 결단에 적합하다.", specificity: 4, perspectiveKey: "섬김회복", avoidTags: [], tone: "권면", weight: 74 },
  { referenceKo: "갈라디아서 5:13-14", bookAbbrEn: "GAL", chapter: 5, verseStart: 13, verseEnd: 14, themes: ["사랑", "공동체"], situationTags: ["섬김회피", "공동체회복"], emotionTags: ["답답함"], summary: "자유를 자기를 위해 쓰지 않고 사랑으로 종 노릇 하려는 결단에 적합하다.", specificity: 4, perspectiveKey: "공동체사랑", avoidTags: [], tone: "권면", weight: 72 },
  { referenceKo: "갈라디아서 6:1-2", bookAbbrEn: "GAL", chapter: 6, verseStart: 1, verseEnd: 2, themes: ["공동체", "사랑", "겸손"], situationTags: ["공동체회복", "관계갈등"], emotionTags: ["답답함"], summary: "넘어진 지체를 정죄 없이 회복시키며 짐을 함께 지려는 결단에 적합하다.", specificity: 4, perspectiveKey: "공동체사랑", avoidTags: ["관계폭력"], tone: "권면", weight: 76 },
  { referenceKo: "갈라디아서 6:9-10", bookAbbrEn: "GAL", chapter: 6, verseStart: 9, verseEnd: 10, themes: ["사랑", "성실"], situationTags: ["섬김회피", "공동체회복"], emotionTags: ["낙심", "무기력"], summary: "지친 마음에도 선을 행하기를 멈추지 않으려는 결단에 적합하다.", specificity: 3, perspectiveKey: "섬김회복", avoidTags: [], tone: "권면", weight: 76 },
  { referenceKo: "로마서 12:9-13", bookAbbrEn: "ROM", chapter: 12, verseStart: 9, verseEnd: 13, themes: ["사랑", "공동체", "성실"], situationTags: ["공동체회복", "섬김회피"], emotionTags: ["답답함"], summary: "거짓 없는 사랑으로 서로를 다시 존중하고 환대하려는 결단에 적합하다.", specificity: 3, perspectiveKey: "공동체사랑", avoidTags: [], tone: "권면", weight: 70 },
  { referenceKo: "로마서 15:1-2", bookAbbrEn: "ROM", chapter: 15, verseStart: 1, verseEnd: 2, themes: ["사랑", "공동체"], situationTags: ["공동체회복", "섬김회피"], emotionTags: ["답답함"], summary: "내 만족이 아니라 약한 자의 유익을 위해 다시 자리를 내어주려는 결단에 적합하다.", specificity: 4, perspectiveKey: "공동체사랑", avoidTags: [], tone: "권면", weight: 70 },
  { referenceKo: "빌립보서 2:1-4", bookAbbrEn: "PHP", chapter: 2, verseStart: 1, verseEnd: 4, themes: ["겸손", "공동체", "사랑"], situationTags: ["공동체회복", "관계갈등"], emotionTags: ["답답함"], summary: "허영을 내려놓고 마음을 같이하여 다시 한 몸의 자리로 들어가려는 결단에 적합하다.", specificity: 4, perspectiveKey: "공동체사랑", avoidTags: [], tone: "권면", weight: 76 },
  { referenceKo: "에베소서 4:1-3", bookAbbrEn: "EPH", chapter: 4, verseStart: 1, verseEnd: 3, themes: ["겸손", "공동체", "사랑"], situationTags: ["공동체회복", "관계갈등"], emotionTags: ["답답함"], summary: "겸손과 오래 참음으로 공동체의 평안을 다시 지키려는 결단에 적합하다.", specificity: 4, perspectiveKey: "공동체사랑", avoidTags: [], tone: "권면", weight: 74 },
  { referenceKo: "골로새서 3:12-14", bookAbbrEn: "COL", chapter: 3, verseStart: 12, verseEnd: 14, themes: ["사랑", "겸손", "공동체"], situationTags: ["공동체회복", "관계갈등"], emotionTags: ["답답함"], summary: "긍휼과 자비와 사랑의 옷을 다시 입고 공동체의 자리로 돌아가려는 결단에 적합하다.", specificity: 4, perspectiveKey: "공동체사랑", avoidTags: [], tone: "권면", weight: 80 },
  { referenceKo: "베드로전서 4:8-10", bookAbbrEn: "1PE", chapter: 4, verseStart: 8, verseEnd: 10, themes: ["사랑", "공동체"], situationTags: ["섬김회피", "공동체회복"], emotionTags: ["답답함"], summary: "받은 은사로 서로를 섬기며 공동체를 다시 세우려는 결단에 적합하다.", specificity: 4, perspectiveKey: "섬김회복", avoidTags: [], tone: "권면", weight: 72 },
  { referenceKo: "히브리서 10:24-25", bookAbbrEn: "HEB", chapter: 10, verseStart: 24, verseEnd: 25, themes: ["공동체", "사랑"], situationTags: ["공동체회복", "예배회복"], emotionTags: ["답답함", "외로움"], summary: "모이기를 미루던 자리에서 다시 형제를 격려하는 자리로 돌이키려는 결단에 적합하다.", specificity: 4, perspectiveKey: "공동체사랑", avoidTags: [], tone: "권면", weight: 76 },
  { referenceKo: "마태복음 25:35-40", bookAbbrEn: "MAT", chapter: 25, verseStart: 35, verseEnd: 40, themes: ["사랑", "공동체"], situationTags: ["섬김회피", "공동체회복"], emotionTags: ["답답함"], summary: "지극히 작은 자에게 한 섬김을 다시 가볍게 여기지 않으려는 결단에 적합하다.", specificity: 4, perspectiveKey: "섬김회복", avoidTags: [], tone: "권면", weight: 78 },
  { referenceKo: "누가복음 10:30-37", bookAbbrEn: "LUK", chapter: 10, verseStart: 30, verseEnd: 37, themes: ["사랑", "공동체"], situationTags: ["섬김회피", "관계갈등"], emotionTags: ["답답함"], summary: "지나치던 자리에서 멈춰 서서 이웃이 되어 주려는 결단에 적합하다.", specificity: 4, perspectiveKey: "공동체사랑", avoidTags: [], tone: "권면", weight: 76 },
  { referenceKo: "사도행전 2:42-47", bookAbbrEn: "ACT", chapter: 2, verseStart: 42, verseEnd: 47, themes: ["공동체", "예배", "말씀"], situationTags: ["공동체회복", "예배회복"], emotionTags: ["감사"], summary: "말씀과 교제, 떡을 떼는 자리로 다시 공동체를 회복하려는 결단에 적합하다.", specificity: 3, perspectiveKey: "공동체사랑", avoidTags: [], tone: "권면", weight: 64 },
  { referenceKo: "고린도전서 13:4-7", bookAbbrEn: "1CO", chapter: 13, verseStart: 4, verseEnd: 7, themes: ["사랑"], situationTags: ["관계갈등", "공동체회복"], emotionTags: ["답답함", "상처"], summary: "오래 참고 온유한 사랑으로 다시 관계를 입으려는 결단에 적합하다.", specificity: 3, perspectiveKey: "공동체사랑", avoidTags: [], tone: "권면", weight: 78 },
  { referenceKo: "야고보서 2:14-17", bookAbbrEn: "JAS", chapter: 2, verseStart: 14, verseEnd: 17, themes: ["사랑", "성실"], situationTags: ["섬김회피", "책임회피"], emotionTags: ["답답함"], summary: "말로만 그치던 사랑을 행함으로 다시 옮기려는 결단에 적합하다.", specificity: 4, perspectiveKey: "섬김회복", avoidTags: [], tone: "권면", weight: 70 },
  { referenceKo: "요한일서 4:7-12", bookAbbrEn: "1JN", chapter: 4, verseStart: 7, verseEnd: 12, themes: ["사랑", "공동체"], situationTags: ["관계갈등", "공동체회복"], emotionTags: ["상처"], summary: "먼저 받은 사랑에 힘입어 다시 형제를 사랑하려는 결단에 적합하다.", specificity: 3, perspectiveKey: "공동체사랑", avoidTags: [], tone: "권면", weight: 72 },

  // ─── 11. 낙심 / 무기력 / 소망 (20) ────────────────────────────────
  { referenceKo: "시편 42:5", bookAbbrEn: "PSA", chapter: 42, verseStart: 5, themes: ["소망", "신뢰"], situationTags: ["기도결단"], emotionTags: ["낙심", "무기력"], summary: "낙심한 영혼에게 다시 주님을 바라라고 자기 마음을 권면하려는 상황에 적합하다.", specificity: 4, perspectiveKey: "낙심소망", avoidTags: [], tone: "소망", weight: 78 },
  { referenceKo: "시편 42:11", bookAbbrEn: "PSA", chapter: 42, verseStart: 11, themes: ["소망", "신뢰"], situationTags: ["기도결단"], emotionTags: ["낙심", "공허함"], summary: "다시 흔들리는 마음을 향해 하나님을 바라라고 권면하려는 상황에 적합하다.", specificity: 4, perspectiveKey: "낙심소망", avoidTags: [], tone: "소망", weight: 72 },
  { referenceKo: "시편 73:25-26", bookAbbrEn: "PSA", chapter: 73, verseStart: 25, verseEnd: 26, themes: ["신뢰", "소망"], situationTags: ["기도결단"], emotionTags: ["낙심", "무기력"], summary: "내 힘이 다한 자리에서 마음의 반석 되시는 주님만을 다시 붙들려는 상황에 적합하다.", specificity: 4, perspectiveKey: "낙심소망", avoidTags: [], tone: "소망", weight: 78 },
  { referenceKo: "시편 30:5", bookAbbrEn: "PSA", chapter: 30, verseStart: 5, themes: ["소망", "평안"], situationTags: ["기도결단"], emotionTags: ["낙심", "상처"], summary: "긴 울음의 자리에 머물지 않고 새 아침의 기쁨을 다시 기다리려는 상황에 적합하다.", specificity: 3, perspectiveKey: "낙심소망", avoidTags: ["애도"], tone: "위로", weight: 72 },
  { referenceKo: "시편 126:5-6", bookAbbrEn: "PSA", chapter: 126, verseStart: 5, verseEnd: 6, themes: ["소망", "성실"], situationTags: ["미루는습관", "낙심"], emotionTags: ["낙심", "무기력"], summary: "지친 눈물 가운데서도 다시 작은 씨를 뿌리려는 결단에 적합하다.", specificity: 4, perspectiveKey: "낙심소망", avoidTags: ["심한자기정죄"], tone: "소망", weight: 70 },
  { referenceKo: "이사야 40:28-31", bookAbbrEn: "ISA", chapter: 40, verseStart: 28, verseEnd: 31, themes: ["소망", "신뢰", "담대함"], situationTags: ["기도결단", "회사어려움"], emotionTags: ["무기력", "낙심"], summary: "지치고 곤비한 자리에서 새 힘 주시는 주님을 다시 앙망하려는 상황에 적합하다.", specificity: 4, perspectiveKey: "무기력회복", avoidTags: [], tone: "소망", weight: 84 },
  { referenceKo: "이사야 43:18-19", bookAbbrEn: "ISA", chapter: 43, verseStart: 18, verseEnd: 19, themes: ["소망", "새사람"], situationTags: ["기도결단", "낙심"], emotionTags: ["낙심", "공허함"], summary: "지난 실패에 매여 있던 마음을 일으켜 새 일을 다시 기대하려는 결단에 적합하다.", specificity: 3, perspectiveKey: "낙심소망", avoidTags: [], tone: "회복", weight: 72 },
  { referenceKo: "예레미야애가 3:21-23", bookAbbrEn: "LAM", chapter: 3, verseStart: 21, verseEnd: 23, themes: ["소망", "신뢰"], situationTags: ["기도결단"], emotionTags: ["낙심"], summary: "아침마다 새로운 긍휼을 다시 마음에 새기려는 상황에 적합하다.", specificity: 3, perspectiveKey: "낙심소망", avoidTags: [], tone: "위로", weight: 76 },
  { referenceKo: "예레미야애가 3:25-26", bookAbbrEn: "LAM", chapter: 3, verseStart: 25, verseEnd: 26, themes: ["소망", "신뢰"], situationTags: ["기도결단", "계획맡김"], emotionTags: ["낙심", "답답함"], summary: "조급함을 내려놓고 잠잠히 주님을 기다리려는 결단에 적합하다.", specificity: 4, perspectiveKey: "낙심소망", avoidTags: [], tone: "소망", weight: 70 },
  { referenceKo: "로마서 5:3-5", bookAbbrEn: "ROM", chapter: 5, verseStart: 3, verseEnd: 5, themes: ["소망", "신뢰"], situationTags: ["회사어려움", "기도결단"], emotionTags: ["낙심", "답답함"], summary: "환난을 인내와 소망으로 다시 해석하려는 결단에 적합하다.", specificity: 3, perspectiveKey: "낙심소망", avoidTags: [], tone: "소망", weight: 72 },
  { referenceKo: "로마서 8:18", bookAbbrEn: "ROM", chapter: 8, verseStart: 18, themes: ["소망"], situationTags: ["회사어려움", "낙심"], emotionTags: ["낙심", "무기력"], summary: "지금의 고난을 장차 누릴 영광에 비추어 다시 견디려는 상황에 적합하다.", specificity: 3, perspectiveKey: "낙심소망", avoidTags: ["애도"], tone: "소망", weight: 70 },
  { referenceKo: "로마서 8:28", bookAbbrEn: "ROM", chapter: 8, verseStart: 28, themes: ["신뢰", "하나님의뜻"], situationTags: ["회사어려움", "계획맡김"], emotionTags: ["낙심", "혼란"], summary: "이해되지 않는 상황 속에서도 합력하여 선을 이루심을 다시 신뢰하려는 상황에 적합하다.", specificity: 2, perspectiveKey: "낙심소망", avoidTags: ["애도", "심한자기정죄"], tone: "소망", weight: 80 },
  { referenceKo: "로마서 15:13", bookAbbrEn: "ROM", chapter: 15, verseStart: 13, themes: ["소망", "평안", "성령"], situationTags: ["기도결단"], emotionTags: ["낙심", "공허함"], summary: "기쁨과 평강 가운데 소망이 다시 충만해지기를 구하려는 상황에 적합하다.", specificity: 3, perspectiveKey: "낙심소망", avoidTags: [], tone: "소망", weight: 72 },
  { referenceKo: "고린도후서 4:16-18", bookAbbrEn: "2CO", chapter: 4, verseStart: 16, verseEnd: 18, themes: ["소망", "신뢰"], situationTags: ["회사어려움", "낙심"], emotionTags: ["낙심", "무기력"], summary: "겉사람은 낡아져도 속사람이 새로워지는 자리를 다시 붙들려는 상황에 적합하다.", specificity: 4, perspectiveKey: "낙심소망", avoidTags: [], tone: "소망", weight: 78 },
  { referenceKo: "베드로전서 5:10", bookAbbrEn: "1PE", chapter: 5, verseStart: 10, themes: ["소망", "신뢰"], situationTags: ["회사어려움", "낙심"], emotionTags: ["낙심", "무기력"], summary: "잠시의 고난 후에 친히 회복시키시는 주님을 다시 신뢰하려는 상황에 적합하다.", specificity: 4, perspectiveKey: "낙심소망", avoidTags: ["애도"], tone: "소망", weight: 76 },
  { referenceKo: "베드로전서 1:6-7", bookAbbrEn: "1PE", chapter: 1, verseStart: 6, verseEnd: 7, themes: ["소망", "신뢰"], situationTags: ["회사어려움", "기도결단"], emotionTags: ["낙심", "답답함"], summary: "여러 시험 가운데서도 다시 잠깐임을 기억하며 견디려는 결단에 적합하다.", specificity: 3, perspectiveKey: "낙심소망", avoidTags: [], tone: "소망", weight: 72 },
  { referenceKo: "마태복음 11:28-30", bookAbbrEn: "MAT", chapter: 11, verseStart: 28, verseEnd: 30, themes: ["평안", "신뢰"], situationTags: ["일의부담", "기도결단"], emotionTags: ["무기력", "답답함"], summary: "혼자 끌어안았던 무거운 짐을 다시 주님께 가져가려는 상황에 적합하다.", specificity: 3, perspectiveKey: "무기력회복", avoidTags: [], tone: "위로", weight: 82 },
  { referenceKo: "야고보서 1:2-4", bookAbbrEn: "JAS", chapter: 1, verseStart: 2, verseEnd: 4, themes: ["소망", "신뢰"], situationTags: ["회사어려움", "기도결단"], emotionTags: ["낙심", "답답함"], summary: "여러 시험을 인내와 성숙의 자리로 다시 해석하려는 결단에 적합하다.", specificity: 3, perspectiveKey: "낙심소망", avoidTags: ["애도"], tone: "소망", weight: 72 },
  { referenceKo: "야고보서 1:12", bookAbbrEn: "JAS", chapter: 1, verseStart: 12, themes: ["소망", "신뢰"], situationTags: ["회사어려움", "정욕유혹"], emotionTags: ["낙심"], summary: "시험을 견디는 자에게 주시는 생명의 면류관을 다시 바라보려는 상황에 적합하다.", specificity: 3, perspectiveKey: "낙심소망", avoidTags: [], tone: "소망", weight: 68 },
  { referenceKo: "히브리서 12:1-2", bookAbbrEn: "HEB", chapter: 12, verseStart: 1, verseEnd: 2, themes: ["소망", "성실", "정체성"], situationTags: ["미루는습관", "기도결단"], emotionTags: ["낙심", "무기력"], summary: "얽힌 짐을 벗고 예수를 바라보며 다시 경주의 자리에 서려는 결단에 적합하다.", specificity: 4, perspectiveKey: "낙심소망", avoidTags: [], tone: "소망", weight: 88 },

  // ─── 12. 하나님의 뜻 / 진로 / 일 / 직장 / 맡김 (23) ───────────────
  { referenceKo: "잠언 16:3", bookAbbrEn: "PRO", chapter: 16, verseStart: 3, themes: ["하나님의뜻", "신뢰"], situationTags: ["계획맡김", "회사어려움"], emotionTags: ["불안", "혼란"], summary: "내가 끌어안고 있던 일을 주님께 맡기고 다시 길을 내어드리려는 결단에 적합하다.", specificity: 5, perspectiveKey: "계획맡김", avoidTags: [], tone: "지혜", weight: 90 },
  { referenceKo: "잠언 16:9", bookAbbrEn: "PRO", chapter: 16, verseStart: 9, themes: ["하나님의뜻", "겸손"], situationTags: ["계획맡김"], emotionTags: ["혼란"], summary: "내가 그린 길 위에서 인도하시는 주님의 발걸음을 다시 신뢰하려는 상황에 적합하다.", specificity: 4, perspectiveKey: "계획맡김", avoidTags: [], tone: "지혜", weight: 78 },
  { referenceKo: "잠언 19:21", bookAbbrEn: "PRO", chapter: 19, verseStart: 21, themes: ["하나님의뜻", "겸손"], situationTags: ["계획맡김"], emotionTags: ["혼란"], summary: "내 마음의 여러 계획을 내려놓고 결국 이루어지는 주님의 뜻에 다시 마음을 맞추려는 상황에 적합하다.", specificity: 4, perspectiveKey: "계획맡김", avoidTags: [], tone: "지혜", weight: 76 },
  { referenceKo: "잠언 20:24", bookAbbrEn: "PRO", chapter: 20, verseStart: 24, themes: ["하나님의뜻", "신뢰"], situationTags: ["계획맡김"], emotionTags: ["혼란"], summary: "내 걸음의 의미를 다 알지 못해도 인도하시는 주님을 다시 신뢰하려는 상황에 적합하다.", specificity: 3, perspectiveKey: "계획맡김", avoidTags: [], tone: "지혜", weight: 70 },
  { referenceKo: "잠언 21:30-31", bookAbbrEn: "PRO", chapter: 21, verseStart: 30, verseEnd: 31, themes: ["하나님의뜻", "겸손"], situationTags: ["계획맡김", "회사어려움"], emotionTags: ["혼란"], summary: "내 지혜와 모략을 내려놓고 결국 일을 이루시는 주님을 다시 신뢰하려는 상황에 적합하다.", specificity: 4, perspectiveKey: "계획맡김", avoidTags: [], tone: "지혜", weight: 70 },
  { referenceKo: "잠언 14:12", bookAbbrEn: "PRO", chapter: 14, verseStart: 12, themes: ["지혜", "겸손"], situationTags: ["계획맡김"], emotionTags: ["혼란"], summary: "옳아 보이던 내 길을 다시 점검하고 주님께 묻기로 결단하는 상황에 적합하다.", specificity: 4, perspectiveKey: "계획맡김", avoidTags: ["심한자기정죄"], tone: "지혜", weight: 68 },
  { referenceKo: "시편 37:5", bookAbbrEn: "PSA", chapter: 37, verseStart: 5, themes: ["하나님의뜻", "신뢰"], situationTags: ["계획맡김", "기도결단"], emotionTags: ["불안", "혼란"], summary: "내 길을 주님께 다시 맡기고 결과를 기다리려는 결단에 적합하다.", specificity: 4, perspectiveKey: "계획맡김", avoidTags: [], tone: "지혜", weight: 84 },
  { referenceKo: "시편 37:7", bookAbbrEn: "PSA", chapter: 37, verseStart: 7, themes: ["신뢰", "평안"], situationTags: ["계획맡김"], emotionTags: ["초조함", "답답함"], summary: "조급함을 내려놓고 잠잠히 주님을 다시 기다리려는 결단에 적합하다.", specificity: 4, perspectiveKey: "계획맡김", avoidTags: [], tone: "지혜", weight: 74 },
  { referenceKo: "시편 32:8", bookAbbrEn: "PSA", chapter: 32, verseStart: 8, themes: ["하나님의뜻", "지혜"], situationTags: ["계획맡김", "기도결단"], emotionTags: ["혼란"], summary: "내 갈 길을 가르쳐 주시기를 다시 구하려는 상황에 적합하다.", specificity: 4, perspectiveKey: "계획맡김", avoidTags: [], tone: "지혜", weight: 72 },
  { referenceKo: "시편 25:4-5", bookAbbrEn: "PSA", chapter: 25, verseStart: 4, verseEnd: 5, themes: ["하나님의뜻", "지혜"], situationTags: ["계획맡김", "기도결단"], emotionTags: ["혼란"], summary: "내 길을 알 수 없는 자리에서 다시 주님의 도를 가르쳐 달라고 구하려는 상황에 적합하다.", specificity: 4, perspectiveKey: "계획맡김", avoidTags: [], tone: "지혜", weight: 74 },
  { referenceKo: "시편 143:8-10", bookAbbrEn: "PSA", chapter: 143, verseStart: 8, verseEnd: 10, themes: ["하나님의뜻", "기도"], situationTags: ["계획맡김", "기도결단"], emotionTags: ["혼란", "답답함"], summary: "주님의 뜻을 가르쳐 다시 평탄한 길로 인도해 달라고 구하려는 상황에 적합하다.", specificity: 4, perspectiveKey: "계획맡김", avoidTags: [], tone: "지혜", weight: 72 },
  { referenceKo: "이사야 30:21", bookAbbrEn: "ISA", chapter: 30, verseStart: 21, themes: ["하나님의뜻", "지혜"], situationTags: ["계획맡김"], emotionTags: ["혼란"], summary: "이쪽인지 저쪽인지 흔들릴 때 다시 인도하시는 음성을 구하려는 상황에 적합하다.", specificity: 4, perspectiveKey: "계획맡김", avoidTags: [], tone: "지혜", weight: 70 },
  { referenceKo: "이사야 55:8-9", bookAbbrEn: "ISA", chapter: 55, verseStart: 8, verseEnd: 9, themes: ["하나님의뜻", "겸손"], situationTags: ["계획맡김"], emotionTags: ["혼란"], summary: "내 생각보다 높으신 주님의 뜻을 다시 신뢰하려는 결단에 적합하다.", specificity: 3, perspectiveKey: "계획맡김", avoidTags: [], tone: "지혜", weight: 76 },
  { referenceKo: "예레미야 29:11-13", bookAbbrEn: "JER", chapter: 29, verseStart: 11, verseEnd: 13, themes: ["하나님의뜻", "소망"], situationTags: ["계획맡김", "기도결단"], emotionTags: ["혼란", "낙심"], summary: "막막한 자리에서도 평안을 향한 주님의 생각을 다시 신뢰하려는 상황에 적합하다.", specificity: 3, perspectiveKey: "계획맡김", avoidTags: ["심한자기정죄"], tone: "위로", weight: 78 },
  { referenceKo: "예레미야 33:3", bookAbbrEn: "JER", chapter: 33, verseStart: 3, themes: ["기도", "하나님의뜻"], situationTags: ["기도결단", "계획맡김"], emotionTags: ["혼란"], summary: "혼자 풀지 못한 자리에서 다시 주님께 부르짖으려는 결단에 적합하다.", specificity: 3, perspectiveKey: "계획맡김", avoidTags: [], tone: "지혜", weight: 70 },
  { referenceKo: "마태복음 6:10", bookAbbrEn: "MAT", chapter: 6, verseStart: 10, themes: ["하나님의뜻", "기도"], situationTags: ["계획맡김", "기도결단"], emotionTags: ["혼란"], summary: "내 뜻이 아니라 하늘의 뜻이 내 자리에 이루어지기를 다시 구하려는 결단에 적합하다.", specificity: 4, perspectiveKey: "계획맡김", avoidTags: [], tone: "결단", weight: 78 },
  { referenceKo: "마태복음 26:39", bookAbbrEn: "MAT", chapter: 26, verseStart: 39, themes: ["하나님의뜻", "순종"], situationTags: ["계획맡김", "기도결단"], emotionTags: ["답답함", "두려움"], summary: "내 원함을 솔직히 토하면서도 결국 아버지의 뜻에 자리를 내어드리려는 결단에 적합하다.", specificity: 5, perspectiveKey: "계획맡김", avoidTags: [], tone: "결단", weight: 84 },
  { referenceKo: "누가복음 1:38", bookAbbrEn: "LUK", chapter: 1, verseStart: 38, themes: ["순종", "하나님의뜻"], situationTags: ["계획맡김", "기도결단"], emotionTags: ["혼란", "두려움"], summary: "내 계획이 흔들리는 자리에서도 말씀대로 이루어지기를 다시 구하려는 상황에 적합하다.", specificity: 4, perspectiveKey: "계획맡김", avoidTags: [], tone: "결단", weight: 72 },
  { referenceKo: "골로새서 1:9-10", bookAbbrEn: "COL", chapter: 1, verseStart: 9, verseEnd: 10, themes: ["하나님의뜻", "지혜", "성실"], situationTags: ["계획맡김", "기도결단"], emotionTags: ["혼란"], summary: "신령한 지혜와 총명으로 주님의 뜻을 다시 분별하려는 상황에 적합하다.", specificity: 4, perspectiveKey: "계획맡김", avoidTags: [], tone: "지혜", weight: 76 },
  { referenceKo: "에베소서 5:17", bookAbbrEn: "EPH", chapter: 5, verseStart: 17, themes: ["하나님의뜻", "지혜"], situationTags: ["계획맡김"], emotionTags: ["혼란"], summary: "어리석게 흘러가지 않고 주님의 뜻이 무엇인지 다시 분별하려는 결단에 적합하다.", specificity: 4, perspectiveKey: "계획맡김", avoidTags: [], tone: "지혜", weight: 70 },
  { referenceKo: "사도행전 22:10", bookAbbrEn: "ACT", chapter: 22, verseStart: 10, themes: ["순종", "하나님의뜻"], situationTags: ["계획맡김", "기도결단"], emotionTags: ["혼란"], summary: "내가 무엇을 해야 할지 다시 주님께 정직하게 묻는 자리에 적합하다.", specificity: 4, perspectiveKey: "계획맡김", avoidTags: [], tone: "결단", weight: 70 },
  { referenceKo: "데살로니가전서 5:18", bookAbbrEn: "1TH", chapter: 5, verseStart: 18, themes: ["감사", "하나님의뜻"], situationTags: ["감사회복", "계획맡김"], emotionTags: ["답답함"], summary: "이 상황 속에서도 감사로 주님의 뜻을 다시 붙들려는 결단에 적합하다.", specificity: 3, perspectiveKey: "감사회복", avoidTags: ["심한자기정죄"], tone: "지혜", weight: 78 },
  { referenceKo: "사도행전 16:6-10", bookAbbrEn: "ACT", chapter: 16, verseStart: 6, verseEnd: 10, themes: ["하나님의뜻", "순종"], situationTags: ["계획맡김", "회사어려움"], emotionTags: ["혼란"], summary: "막힌 길과 새로 열린 길을 함께 보며 주님의 인도를 다시 신뢰하려는 상황에 적합하다.", specificity: 4, perspectiveKey: "계획맡김", avoidTags: [], tone: "지혜", weight: 72 },

  // ─── 13. 감사 / 기쁨 / 평안 (14) ──────────────────────────────────
  { referenceKo: "빌립보서 4:4", bookAbbrEn: "PHP", chapter: 4, verseStart: 4, themes: ["기쁨"], situationTags: ["감사회복"], emotionTags: ["기쁨", "낙심"], summary: "환경에 흔들린 마음을 멈추고 주 안에서 다시 기뻐하려는 결단에 적합하다.", specificity: 2, perspectiveKey: "감사회복", avoidTags: [], tone: "감사", weight: 68 },
  { referenceKo: "시편 100:4-5", bookAbbrEn: "PSA", chapter: 100, verseStart: 4, verseEnd: 5, themes: ["감사", "예배"], situationTags: ["감사회복", "예배회복"], emotionTags: ["감사"], summary: "감사함으로 그분의 문에 들어서는 자리로 다시 돌이키려는 상황에 적합하다.", specificity: 3, perspectiveKey: "감사회복", avoidTags: [], tone: "감사", weight: 70 },
  { referenceKo: "시편 103:1-5", bookAbbrEn: "PSA", chapter: 103, verseStart: 1, verseEnd: 5, themes: ["감사", "예배"], situationTags: ["감사회복", "예배회복"], emotionTags: ["감사", "공허함"], summary: "받은 모든 은택을 다시 헤아리며 감사로 영혼을 깨우려는 상황에 적합하다.", specificity: 3, perspectiveKey: "감사회복", avoidTags: [], tone: "감사", weight: 76 },
  { referenceKo: "시편 118:24", bookAbbrEn: "PSA", chapter: 118, verseStart: 24, themes: ["감사", "기쁨"], situationTags: ["감사회복"], emotionTags: ["감사", "낙심"], summary: "오늘이라는 하루를 다시 주님이 정하신 날로 받아들이려는 결단에 적합하다.", specificity: 3, perspectiveKey: "감사회복", avoidTags: [], tone: "감사", weight: 64 },
  { referenceKo: "시편 34:8", bookAbbrEn: "PSA", chapter: 34, verseStart: 8, themes: ["감사", "신뢰"], situationTags: ["감사회복", "기도결단"], emotionTags: ["감사"], summary: "주님의 선하심을 다시 맛보려는 자리로 마음을 옮기려는 상황에 적합하다.", specificity: 3, perspectiveKey: "감사회복", avoidTags: [], tone: "감사", weight: 68 },
  { referenceKo: "에베소서 5:20", bookAbbrEn: "EPH", chapter: 5, verseStart: 20, themes: ["감사"], situationTags: ["감사회복"], emotionTags: ["답답함"], summary: "범사에 감사하는 자리로 일상의 마음을 다시 옮기려는 결단에 적합하다.", specificity: 3, perspectiveKey: "감사회복", avoidTags: ["심한자기정죄"], tone: "감사", weight: 64 },
  { referenceKo: "골로새서 3:15-17", bookAbbrEn: "COL", chapter: 3, verseStart: 15, verseEnd: 17, themes: ["평안", "감사", "예배"], situationTags: ["감사회복", "예배회복"], emotionTags: ["답답함"], summary: "그리스도의 평강이 마음을 주관하도록 일상을 다시 정렬하려는 결단에 적합하다.", specificity: 4, perspectiveKey: "감사회복", avoidTags: [], tone: "감사", weight: 74 },
  { referenceKo: "시편 16:11", bookAbbrEn: "PSA", chapter: 16, verseStart: 11, themes: ["기쁨", "예배"], situationTags: ["예배회복"], emotionTags: ["공허함", "기쁨"], summary: "공허한 마음을 주님 앞의 충만한 기쁨으로 다시 채우려는 상황에 적합하다.", specificity: 3, perspectiveKey: "감사회복", avoidTags: [], tone: "감사", weight: 68 },
  { referenceKo: "시편 23:5-6", bookAbbrEn: "PSA", chapter: 23, verseStart: 5, verseEnd: 6, themes: ["감사", "신뢰"], situationTags: ["감사회복"], emotionTags: ["감사"], summary: "받은 은혜를 헤아리며 다시 잔이 넘치는 자리로 마음을 돌리려는 상황에 적합하다.", specificity: 2, perspectiveKey: "감사회복", avoidTags: [], tone: "감사", weight: 60 },
  { referenceKo: "이사야 12:2-3", bookAbbrEn: "ISA", chapter: 12, verseStart: 2, verseEnd: 3, themes: ["신뢰", "기쁨"], situationTags: ["감사회복", "기도결단"], emotionTags: ["불안", "기쁨"], summary: "두려움 대신 구원의 우물에서 다시 길어 올린 기쁨을 누리려는 상황에 적합하다.", specificity: 3, perspectiveKey: "평안회복", avoidTags: [], tone: "감사", weight: 70 },
  { referenceKo: "느헤미야 8:10", bookAbbrEn: "NEH", chapter: 8, verseStart: 10, themes: ["기쁨", "신뢰"], situationTags: ["낙심", "감사회복"], emotionTags: ["낙심", "기쁨"], summary: "지친 자리에서 주님으로 인한 기쁨을 다시 힘 삼으려는 결단에 적합하다.", specificity: 3, perspectiveKey: "감사회복", avoidTags: [], tone: "감사", weight: 72 },
  { referenceKo: "누가복음 17:15-19", bookAbbrEn: "LUK", chapter: 17, verseStart: 15, verseEnd: 19, themes: ["감사", "예배"], situationTags: ["감사회복", "예배회복"], emotionTags: ["감사"], summary: "은혜를 잊고 지나가던 자리에서 돌이켜 다시 감사를 드리려는 결단에 적합하다.", specificity: 4, perspectiveKey: "감사회복", avoidTags: [], tone: "감사", weight: 70 },
  { referenceKo: "시편 92:1-2", bookAbbrEn: "PSA", chapter: 92, verseStart: 1, verseEnd: 2, themes: ["감사", "예배"], situationTags: ["감사회복", "예배회복"], emotionTags: ["감사"], summary: "아침과 저녁마다 감사의 자리를 일상으로 다시 회복하려는 결단에 적합하다.", specificity: 4, perspectiveKey: "감사회복", avoidTags: [], tone: "감사", weight: 64 },
  { referenceKo: "빌립보서 1:3-4", bookAbbrEn: "PHP", chapter: 1, verseStart: 3, verseEnd: 4, themes: ["감사", "공동체", "기도"], situationTags: ["감사회복", "공동체회복"], emotionTags: ["감사"], summary: "함께한 사람들을 다시 떠올리며 감사로 기도하려는 상황에 적합하다.", specificity: 3, perspectiveKey: "감사회복", avoidTags: [], tone: "감사", weight: 64 },
];

// ─── 검증 함수 ────────────────────────────────────────────────────────────

/**
 * 시드 무결성 검증.
 * - 총 개수 / 중복 / 필수 필드 / 범위 / 금지 필드 / 범용 비율을 점검한다.
 * - DB 접속 없이 실행할 수 있다.
 */
export function validateVerseSeeds(seeds: VerseSeed[]): void {
  if (seeds.length !== 300) {
    throw new Error(
      `VERSE_SEEDS must contain 300 items. Current: ${seeds.length}`
    );
  }

  const refSet = new Set<string>();
  const keySet = new Set<string>();
  const FORBIDDEN = ["isGeneric", "intentTags", "userActionTags"] as const;

  let genericLikeCount = 0;
  let rebukeCount = 0;
  const summarySuspectQuotes: string[] = [];
  const QUOTE_PATTERNS = [/“[^”]+”/, /"[^"]+"/, /『[^』]+』/];
  const toneSet = new Set<string>(VERSE_TONES);

  for (const seed of seeds) {
    for (const banned of FORBIDDEN) {
      if (banned in (seed as Record<string, unknown>)) {
        throw new Error(`Do not define ${banned} in seed: ${seed.referenceKo}`);
      }
    }

    if (refSet.has(seed.referenceKo)) {
      throw new Error(`Duplicate referenceKo: ${seed.referenceKo}`);
    }
    refSet.add(seed.referenceKo);

    const key = [
      seed.bookAbbrEn,
      seed.chapter,
      seed.verseStart,
      seed.verseEnd ?? "",
    ].join(":");
    if (keySet.has(key)) {
      throw new Error(`Duplicate verse key: ${key} (${seed.referenceKo})`);
    }
    keySet.add(key);

    if (!seed.summary || seed.summary.length < 20) {
      throw new Error(
        `Invalid summary for ${seed.referenceKo} (length=${seed.summary?.length ?? 0})`
      );
    }
    if (seed.summary.length > 120) {
      console.warn(
        `[validateVerseSeeds] Long summary (${seed.summary.length}자) for ${seed.referenceKo}`
      );
    }
    if (QUOTE_PATTERNS.some((re) => re.test(seed.summary))) {
      summarySuspectQuotes.push(seed.referenceKo);
    }

    if (
      !Array.isArray(seed.themes) ||
      seed.themes.length < 1 ||
      !Array.isArray(seed.situationTags) ||
      seed.situationTags.length < 1 ||
      !Array.isArray(seed.emotionTags) ||
      seed.emotionTags.length < 1
    ) {
      throw new Error(
        `Missing required tag arrays for ${seed.referenceKo} (themes/situationTags/emotionTags 모두 1개 이상 필요)`
      );
    }

    if (!Number.isInteger(seed.specificity) || seed.specificity < 1 || seed.specificity > 5) {
      throw new Error(
        `Invalid specificity for ${seed.referenceKo}: ${seed.specificity}`
      );
    }

    if (!Number.isInteger(seed.weight) || seed.weight < 0 || seed.weight > 100) {
      throw new Error(`Invalid weight for ${seed.referenceKo}: ${seed.weight}`);
    }
    if (seed.weight === 100) {
      throw new Error(`Do not use weight 100: ${seed.referenceKo}`);
    }

    if (!seed.perspectiveKey || seed.perspectiveKey.trim().length === 0) {
      throw new Error(`Missing perspectiveKey for ${seed.referenceKo}`);
    }

    if (!Array.isArray(seed.avoidTags)) {
      throw new Error(`avoidTags must be an array for ${seed.referenceKo}`);
    }

    if (!seed.tone || !toneSet.has(seed.tone)) {
      throw new Error(
        `Invalid tone for ${seed.referenceKo}: ${String(seed.tone)} (allowed: ${[...toneSet].join(", ")})`
      );
    }

    if (seed.specificity <= 2) {
      genericLikeCount++;
    }
    if (seed.tone === "책망") {
      rebukeCount++;
    }
  }

  const genericRatio = genericLikeCount / seeds.length;
  if (genericRatio > 0.2) {
    throw new Error(
      `Too many generic-like verses (specificity<=2): ${genericLikeCount}/${seeds.length} (${(genericRatio * 100).toFixed(1)}%)`
    );
  }

  const rebukeRatio = rebukeCount / seeds.length;
  if (rebukeRatio > 0.1) {
    console.warn(
      `[validateVerseSeeds] tone="책망" 비율이 다소 높습니다: ${rebukeCount}/${seeds.length} (${(rebukeRatio * 100).toFixed(1)}%)`
    );
  }

  if (summarySuspectQuotes.length > 0) {
    console.warn(
      `[validateVerseSeeds] summary 안에 따옴표 인용형 표현이 있는 항목이 있습니다 — 본문 직접 인용이 아닌지 검토하세요:\n  ${summarySuspectQuotes.join(", ")}`
    );
  }

  console.log(
    `[validateVerseSeeds] ok — 300개 / specificity<=2 ${genericLikeCount}개 (${(genericRatio * 100).toFixed(1)}%) / 책망 ${rebukeCount}개 (${(rebukeRatio * 100).toFixed(1)}%)`
  );
}

// ─── upsert 메인 ──────────────────────────────────────────────────────────

const VALIDATE_ONLY = process.env.SEED_VALIDATE_ONLY === "1";

if (!VALIDATE_ONLY) {
  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL 이 비어 있습니다. .env.local 을 확인하세요.");
    process.exit(1);
  }
  if (!process.env.GEMINI_API_KEY) {
    console.error("❌ GEMINI_API_KEY 가 비어 있습니다. .env.local 을 확인하세요.");
    process.exit(1);
  }
}

const EMBEDDING_MODEL =
  process.env.GEMINI_EMBEDDING_MODEL ?? "gemini-embedding-001";
const FORCE_REEMBED = process.env.SEED_FORCE_REEMBED === "1";

async function main() {
  validateVerseSeeds(VERSE_SEEDS);

  if (VALIDATE_ONLY) {
    console.log("[seed-verses] SEED_VALIDATE_ONLY=1 — 검증만 수행하고 종료합니다.");
    process.exit(0);
  }

  // 어떤 DB 에 붙는지 시각 확인
  try {
    const u = new URL(process.env.DATABASE_URL!.replace(/^postgresql:/, "http:"));
    console.log(`[seed-verses] target = ${u.host}`);
  } catch {
    // URL 파싱 실패는 무시
  }

  const client = postgres(process.env.DATABASE_URL!, { prepare: false });
  const db = drizzle(client);

  console.log(
    `[seed-verses] 총 ${VERSE_SEEDS.length}개 구절 시드 시작 (embedding model=${EMBEDDING_MODEL})`
  );

  let embedded = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < VERSE_SEEDS.length; i++) {
    const seed = VERSE_SEEDS[i];

    const deepLinkUrl = link(
      seed.bookAbbrEn,
      seed.chapter,
      seed.verseStart,
      seed.verseEnd ?? null
    );
    const embeddingText = buildVerseEmbeddingText(seed);
    const isGeneric = seed.specificity <= 2;

    // 동일 embeddingText/model 이면 임베딩 호출을 스킵
    let needEmbed = true;
    if (!FORCE_REEMBED) {
      const existing = await db
        .select({
          id: verses.id,
          embeddingText: verses.embeddingText,
          embeddingModel: verses.embeddingModel,
        })
        .from(verses)
        .where(
          and(
            eq(verses.bookAbbrEn, seed.bookAbbrEn),
            eq(verses.chapter, seed.chapter),
            eq(verses.verseStart, seed.verseStart),
            seed.verseEnd
              ? eq(verses.verseEnd, seed.verseEnd)
              : sql`${verses.verseEnd} is null`
          )
        )
        .limit(1);
      if (
        existing.length > 0 &&
        existing[0].embeddingText === embeddingText &&
        existing[0].embeddingModel === EMBEDDING_MODEL
      ) {
        needEmbed = false;
      }
    }

    let embedding: number[] | null = null;
    if (needEmbed) {
      try {
        embedding = await embedText(embeddingText, { model: EMBEDDING_MODEL });
        embedded++;
      } catch (err) {
        errors++;
        console.error(
          `[seed-verses] embed failed (${i + 1}/${VERSE_SEEDS.length}) ${seed.referenceKo}:`,
          err
        );
      }
    } else {
      skipped++;
    }

    const baseValues = {
      referenceKo: seed.referenceKo,
      deepLinkUrl,
      themes: seed.themes,
      situationTags: seed.situationTags,
      emotionTags: seed.emotionTags,
      summary: seed.summary,
      weight: seed.weight,
      isGeneric,
      specificity: seed.specificity,
      perspectiveKey: seed.perspectiveKey,
      avoidTags: seed.avoidTags,
      tone: seed.tone,
      embeddingText,
    };

    const upsertValues = {
      bookAbbrEn: seed.bookAbbrEn,
      chapter: seed.chapter,
      verseStart: seed.verseStart,
      verseEnd: seed.verseEnd ?? null,
      ...baseValues,
      ...(embedding ? { embedding, embeddingModel: EMBEDDING_MODEL } : {}),
    };

    const updateValues = {
      ...baseValues,
      ...(embedding ? { embedding, embeddingModel: EMBEDDING_MODEL } : {}),
    };

    await db
      .insert(verses)
      .values(upsertValues)
      .onConflictDoUpdate({
        target: [
          verses.bookAbbrEn,
          verses.chapter,
          verses.verseStart,
          verses.verseEnd,
        ],
        set: updateValues,
      });

    if ((i + 1) % 25 === 0) {
      console.log(
        `[seed-verses] ${i + 1}/${VERSE_SEEDS.length} (embedded=${embedded}, skipped=${skipped}, errors=${errors})`
      );
    }
  }

  const result = await db.execute(sql`select count(*)::int as count from verse`);
  const list =
    (result as unknown as { rows?: Array<{ count: number }> }).rows ??
    (result as unknown as Array<{ count: number }>);
  const count = list?.[0]?.count ?? "?";
  console.log(
    `[seed-verses] 완료. verse row=${count} (embedded=${embedded}, skipped=${skipped}, errors=${errors})`
  );
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
