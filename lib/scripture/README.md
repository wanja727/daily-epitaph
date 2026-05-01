# 작성자 전용 말씀 추천 (v2)

작성자가 자기 `epitaph`(어제/오늘 카드)에 대해 **원할 때만** Gemini로 2~3개의 성경 말씀을 추천받는 기능. 추천은 작성자 본인에게만 노출된다.

> TODO: 개역개정 원문 직접 저장/노출 전 대한성서공회 저작권 검토 필요.
> 본 시스템은 **장절 메타데이터 + 외부 딥링크**만 저장/노출한다.

## v1 → v2 변경 요약

기존(v1)은 Gemini에게 후보 80개를 전부 넘기고 1회 호출로 분석 + 선택을 동시에 처리했다. 후보 수를 늘려도 토큰 한계로 성능이 더 좋아지지 않았고, 추천이 범용 위로 말씀에 쏠리는 경향이 있었다.

v2는 다음의 **2회 호출 + 검증 구조**로 바뀌었다.

```
사용자 카드
  └── sanitize (이메일/전화/URL/숫자)
        └── 1) Gemini Embedding API → 768차원 벡터
              └── 2) pgvector(verse) cosine search → 후보 24개
                    └── 3) Gemini 생성 모델 → verseId 만 2~3개 선택
                          └── 4) 서버 검증 (후보 밖 폐기 / 다양성 / 길이)
                                └── reference, deepLinkUrl 은 DB 값으로 붙여 저장
```

핵심 의도: 300개 풀을 만드는 이유는 “Gemini 가 300개를 다 읽기 위해서”가 아니라, pgvector 검색 단계에서 **사용자 카드와 의미상 가까운 후보 24개**를 더 잘 뽑기 위해서다. Gemini 생성 모델에는 **항상 24개만** 전달한다.

## 프라이버시 / 저작권 원칙

- 공개 피드: `epitaph` 본문만 노출, `recommendation` 은 절대 포함 금지
- 작성자 판별: nickname 이 아닌 **`epitaph.userId === session.user.id`** 만 사용
- Gemini Embedding / 생성 모델 모두 **반드시 sanitizedText** 만 보낸다 (원문 금지)
- Gemini 는 성경 본문을 **생성하지도 인용하지도** 않는다
- 응답에는 reference, reason, deepLinkUrl 만 포함하며 본문은 절대 포함하지 않는다

## 파일 구조

| 파일 | 설명 |
|---|---|
| [lib/db/schema.ts](../db/schema.ts) | `verse` 에 `embedding(vector 768)`, `embeddingText`, `embeddingModel`, `specificity`, `perspectiveKey`, `avoidTags` 추가 |
| [lib/db/migrations/0008_pgvector_verse_embedding.sql](../db/migrations/0008_pgvector_verse_embedding.sql) | pgvector 확장 + verse 컬럼 + HNSW 인덱스 + `match_verses` RPC |
| [lib/db/seed-verses.ts](../db/seed-verses.ts) | 큐레이션 verse 시드 + Gemini Embedding 자동 생성/스킵 |
| [lib/scripture/sanitize.ts](sanitize.ts) | 민감정보 마스킹 + `buildEpitaphRecommendationText` |
| [lib/scripture/verse-repository.ts](verse-repository.ts) | `findVerseCandidatesByEmbedding`, `buildVerseEmbeddingText`, `compactVerseForPrompt` |
| [lib/scripture/recommendation-service.ts](recommendation-service.ts) | `createScriptureRecommendationForEpitaph`, `normalizeAndValidateRecommendation` |
| [lib/ai/gemini.ts](../ai/gemini.ts) | `embedText`, `selectScriptureRecommendations`, structured output schema |
| [app/api/epitaphs/\[id\]/recommendation/route.ts](../../app/api/epitaphs/[id]/recommendation/route.ts) | 작성자 전용 GET (403 가드) |
| [app/(app)/write/actions.ts](../../app/(app)/write/actions.ts) | `requestScriptureRecommendation: true` 일 때만 추천 생성 |
| [app/(app)/main/page.tsx](../../app/(app)/main/page.tsx) | 작성자 본인 카드에만 `myRecommendation` 주입 |
| [lib/scripture/recommendation.test.ts](recommendation.test.ts) | 단위 테스트 (sanitize, hallucination, 다양성, 누출 방지) |

## 환경변수

```env
DATABASE_URL=postgres://...
GEMINI_API_KEY=...                                    # 필수
GEMINI_EMBEDDING_MODEL=gemini-embedding-001           # 선택 (기본값)
GEMINI_GENERATION_MODEL=gemini-2.5-flash-lite,gemini-2.5-flash,gemini-2.0-flash
                                                      # 선택, 콤마 구분 폴백 체인
SEED_FORCE_REEMBED=1                                  # 선택, seed 실행 시 임베딩 강제 재생성
```

## 셋업

```bash
# 1. 마이그레이션 (drizzle 7번까지 적용 후 8번 적용)
pnpm db:migrate

# Supabase 환경에서 vector extension 권한 이슈가 있으면
# Supabase Studio → Database → Extensions 에서 'vector' 를 enable 한 뒤
# 본 마이그레이션의 ALTER / CREATE INDEX / CREATE FUNCTION 부분만 수동 실행해도 된다.

# 2. 구절 시드 (verse 테이블 row + 임베딩 생성)
npx tsx lib/db/seed-verses.ts

# 임베딩만 다시 만들고 싶을 때 (텍스트는 같은데 모델 바꿨거나, 강제 재생성)
SEED_FORCE_REEMBED=1 npx tsx lib/db/seed-verses.ts
```

> 주의: 시드 1회 실행 시 verse 개수 × 1회 = Gemini Embedding API 호출이 발생한다.
> 동일 `embeddingText` + 동일 모델이면 자동으로 스킵하므로 재실행은 안전하다.

## 사용 흐름

1. 사용자가 카드 작성 시 `requestScriptureRecommendation=true` 인 경우에만 추천 생성.
2. 서버:
   1. `buildEpitaphRecommendationText` 로 카드 텍스트 조립
   2. `sanitizeForGemini` 로 마스킹
   3. `embedText` → 768차원 벡터
   4. `findVerseCandidatesByEmbedding(limit=24)` → 후보 24개
   5. `selectScriptureRecommendations({ sanitizedText, candidates: compactVerseForPrompt(...) })`
      → Gemini 는 **verseId** 만 반환
   6. `normalizeAndValidateRecommendation` 으로 검증
   7. `scripture_recommendation` 테이블에 upsert
3. 작성자는 `GET /api/epitaphs/[id]/recommendation` 으로 본인 추천 조회 (타인은 403).

## fallback 동작

| 단계 | 실패 시 동작 |
|---|---|
| `embedText` 실패 | weight 기반 후보 24개로 fallback (Gemini 생성 호출은 그대로 24개) |
| pgvector 검색 실패 / 결과 0건 | weight 기반 fallback (`fetchVerseCandidates`) |
| Gemini 생성 모델 실패 | 후보 상위 N개를 fallback 추천으로 저장 (reason은 verse.summary 기반) |
| 후보가 0건 | throw — verse 시드를 먼저 실행해야 한다 |
| 카드 저장 자체 | 추천 실패와 무관하게 항상 성공해야 함 (try/catch) |

## 서버 검증 (`normalizeAndValidateRecommendation`)

Gemini 응답을 그대로 저장하지 않고 다음을 적용한다.

1. `verseId` 가 candidates 안에 없는 항목 폐기 (hallucination 방지)
2. 동일 `verseId` 중복 제거
3. 동일 `perspectiveKey` 중복 시 1개만 유지
4. `isGeneric=true` 인 추천은 최대 1개
5. 최대 3개까지만 유지
6. `reason` 길이 12~60자로 정규화. 비어 있거나 너무 짧으면 `verse.summary` 로 fallback
7. 최종 `reference` / `deepLinkUrl` 은 Gemini 가 아니라 **DB 의 candidate 값**으로 붙여 저장
8. 추천이 1개 이하로 남으면 후보 상위에서 다양성 규칙을 지켜 채움

## 테스트

```bash
npx tsx lib/scripture/recommendation.test.ts
```

DB / Gemini 를 타지 않는 순수 함수 / 검증 로직만 검사한다.

| # | 케이스 |
|---|---|
| 1 | sanitize: 이메일/전화/URL/긴 숫자열 마스킹 |
| 2 | sanitize: 평범한 한국어 미훼손 |
| 3 | buildEpitaphRecommendationText: 어제/오늘 섹션 포맷 |
| 4 | shallowCleanAiResult: 비정상 입력 정규화 |
| 5 | candidates 안의 verseId 만 통과 (hallucination 폐기) |
| 6 | isGeneric 쏠림 방지 |
| 7 | perspectiveKey 중복 제거 |
| 8 | reason 길이 정규화 + 빈 reason fallback |
| 9 | 최대 3개 |
| 10 | buildVerseEmbeddingText: 본문이 포함되지 않음 |
| 11 | 공개 피드 응답에 recommendation 키가 없음 |

## 하지 말 것

- ❌ 개역개정 원문(본문)을 DB 에 저장
- ❌ 응답에 본문 포함
- ❌ Gemini 에게 `deepLinkUrl` 보내기 (Gemini 가 링크를 만들면 안 됨)
- ❌ `recommendation` 을 공개 피드 API 응답에 포함
- ❌ Gemini 에 300개 후보 모두 전달 (항상 24개)
- ❌ 사용자 요청마다 verse 임베딩 재생성 (seed/admin 시점에만)
- ❌ "하나님이 반드시 … 하신다" 같은 예언적 단정 표현
- ❌ nickname 으로 작성자 판별 (반드시 `userId`)

## 보안 메모: 공개 피드 누출 방지

`app/(app)/main/page.tsx` 의 `myRecommendation` 은 **본인 epitaph 1건**에만 채워지고, `FeedTabs` 에서도 `e.userId === myUserId` 일 때만 렌더링된다.
서버에서 다른 사용자의 추천을 SELECT 하지 않으므로 응답 페이로드에 타인 추천이 섞일 수 없다.

API 라우트 `GET /api/epitaphs/[id]/recommendation` 은 `epitaph.userId !== session.user.id` 이면 403 을 반환한다. 본인이 아니라면 본문도 데이터도 절대 반환하지 않는다.
