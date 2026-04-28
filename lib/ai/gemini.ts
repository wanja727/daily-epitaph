/**
 * Gemini 무료 버전 최소 연동.
 * 외부 SDK 없이 REST API를 직접 호출한다.
 *
 * TODO: 개역개정 원문 직접 저장/노출 전 대한성서공회 저작권 검토 필요
 */

import type { VerseCandidate } from "@/lib/scripture/verse-repository";

// 콤마로 구분된 폴백 체인을 받는다. 첫 모델이 503/429 등 일시적 오류면 다음 모델로 즉시 시도.
// 환경변수 미설정 시 기본 체인 사용. 사용 가능한 모델: https://ai.google.dev/gemini-api/docs/models
const DEFAULT_MODEL_CHAIN = "gemini-2.5-flash,gemini-2.5-flash-lite,gemini-2.0-flash";
function getModelChain(): string[] {
  return (process.env.GEMINI_MODEL ?? DEFAULT_MODEL_CHAIN)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
const endpointFor = (model: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

export type GeminiRecommendation = {
  reference: string;
  reason: string;
  deepLinkUrl: string;
};

export type GeminiRecommendationResult = {
  themes: string[];
  situationTags: string[];
  emotionTags: string[];
  recommendations: GeminiRecommendation[];
};

type CandidateLite = Pick<
  VerseCandidate,
  "referenceKo" | "deepLinkUrl" | "themes" | "situationTags" | "emotionTags" | "summary" | "isGeneric"
>;

function buildPrompt(sanitizedText: string, candidates: CandidateLite[]): string {
  const candidateJson = JSON.stringify(
    candidates.map((c) => ({
      reference: c.referenceKo,
      deepLinkUrl: c.deepLinkUrl,
      themes: c.themes,
      situationTags: c.situationTags,
      emotionTags: c.emotionTags,
      summary: c.summary ?? "",
      isGeneric: c.isGeneric,
    })),
    null,
    0
  );

  return [
    "당신은 한국 교회의 큐레이터입니다. 사용자의 회개/결단 카드를 읽고",
    "아래 후보 구절 JSON 중에서만 2~3개의 말씀을 골라 추천합니다.",
    "",
    "반드시 지켜야 할 규칙:",
    "- 성경 원문(본문)을 절대 생성하지 마세요. reference/deepLinkUrl은 반드시 후보 배열의 값 그대로 사용하세요.",
    "- 후보에 없는 구절은 절대 만들지 마세요.",
    "- themes / situationTags / emotionTags 는 카드에서 파악한 핵심을 3~6개 짧은 한국어 단어로 추출하세요.",
    "- 추천 2~3개는 서로 다른 관점(예: 생활질서/불안/기도결단/순종)을 담으세요.",
    "- 같은 의미의 말씀을 중복 추천하지 마세요.",
    "- isGeneric=true 구절만 연속으로 고르지 마세요.",
    "- 각 reason은 20~45자 내외 한 문장. 훈계조/정죄조/예언적 단정 문장 금지.",
    "- '하나님이 반드시 … 하신다' 같은 단정 표현을 쓰지 마세요.",
    "- 출력은 JSON 객체 하나만. 설명/마크다운/코드블럭 금지.",
    "",
    "출력 JSON 스키마:",
    '{"themes": string[], "situationTags": string[], "emotionTags": string[], "recommendations": [{"reference": string, "reason": string, "deepLinkUrl": string}]}',
    "",
    "사용자 카드(마스킹 처리 완료):",
    "<<<CARD",
    sanitizedText,
    "CARD>>>",
    "",
    "후보 구절 JSON:",
    candidateJson,
  ].join("\n");
}

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenced ? fenced[1] : trimmed;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("Gemini: JSON 응답을 찾을 수 없습니다.");
  return JSON.parse(raw.slice(start, end + 1));
}

export async function recommendScripturesWithGemini(
  sanitizedText: string,
  candidates: VerseCandidate[],
  opts: { apiKey?: string; fetchImpl?: typeof fetch } = {}
): Promise<GeminiRecommendationResult> {
  const apiKey = opts.apiKey ?? process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY가 설정되어 있지 않습니다.");

  const prompt = buildPrompt(sanitizedText, candidates);
  const body = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.4,
      responseMimeType: "application/json",
    },
  };

  const f = opts.fetchImpl ?? fetch;
  const models = getModelChain();
  let lastErr: Error | null = null;

  for (const model of models) {
    try {
      const res = await f(`${endpointFor(model)}?key=${encodeURIComponent(apiKey)}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        const err = new Error(
          `Gemini 호출 실패 ${res.status} (model=${model}): ${errText.slice(0, 300)}`
        );
        if (RETRYABLE_STATUS.has(res.status)) {
          lastErr = err;
          continue; // 다음 모델로
        }
        throw err; // 404/401/400 등 hard error 는 즉시 종료
      }

      const payload = (await res.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
      const text = payload.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
      const parsed = extractJson(text) as Partial<GeminiRecommendationResult>;
      return normalizeResult(parsed, candidates);
    } catch (err) {
      // network error 등 fetch 단계 예외 — 다음 모델로 폴백
      lastErr = err instanceof Error ? err : new Error(String(err));
    }
  }

  throw lastErr ?? new Error("Gemini 호출 실패: 모든 모델 시도 실패");
}

export function normalizeResult(
  parsed: Partial<GeminiRecommendationResult> | null | undefined,
  candidates: VerseCandidate[]
): GeminiRecommendationResult {
  const byRef = new Map(candidates.map((c) => [c.referenceKo, c]));
  const recommendations: GeminiRecommendation[] = [];
  const seen = new Set<string>();

  for (const r of parsed?.recommendations ?? []) {
    if (!r || typeof r !== "object") continue;
    const ref = String(r.reference ?? "").trim();
    const reason = String(r.reason ?? "").trim();
    if (!ref || !reason) continue;
    if (seen.has(ref)) continue;
    const cand = byRef.get(ref);
    if (!cand) continue; // hallucinated references 차단
    seen.add(ref);
    recommendations.push({
      reference: ref,
      reason: reason.slice(0, 80),
      deepLinkUrl: cand.deepLinkUrl,
    });
    if (recommendations.length >= 3) break;
  }

  return {
    themes: uniqStrings(parsed?.themes),
    situationTags: uniqStrings(parsed?.situationTags),
    emotionTags: uniqStrings(parsed?.emotionTags),
    recommendations,
  };
}

function uniqStrings(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const x of v) {
    if (typeof x !== "string") continue;
    const s = x.trim();
    if (!s || seen.has(s)) continue;
    seen.add(s);
    out.push(s);
    if (out.length >= 8) break;
  }
  return out;
}
