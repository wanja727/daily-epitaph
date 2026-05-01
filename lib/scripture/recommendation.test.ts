/**
 * 작성자 전용 말씀 추천 — 단위 테스트.
 * 실행: `npx tsx lib/scripture/recommendation.test.ts`
 *
 * 외부 의존(DB, Gemini)을 타지 않도록 순수 함수 단위로만 검증한다.
 *
 * TODO: 개역개정 원문 직접 저장/노출 전 대한성서공회 저작권 검토 필요
 */

import assert from "node:assert/strict";
import {
  sanitizeCardText,
  buildCardText,
  buildEpitaphRecommendationText,
} from "./sanitize";
import { shallowCleanAiResult } from "@/lib/ai/gemini";
import {
  normalizeAndValidateRecommendation,
  type SafeRecommendationResult,
} from "./recommendation-service";
import type { VerseCandidate } from "./verse-repository";
import { buildVerseEmbeddingText } from "./verse-repository";

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void | Promise<void>) {
  try {
    const r = fn();
    if (r instanceof Promise) {
      r.then(
        () => {
          passed++;
          console.log(`  ok  - ${name}`);
        },
        (err) => {
          failed++;
          console.error(`  FAIL - ${name}\n${err}`);
        }
      );
    } else {
      passed++;
      console.log(`  ok  - ${name}`);
    }
  } catch (err) {
    failed++;
    console.error(`  FAIL - ${name}\n${err}`);
  }
}

// ─── 1. sanitize: 이메일/전화/URL/숫자 마스킹 ────────────────────────────
test("sanitize: 이메일/전화/URL/긴 숫자열을 모두 마스킹한다", () => {
  const input =
    "연락 foo.bar@example.com 010-1234-5678 https://evil.example 123456789 내용";
  const out = sanitizeCardText(input);
  assert.ok(out.includes("[EMAIL]"), "이메일 마스킹 실패");
  assert.ok(out.includes("[PHONE]"), "전화번호 마스킹 실패");
  assert.ok(out.includes("[URL]"), "URL 마스킹 실패");
  assert.ok(out.includes("[NUMBER]"), "긴 숫자열 마스킹 실패");
  assert.ok(!out.includes("foo.bar@example.com"));
  assert.ok(!out.includes("010-1234-5678"));
});

test("sanitize: 평범한 한국어 문장은 훼손하지 않는다", () => {
  const input = "게으름의 고리를 끊고 싶습니다.";
  assert.equal(sanitizeCardText(input), input);
});

test("buildCardText / buildEpitaphRecommendationText: 어제/오늘 섹션 포맷", () => {
  const a = buildCardText("A", "B");
  assert.ok(a.startsWith("어제를 돌아보며\nA"));
  assert.ok(a.includes("\n\n오늘을 기대하며\nB"));

  const b = buildEpitaphRecommendationText({ yesterday: "X", today: "Y" });
  assert.ok(b.includes("어제를 돌아보며"));
  assert.ok(b.includes("오늘을 기대하며"));
  assert.ok(b.includes("X"));
  assert.ok(b.includes("Y"));
});

// ─── 2. shallowCleanAiResult: 1차 정규화 ──────────────────────────────
test("shallowCleanAiResult: 잘못된 themes 타입은 빈 배열로", () => {
  const result = shallowCleanAiResult({
    // @ts-expect-error — 비정상 입력 의도적
    themes: "게으름",
    situationTags: null as unknown as string[],
    emotionTags: [123, "불안", "불안"] as unknown as string[],
    recommendations: [
      { verseId: "v1", reason: "good" },
      { verseId: "", reason: "drop" },
      // @ts-expect-error — 비정상 입력 의도적
      null,
    ],
  });
  assert.deepEqual(result.themes, []);
  assert.deepEqual(result.situationTags, []);
  assert.deepEqual(result.emotionTags, ["불안"]);
  assert.equal(result.recommendations.length, 1);
  assert.equal(result.recommendations[0].verseId, "v1");
});

// ─── 3. 검증: 후보 밖 verseId 폐기 (hallucination 방지) ──────────────
test("normalizeAndValidateRecommendation: candidates 안의 verseId 만 통과", () => {
  const candidates: VerseCandidate[] = [
    mkCand({ id: "v1", referenceKo: "잠언 24:30-34" }),
    mkCand({ id: "v2", referenceKo: "빌립보서 4:6-7" }),
  ];
  const result = normalizeAndValidateRecommendation({
    aiResult: {
      themes: ["게으름"],
      situationTags: ["생활질서무너짐"],
      emotionTags: ["무기력"],
      recommendations: [
        { verseId: "v1", reason: "무너진 자리를 돌아보게 합니다." },
        { verseId: "ghost", reason: "후보에 없음" },
        { verseId: "v2", reason: "기도와 감사로 아뢰게 합니다." },
      ],
    },
    candidates,
  });
  const ids = result.recommendations.map((r) => r.reference);
  assert.deepEqual(ids, ["잠언 24:30-34", "빌립보서 4:6-7"]);
  // deepLinkUrl 은 DB(=candidates)에서 붙이므로 placeholder 가 사라져야 한다.
  assert.ok(result.recommendations.every((r) => r.deepLinkUrl.startsWith("https://")));
});

// ─── 4. 검증: isGeneric 쏠림 방지 ─────────────────────────────────────
test("normalizeAndValidateRecommendation: isGeneric=true 만 2개 이상이면 줄인다", () => {
  const candidates: VerseCandidate[] = [
    mkCand({ id: "g1", referenceKo: "A", isGeneric: true, perspectiveKey: "g-1" }),
    mkCand({ id: "g2", referenceKo: "B", isGeneric: true, perspectiveKey: "g-2" }),
    mkCand({ id: "g3", referenceKo: "C", isGeneric: true, perspectiveKey: "g-3" }),
    mkCand({ id: "s1", referenceKo: "D", isGeneric: false, perspectiveKey: "specific" }),
  ];
  const result: SafeRecommendationResult = normalizeAndValidateRecommendation({
    aiResult: {
      themes: [],
      situationTags: [],
      emotionTags: [],
      recommendations: [
        { verseId: "g1", reason: "범용1입니다." },
        { verseId: "g2", reason: "범용2입니다." },
        { verseId: "g3", reason: "범용3입니다." },
      ],
    },
    candidates,
  });
  const candidateByRef = new Map(candidates.map((c) => [c.referenceKo, c]));
  const genericCount = result.recommendations.filter(
    (r) => candidateByRef.get(r.reference)?.isGeneric === true
  ).length;
  assert.ok(
    genericCount <= 1,
    `isGeneric 추천은 최대 1개여야 함 (실제: ${genericCount})`
  );
  // 부족분은 후보에서 채워지며, 다양성 규칙상 isGeneric=false 인 D 가 채워져야 한다.
  const refs = result.recommendations.map((r) => r.reference);
  assert.ok(refs.includes("D"), "구체 후보(D)가 fallback 으로 추가되어야 한다");
});

// ─── 5. 검증: perspectiveKey 중복 제거 ────────────────────────────────
test("normalizeAndValidateRecommendation: 같은 perspectiveKey 는 1개만", () => {
  const candidates: VerseCandidate[] = [
    mkCand({ id: "p1", referenceKo: "X1", perspectiveKey: "기도결단" }),
    mkCand({ id: "p2", referenceKo: "X2", perspectiveKey: "기도결단" }),
    mkCand({ id: "p3", referenceKo: "X3", perspectiveKey: "옛사람벗기" }),
  ];
  const result = normalizeAndValidateRecommendation({
    aiResult: {
      themes: [],
      situationTags: [],
      emotionTags: [],
      recommendations: [
        { verseId: "p1", reason: "기도결단A입니다." },
        { verseId: "p2", reason: "기도결단B입니다." },
        { verseId: "p3", reason: "옛사람벗기 결단을 떠올리게 합니다." },
      ],
    },
    candidates,
  });
  const refs = result.recommendations.map((r) => r.reference);
  assert.deepEqual(refs, ["X1", "X3"]);
});

// ─── 6. 검증: reason 길이 제한 + fallback ───────────────────────────
test("normalizeAndValidateRecommendation: reason 길이를 정규화하고 비어 있으면 summary 로 대체", () => {
  const candidates: VerseCandidate[] = [
    mkCand({ id: "r1", referenceKo: "R1", summary: "오늘의 마음을 다시 돌아보게 합니다." }),
    mkCand({ id: "r2", referenceKo: "R2", summary: "기도와 감사로 아뢰는 자리를 떠올리게 합니다." }),
  ];
  const result = normalizeAndValidateRecommendation({
    aiResult: {
      themes: [],
      situationTags: [],
      emotionTags: [],
      recommendations: [
        { verseId: "r1", reason: "" }, // 빈 → fallback
        { verseId: "r2", reason: "x".repeat(120) }, // 길음 → 60자 컷
      ],
    },
    candidates,
  });
  assert.equal(result.recommendations.length, 2);
  assert.ok(result.recommendations[0].reason.length > 0, "빈 reason 은 fallback 으로 채움");
  assert.ok(result.recommendations[1].reason.length <= 60, "긴 reason 은 60자 이내");
});

// ─── 7. 검증: 최대 3개 ───────────────────────────────────────────────
test("normalizeAndValidateRecommendation: 최대 3개까지만 반환", () => {
  const candidates: VerseCandidate[] = ["a", "b", "c", "d", "e"].map((id) =>
    mkCand({ id, referenceKo: id, perspectiveKey: id })
  );
  const result = normalizeAndValidateRecommendation({
    aiResult: {
      themes: [],
      situationTags: [],
      emotionTags: [],
      recommendations: candidates.map((c) => ({
        verseId: c.id,
        reason: `${c.id}를 떠올리게 합니다.`,
      })),
    },
    candidates,
  });
  assert.equal(result.recommendations.length, 3);
});

// ─── 8. buildVerseEmbeddingText: 메타데이터 기반 라벨링 ──────────────
test("buildVerseEmbeddingText: 메타데이터 라벨로만 구성된다", () => {
  const text = buildVerseEmbeddingText({
    referenceKo: "잠언 24:30-34",
    themes: ["성실", "생활질서"],
    situationTags: ["생활질서무너짐", "자기방임"],
    emotionTags: ["무기력"],
    summary: "무너진 생활 질서와 자기방임을 돌아보려는 상황에 적합하다.",
    specificity: 5,
    perspectiveKey: "생활질서회복",
    avoidTags: ["심한자기정죄"],
    tone: "권면",
  });
  // 라벨/메타가 모두 포함된다
  assert.ok(text.includes("장절: 잠언 24:30-34"));
  assert.ok(text.includes("주제: 성실"));
  assert.ok(text.includes("추천 상황: 무너진 생활 질서와"));
  assert.ok(text.includes("추천 관점: 생활질서회복"));
  assert.ok(text.includes("구체성: 5"));
  assert.ok(text.includes("톤: 권면"));
  assert.ok(text.includes("회피 상황: 심한자기정죄"));
  // 범용 여부 라벨은 더 이상 포함하지 않는다 (specificity 로 판단 가능).
  assert.ok(!text.includes("범용 여부"));
  // 라벨 없이 본문 인용을 그대로 첫 줄에 두지 않는다 (반드시 "라벨: 값" 형태)
  for (const line of text.split("\n")) {
    assert.ok(/^[가-힣 ]+:/.test(line), `embeddingText 의 모든 줄은 "라벨: 값" 이어야 함 — "${line}"`);
  }
});

test("buildVerseEmbeddingText: avoidTags / tone 이 비면 해당 라벨을 생략한다", () => {
  const text = buildVerseEmbeddingText({
    referenceKo: "빌립보서 4:6-7",
    themes: ["기도", "평안"],
    situationTags: ["기도결단"],
    emotionTags: ["불안"],
    summary: "불안 속에서 기도로 마음을 돌이키려는 상황에 적합하다.",
    specificity: 4,
    perspectiveKey: "불안기도",
    avoidTags: [],
    tone: null,
  });
  assert.ok(!text.includes("회피 상황"));
  assert.ok(!text.includes("톤:"));
});

// ─── 9. 공개 피드 누출 방지 (스모크 테스트) ──────────────────────────
test("공개 피드 응답 모양에는 recommendation 키가 없다", () => {
  // app/(app)/main/page.tsx 의 enrichedEpitaphs 모양을 모사한다.
  const feedItem = {
    id: "e1",
    yesterday: "...",
    today: "...",
    userId: "u1",
    nickname: "n",
    cellId: null,
    updatedAt: new Date(),
    reactions: {},
    myReaction: null,
  };
  const keys = Object.keys(feedItem);
  for (const banned of ["recommendation", "scriptureRecommendation", "recommendations"]) {
    assert.ok(!keys.includes(banned), `feed item 에 ${banned} 키가 있으면 안 됨`);
  }
});

// ─── helpers ─────────────────────────────────────────────────────────
function mkCand(input: Partial<VerseCandidate> & { id: string; referenceKo: string }): VerseCandidate {
  return {
    id: input.id,
    referenceKo: input.referenceKo,
    bookAbbrEn: input.bookAbbrEn ?? "TST",
    chapter: input.chapter ?? 1,
    verseStart: input.verseStart ?? 1,
    verseEnd: input.verseEnd ?? null,
    deepLinkUrl: input.deepLinkUrl ?? `https://example.test/${input.id}`,
    themes: input.themes ?? [],
    situationTags: input.situationTags ?? [],
    emotionTags: input.emotionTags ?? [],
    summary: input.summary ?? null,
    weight: input.weight ?? 50,
    isGeneric: input.isGeneric ?? false,
    specificity: input.specificity ?? 3,
    perspectiveKey: input.perspectiveKey ?? null,
    avoidTags: input.avoidTags ?? [],
    tone: input.tone ?? null,
  };
}

setTimeout(() => {
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}, 50);
