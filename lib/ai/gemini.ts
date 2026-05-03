/**
 * Gemini 무료 버전 최소 연동.
 * 외부 SDK 없이 REST API를 직접 호출한다.
 *
 * 두 가지 책임을 분리한다.
 *   1. embedText            — 텍스트 → 벡터(768) 변환 (Gemini Embedding API)
 *   2. selectScriptureRecommendations — 후보(20~24개)에서 최종 2~3개 선택
 *
 * 절대 규칙:
 * - Gemini 에 보내는 카드 텍스트는 반드시 sanitizedText 여야 한다.
 * - Gemini 생성 모델은 성경 본문을 생성하거나 인용하지 않는다.
 * - Gemini 응답은 반드시 verseId 만 받고, reference / deepLinkUrl 은 서버에서 DB 값을 붙인다.
 *
 * TODO: 개역개정 원문 직접 저장/노출 전 대한성서공회 저작권 검토 필요
 */

// ─── 환경 / 모델 설정 ──────────────────────────────────────────────────────

// 생성 모델: 콤마 구분 폴백 체인. 첫 모델이 503/429 등 일시 오류면 다음 모델로 시도.
const DEFAULT_GENERATION_MODEL_CHAIN =
  "gemini-2.5-flash-lite,gemini-2.5-flash,gemini-2.0-flash";
function getGenerationModelChain(): string[] {
  const env =
    process.env.GEMINI_GENERATION_MODEL ??
    process.env.GEMINI_MODEL ??
    DEFAULT_GENERATION_MODEL_CHAIN;
  return env
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

const DEFAULT_EMBEDDING_MODEL = "gemini-embedding-001";
function getEmbeddingModel(): string {
  return process.env.GEMINI_EMBEDDING_MODEL ?? DEFAULT_EMBEDDING_MODEL;
}

const GENERATE_ENDPOINT = (model: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

const EMBED_ENDPOINT = (model: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent`;

const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

const EMBEDDING_DIMENSIONS = 768;

// ─── 타입 ─────────────────────────────────────────────────────────────────

export type CompactVerseCandidate = {
  id: string;
  ref: string;
  th: string[];
  st: string[];
  em: string[];
  sum?: string | null;
  sp: number;
  pk?: string | null;
  /** 말씀 톤 (권면/회복/결단/위로/소망/감사/지혜/책망). null=미분류. */
  tn?: string | null;
};

export type AiRecommendationResult = {
  themes: string[];
  situationTags: string[];
  emotionTags: string[];
  recommendations: Array<{
    verseId: string;
    reason: string;
  }>;
};

// ─── 1. embedText ─────────────────────────────────────────────────────────

/**
 * Gemini Embedding API 호출.
 * 입력은 sanitize 된 텍스트만 받는다. 빈 문자열이면 즉시 에러.
 */
export async function embedText(
  text: string,
  opts: { apiKey?: string; fetchImpl?: typeof fetch; model?: string } = {}
): Promise<number[]> {
  const trimmed = (text ?? "").trim();
  if (!trimmed) throw new Error("embedText: 입력 텍스트가 비어 있습니다.");

  const apiKey = opts.apiKey ?? process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY가 설정되어 있지 않습니다.");

  const model = opts.model ?? getEmbeddingModel();
  const f = opts.fetchImpl ?? fetch;

  const body = {
    model: `models/${model}`,
    content: { parts: [{ text: trimmed }] },
    outputDimensionality: EMBEDDING_DIMENSIONS,
  };

  const res = await f(`${EMBED_ENDPOINT(model)}?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(
      `Gemini embed 호출 실패 ${res.status} (model=${model}): ${errText.slice(0, 300)}`
    );
  }

  const payload = (await res.json()) as {
    embedding?: { values?: number[] };
  };
  const values = payload.embedding?.values;
  if (!Array.isArray(values) || values.length === 0) {
    throw new Error("Gemini embed 응답이 비정상입니다.");
  }
  if (values.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(
      `Gemini embed 차원 불일치: expected ${EMBEDDING_DIMENSIONS}, got ${values.length}`
    );
  }
  return values;
}

// ─── 2. selectScriptureRecommendations ────────────────────────────────────

function buildSelectionPrompt(
  sanitizedText: string,
  candidates: CompactVerseCandidate[]
): string {
  const candidateJson = JSON.stringify(candidates, null, 0);

  return [
    "너는 한국 교회 큐레이터다. 사용자의 회개/결단 카드를 읽고 candidates 안에서만 2~3개를 선택한다.",
    "이 카드의 작성자는 이미 자기 부족을 인지하고 회개/결단의 마음으로 글을 쓴 사람이다.",
    "추천의 목적은 같은 죄를 다시 정죄하거나 단죄하는 것이 아니라, 회복과 돌이킴의 자리에 함께 서도록 돕는 것이다.",
    "",
    "절대 규칙:",
    "- 너는 성경 본문을 생성하거나 인용하지 않는다.",
    "- 반드시 candidates 안의 id 중에서만 선택한다.",
    "- 후보 밖 구절을 추천하지 않는다.",
    "- 사용자의 회개/결단 카드와 직접 연결되는 말씀을 고른다.",
    "- 너무 범용적인 위로 말씀(sp <= 2)만 연속으로 고르지 않는다.",
    "- 가능하면 perspectiveKey(pk)가 서로 다른 후보를 고른다.",
    "- 서로 다른 관점을 담는다.",
    "- tn=\"책망\" 인 후보는 가능한 한 선택하지 않는다. 카드 작성자가 이미 자기 부족을 고백·회개하는 톤이라면 절대 선택하지 않는다. 다만 카드 본문이 명백한 죄를 회피·정당화하는 경우에 한해 예외적으로 1개까지 허용한다.",
    "- 가능하면 tn=\"회복\"/\"위로\"/\"권면\"/\"소망\" 톤을 우선해서 회복과 돌이킴의 방향을 제시한다. tn 이 모두 같지 않도록 톤도 적절히 섞는다.",
    "- reason 은 20~45자 한 문장.",
    "- 훈계조/정죄조/예언적 단정 표현 금지.",
    "- '하나님이 반드시 … 하신다' 같은 단정 표현 금지.",
    "- 출력은 JSON 객체 하나만. 설명/마크다운/코드블럭 금지.",
    "",
    "후보 객체 키 의미:",
    "id=verseId, ref=장절(읽기 전용 참고), th=themes, st=situationTags, em=emotionTags,",
    "sum=추천 상황 설명, sp=구체성(1-5, 5=특정 상황 적합), pk=perspectiveKey,",
    "tn=tone (권면/회복/결단/위로/소망/감사/지혜/책망)",
    "",
    "출력 JSON 스키마:",
    '{"themes": string[], "situationTags": string[], "emotionTags": string[],',
    ' "recommendations": [{"verseId": string, "reason": string}]}',
    "",
    "themes / situationTags / emotionTags 는 카드에서 파악한 핵심을 각각 최대 5개의 짧은 한국어 단어로 추출하라.",
    "",
    "사용자 카드(마스킹 처리 완료):",
    "<<<CARD",
    sanitizedText,
    "CARD>>>",
    "",
    "candidates JSON:",
    candidateJson,
  ].join("\n");
}

// Gemini structured output schema (responseSchema)
const SELECTION_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    themes: { type: "array", items: { type: "string" } },
    situationTags: { type: "array", items: { type: "string" } },
    emotionTags: { type: "array", items: { type: "string" } },
    recommendations: {
      type: "array",
      items: {
        type: "object",
        properties: {
          verseId: { type: "string" },
          reason: { type: "string" },
        },
        required: ["verseId", "reason"],
      },
    },
  },
  required: ["themes", "situationTags", "emotionTags", "recommendations"],
};

export async function selectScriptureRecommendations(input: {
  sanitizedText: string;
  candidates: CompactVerseCandidate[];
  apiKey?: string;
  fetchImpl?: typeof fetch;
}): Promise<AiRecommendationResult> {
  const { sanitizedText, candidates } = input;
  if (!sanitizedText?.trim()) {
    throw new Error("selectScriptureRecommendations: sanitizedText가 비어 있습니다.");
  }
  if (!Array.isArray(candidates) || candidates.length === 0) {
    throw new Error("selectScriptureRecommendations: candidates가 비어 있습니다.");
  }

  const apiKey = input.apiKey ?? process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY가 설정되어 있지 않습니다.");

  const prompt = buildSelectionPrompt(sanitizedText, candidates);
  const body = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.4,
      responseMimeType: "application/json",
      responseSchema: SELECTION_RESPONSE_SCHEMA,
    },
  };

  const f = input.fetchImpl ?? fetch;
  const models = getGenerationModelChain();
  let lastErr: Error | null = null;

  for (const model of models) {
    try {
      const res = await f(
        `${GENERATE_ENDPOINT(model)}?key=${encodeURIComponent(apiKey)}`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        }
      );

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        const err = new Error(
          `Gemini 호출 실패 ${res.status} (model=${model}): ${errText.slice(0, 300)}`
        );
        if (RETRYABLE_STATUS.has(res.status)) {
          lastErr = err;
          continue;
        }
        throw err;
      }

      const payload = (await res.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
      const text = payload.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
      const parsed = extractJson(text) as Partial<AiRecommendationResult>;
      return shallowCleanAiResult(parsed);
    } catch (err) {
      lastErr = err instanceof Error ? err : new Error(String(err));
    }
  }

  throw lastErr ?? new Error("Gemini 호출 실패: 모든 모델 시도 실패");
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

/**
 * Gemini 응답의 1차 정규화. 타입/형태만 맞추고,
 * candidates 와의 검증은 server 측 normalizeAndValidateRecommendation 에서 수행한다.
 */
export function shallowCleanAiResult(
  parsed: Partial<AiRecommendationResult> | null | undefined
): AiRecommendationResult {
  return {
    themes: uniqStrings(parsed?.themes),
    situationTags: uniqStrings(parsed?.situationTags),
    emotionTags: uniqStrings(parsed?.emotionTags),
    recommendations: Array.isArray(parsed?.recommendations)
      ? parsed!.recommendations
          .map((r) => ({
            verseId:
              r && typeof r === "object" && typeof r.verseId === "string"
                ? r.verseId.trim()
                : "",
            reason:
              r && typeof r === "object" && typeof r.reason === "string"
                ? r.reason.trim()
                : "",
          }))
          .filter((r) => r.verseId)
      : [],
  };
}

function uniqStrings(v: unknown, max = 8): string[] {
  if (!Array.isArray(v)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const x of v) {
    if (typeof x !== "string") continue;
    const s = x.trim();
    if (!s || seen.has(s)) continue;
    seen.add(s);
    out.push(s);
    if (out.length >= max) break;
  }
  return out;
}
