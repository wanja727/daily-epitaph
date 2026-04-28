# 작성자 전용 말씀 추천 MVP

작성자가 자기 `epitaph`(회개/결단 카드)에 대해 **원할 때만** Gemini로 2~3개의 성경 말씀을 추천받는 기능.

> TODO: 개역개정 원문 직접 저장/노출 전 대한성서공회 저작권 검토 필요.
> 현재는 **장절 메타데이터 + 외부 딥링크**만 저장/노출한다.

## 프라이버시 원칙

- 공개 피드: `epitaph` 본문만 노출, `recommendation`은 절대 포함 금지
- 말씀 추천: 작성자 본인만 조회 가능 (`epitaph.userId === session.user.id`)
- Gemini 전송 전 이메일/전화/URL/긴 숫자열을 sanitize → [lib/scripture/sanitize.ts](sanitize.ts)

## 파일 구조

| 파일 | 설명 |
|---|---|
| [lib/db/schema.ts](../db/schema.ts) | `epitaph` 컬럼 추가, `verse`, `scripture_recommendation` 테이블 |
| [lib/db/migrations/0007_scripture_recommendation.sql](../db/migrations/0007_scripture_recommendation.sql) | 마이그레이션 |
| [lib/db/seed-verses.ts](../db/seed-verses.ts) | 70+ 큐레이션 구절 시드 |
| [lib/scripture/sanitize.ts](sanitize.ts) | 민감정보 마스킹 + 카드 텍스트 조합 |
| [lib/scripture/verse-repository.ts](verse-repository.ts) | 추천 후보 조회 |
| [lib/scripture/recommendation-service.ts](recommendation-service.ts) | 생성/조회 서비스 |
| [lib/ai/gemini.ts](../ai/gemini.ts) | Gemini REST 호출 + JSON 파서/정규화 |
| [app/api/epitaphs/\[id\]/recommendation/route.ts](../../app/api/epitaphs/[id]/recommendation/route.ts) | 작성자 전용 GET |
| [app/(app)/write/actions.ts](../../app/(app)/write/actions.ts) | `upsertEpitaph` — `requestScriptureRecommendation` opt-in |
| [lib/scripture/recommendation.test.ts](recommendation.test.ts) | 단위 테스트 |

## 셋업

```bash
# 1. 마이그레이션
pnpm db:migrate

# 2. 구절 시드 (최초 1회)
npx tsx lib/db/seed-verses.ts

# 3. 환경변수
GEMINI_API_KEY=...           # 필수
GEMINI_MODEL=gemini-1.5-flash-latest  # 선택
```

## 사용 흐름

1. 사용자가 카드를 작성할 때 `requestScriptureRecommendation=true` 체크박스를 켠 경우에만 Gemini 호출.
2. 서버는 `yesterday`/`today`를 `buildCardText`로 조합하고 `sanitizeCardText`로 마스킹.
3. `verses` 테이블에서 weight 내림차순으로 후보 80개를 조회.
4. Gemini에 **1회** 호출 — themes/situationTags/emotionTags/recommendations를 한 번에 받는다.
5. `scripture_recommendation` 테이블에 upsert.
6. 이후 작성자는 `GET /api/epitaphs/[id]/recommendation` 으로 본인 추천을 조회.

## 샘플 요청/응답

### 작성 (Server Action)

```ts
const formData = new FormData();
formData.set("yesterday", "게으름의 고리를 끊고 싶습니다.");
formData.set("today", "요즘 계속 불안과 답답함의 연속이었는데 ...");
formData.set("requestScriptureRecommendation", "true");
await upsertEpitaph(formData);
```

### 조회: `GET /api/epitaphs/{epitaphId}/recommendation`

**작성자 본인 (200)**
```json
{
  "epitaphId": "0c...",
  "isAuthor": true,
  "themes": ["게으름", "기도", "하나님의뜻"],
  "situationTags": ["생활질서무너짐", "무기력", "회사어려움"],
  "emotionTags": ["불안", "답답함"],
  "recommendations": [
    {
      "reference": "잠언 24:30-34",
      "reason": "무너진 생활의 자리를 다시 돌아보게 합니다.",
      "deepLinkUrl": "https://bible.bskorea.or.kr/bible/NKRV/PRO.24.30"
    },
    {
      "reference": "빌립보서 4:6-7",
      "reason": "불안한 마음을 기도와 감사로 올려드리게 합니다.",
      "deepLinkUrl": "https://bible.bskorea.or.kr/bible/NKRV/PHP.4.6"
    },
    {
      "reference": "야고보서 4:13-15",
      "reason": "내 계획보다 주님의 뜻에 맡기게 합니다.",
      "deepLinkUrl": "https://bible.bskorea.or.kr/bible/NKRV/JAS.4.13"
    }
  ]
}
```

**타인이 조회하면 403**
```json
{ "error": "forbidden" }
```

**추천을 요청하지 않은 경우 (본인, 200)**
```json
{
  "epitaphId": "0c...",
  "isAuthor": true,
  "themes": [],
  "situationTags": [],
  "emotionTags": [],
  "recommendations": []
}
```

## 테스트

```bash
npx tsx lib/scripture/recommendation.test.ts
```

DB/Gemini를 타지 않는 순수 함수만 검증한다(총 6 케이스).

## 하지 말 것

- ❌ 개역개정 원문(본문)을 DB에 저장
- ❌ `recommendation`을 공개 피드 API 응답에 포함
- ❌ polling / queue / cron / worker 같은 비동기 구조
- ❌ pgvector / 임베딩 기반 검색
- ❌ "하나님이 반드시 … 하신다" 같은 예언적 단정 문장
