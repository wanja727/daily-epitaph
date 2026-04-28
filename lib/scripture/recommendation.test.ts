/**
 * 최소한의 단위 테스트 묶음.
 * 실행: `npx tsx lib/scripture/recommendation.test.ts`
 *
 * 외부 의존(DB, Gemini)을 타지 않도록 순수 함수 단위로만 검증한다.
 */

import assert from "node:assert/strict";
import { sanitizeCardText, buildCardText } from "./sanitize";
import { normalizeResult } from "@/lib/ai/gemini";
import type { VerseCandidate } from "./verse-repository";

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
test("sanitize: 이메일/전화/URL/긴 숫자열을 마스킹한다", () => {
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

// ─── 2. sanitize: 민감정보 없는 문장은 그대로 유지 ──────────────────────
test("sanitize: 평범한 한국어 문장은 훼손하지 않는다", () => {
  const input = "게으름의 고리를 끊고 싶습니다.";
  assert.equal(sanitizeCardText(input), input);
});

// ─── 3. buildCardText: 어제/오늘 포맷 ───────────────────────────────────
test("buildCardText: 어제/오늘 섹션을 지정 포맷으로 조합한다", () => {
  const text = buildCardText("A", "B");
  assert.ok(text.startsWith("어제를 돌아보며\nA"));
  assert.ok(text.includes("\n\n오늘을 기대하며\nB"));
});

// ─── 4. normalizeResult: 후보에 없는 reference는 버린다 ───────────────
test("normalizeResult: hallucinated reference를 제거한다", () => {
  const candidates: VerseCandidate[] = [
    {
      id: "1",
      referenceKo: "잠언 24:30-34",
      deepLinkUrl: "https://bible.bskorea.or.kr/bible/NKRV/PRO.24.30",
      themes: ["게으름"],
      situationTags: ["생활질서무너짐"],
      emotionTags: [],
      summary: null,
      isGeneric: false,
      weight: 90,
    },
  ];
  const result = normalizeResult(
    {
      themes: ["게으름"],
      situationTags: ["생활질서무너짐"],
      emotionTags: ["무기력"],
      recommendations: [
        { reference: "잠언 24:30-34", reason: "무너진 자리를 돌아보게 합니다.", deepLinkUrl: "x" },
        { reference: "가짜서 1:1", reason: "존재하지 않는 구절.", deepLinkUrl: "x" },
      ],
    },
    candidates
  );
  assert.equal(result.recommendations.length, 1);
  assert.equal(result.recommendations[0].reference, "잠언 24:30-34");
  // deepLinkUrl은 후보 테이블의 값으로 강제 덮어쓴다
  assert.equal(
    result.recommendations[0].deepLinkUrl,
    "https://bible.bskorea.or.kr/bible/NKRV/PRO.24.30"
  );
});

// ─── 5. normalizeResult: 중복 제거 + 최대 3개 ─────────────────────────
test("normalizeResult: 중복 reference를 제거하고 최대 3개로 자른다", () => {
  const candidates: VerseCandidate[] = [
    mkCand("A"),
    mkCand("B"),
    mkCand("C"),
    mkCand("D"),
  ];
  const result = normalizeResult(
    {
      recommendations: [
        { reference: "A", reason: "a", deepLinkUrl: "" },
        { reference: "A", reason: "a2", deepLinkUrl: "" },
        { reference: "B", reason: "b", deepLinkUrl: "" },
        { reference: "C", reason: "c", deepLinkUrl: "" },
        { reference: "D", reason: "d", deepLinkUrl: "" },
      ],
    },
    candidates
  );
  assert.equal(result.recommendations.length, 3);
  assert.deepEqual(
    result.recommendations.map((r) => r.reference),
    ["A", "B", "C"]
  );
});

// ─── 6. normalizeResult: 잘못된 themes 타입은 빈 배열로 정규화 ────────
test("normalizeResult: themes/tag 배열이 아닌 값은 빈 배열로 정규화한다", () => {
  const result = normalizeResult(
    {
      // @ts-expect-error — 비정상 입력을 의도적으로 주입
      themes: "게으름",
      situationTags: null as unknown as string[],
      emotionTags: [123, "불안", "불안"] as unknown as string[],
      recommendations: [],
    },
    []
  );
  assert.deepEqual(result.themes, []);
  assert.deepEqual(result.situationTags, []);
  assert.deepEqual(result.emotionTags, ["불안"]);
});

function mkCand(ref: string): VerseCandidate {
  return {
    id: ref,
    referenceKo: ref,
    deepLinkUrl: `https://example.test/${ref}`,
    themes: [],
    situationTags: [],
    emotionTags: [],
    summary: null,
    isGeneric: false,
    weight: 10,
  };
}

// ─── 결과 출력 ────────────────────────────────────────────────────────
setTimeout(() => {
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}, 50);
