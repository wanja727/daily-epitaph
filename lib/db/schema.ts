import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  date,
  primaryKey,
  unique,
  index,
  jsonb,
  customType,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import type { AdapterAccountType } from "next-auth/adapters";

// pgvector — drizzle-orm 0.45 의 안정적 vector 타입을 위해 customType 으로 정의.
// 저장 시 number[] → "[v1,v2,...]" 문자열로 직렬화하고, 조회 시 그 반대로 파싱한다.
const vector = customType<{ data: number[]; driverData: string; config: { dimensions: number } }>({
  dataType(config) {
    return `vector(${config?.dimensions ?? 768})`;
  },
  toDriver(value: number[]): string {
    return `[${value.join(",")}]`;
  },
  fromDriver(value: string): number[] {
    if (Array.isArray(value)) return value as unknown as number[];
    if (typeof value !== "string" || value.length === 0) return [];
    return value
      .replace(/^\[/, "")
      .replace(/\]$/, "")
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isFinite(n));
  },
});

// ─── Auth.js required tables ───────────────────────────────────────────────

export const users = pgTable(
  "user",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: text("name"), // 카카오 프로필 닉네임 (Auth.js가 자동 저장)
    email: text("email").unique(),
    emailVerified: timestamp("emailVerified", { mode: "date" }),
    image: text("image"),
    // ─── 앱 커스텀 필드 ──────
    realName: text("realName"),
    nickname: text("nickname"),
    cellId: text("cellId").references(() => cells.id),
    onboardingCompleted: boolean("onboardingCompleted").default(false).notNull(),
    isAdmin: boolean("isAdmin").default(false).notNull(),
  },
  (user) => [
    index("user_cellId_idx").on(user.cellId),
  ]
);

export const accounts = pgTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [
    primaryKey({ columns: [account.provider, account.providerAccountId] }),
  ]
);

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => [primaryKey({ columns: [vt.identifier, vt.token] })]
);

// ─── 셀(소그룹) ────────────────────────────────────────────────────────────

export const cells = pgTable("cell", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
});

/** 셀 소속 명단 (사전 등록, 실명 매칭용) */
export const cellMembers = pgTable(
  "cell_member",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    cellId: text("cellId")
      .notNull()
      .references(() => cells.id, { onDelete: "cascade" }),
    name: text("name").notNull(), // 실명
  },
  (member) => [
    index("cell_member_name_idx").on(member.name),
  ]
);

// ─── 묘비명 ─────────────────────────────────────────────────────────────────

export const epitaphs = pgTable(
  "epitaph",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    yesterday: text("yesterday").notNull(),
    today: text("today").notNull(),
    date: date("date").notNull(),
    amenCount: integer("amenCount").default(0).notNull(),
    requestScriptureRecommendation: boolean("requestScriptureRecommendation")
      .default(false)
      .notNull(),
    recommendationUpdatedAt: timestamp("recommendationUpdatedAt", { mode: "date" }),
    createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull(),
  },
  (epitaph) => [
    unique().on(epitaph.userId, epitaph.date),
    index("epitaph_date_idx").on(epitaph.date),
    index("epitaph_userId_idx").on(epitaph.userId),
  ]
);

/** 공감 반응 이력 */
export const epitaphReactions = pgTable(
  "epitaph_reaction",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    epitaphId: text("epitaphId")
      .notNull()
      .references(() => epitaphs.id, { onDelete: "cascade" }),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(), // amen, pray, cheer, touch, smile, surprise
    createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  },
  (r) => [
    unique().on(r.epitaphId, r.userId),
    index("epitaph_reaction_epitaphId_idx").on(r.epitaphId),
    index("epitaph_reaction_userId_idx").on(r.userId),
  ]
);

// ─── 성경 말씀 추천 (작성자 전용) ────────────────────────────────────────────
// TODO: 개역개정 원문 직접 저장/노출 전 대한성서공회 저작권 검토 필요

/** 큐레이션된 추천 후보 장절 메타데이터. 본문은 저장하지 않는다. */
export const verses = pgTable(
  "verse",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    referenceKo: text("referenceKo").notNull(), // 예: "잠언 24:30-34"
    bookAbbrEn: text("bookAbbrEn").notNull(), // 예: "PRO"
    chapter: integer("chapter").notNull(),
    verseStart: integer("verseStart").notNull(),
    verseEnd: integer("verseEnd"),
    deepLinkUrl: text("deepLinkUrl").notNull(),
    themes: text("themes").array().notNull().default(sql`ARRAY[]::text[]`),
    situationTags: text("situationTags")
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    emotionTags: text("emotionTags")
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    summary: text("summary"),
    weight: integer("weight").default(0).notNull(),
    isGeneric: boolean("isGeneric").default(false).notNull(),
    // ─── 임베딩/관점 메타 ─────────────────────────────────────────
    embeddingText: text("embeddingText"),
    embedding: vector("embedding", { dimensions: 768 }),
    embeddingModel: text("embeddingModel"),
    specificity: integer("specificity").default(3).notNull(),
    perspectiveKey: text("perspectiveKey"),
    avoidTags: text("avoidTags").array().notNull().default(sql`ARRAY[]::text[]`),
    /**
     * 말씀 톤. Gemini 선택 단계에서 책망 톤을 회피하기 위한 구조 필드.
     * 값: 권면 | 회복 | 결단 | 위로 | 소망 | 감사 | 지혜 | 책망
     */
    tone: text("tone"),
  },
  (v) => [
    unique().on(v.bookAbbrEn, v.chapter, v.verseStart, v.verseEnd),
    index("verse_bookAbbrEn_idx").on(v.bookAbbrEn),
    index("verse_perspectiveKey_idx").on(v.perspectiveKey),
    index("verse_isGeneric_idx").on(v.isGeneric),
    index("verse_tone_idx").on(v.tone),
  ]
);

/** epitaph 1건에 대한 작성자 전용 추천 결과 */
export const scriptureRecommendations = pgTable(
  "scripture_recommendation",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    epitaphId: text("epitaphId")
      .notNull()
      .unique()
      .references(() => epitaphs.id, { onDelete: "cascade" }),
    themes: jsonb("themes").$type<string[]>().notNull().default([]),
    situationTags: jsonb("situationTags").$type<string[]>().notNull().default([]),
    emotionTags: jsonb("emotionTags").$type<string[]>().notNull().default([]),
    recommendations: jsonb("recommendations")
      .$type<
        Array<{ reference: string; reason: string; deepLinkUrl: string }>
      >()
      .notNull()
      .default([]),
    createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull(),
  }
);

// ─── 꽃 키우기 ──────────────────────────────────────────────────────────────

export const flowers = pgTable(
  "flower",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(), // flower type id (tulip, rose, ...)
    stage: integer("stage").default(1).notNull(), // 1=새싹, 2=봉우리, 3=꽃
    waterCount: integer("waterCount").default(0).notNull(),
    completedAt: timestamp("completedAt", { mode: "date" }),
    placedInGarden: boolean("placedInGarden").default(false).notNull(),
    createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  },
  (flower) => [
    index("flower_userId_idx").on(flower.userId),
  ]
);

/** 셀 공동 꽃밭 — 슬롯 기반 자동 배치 */
export const gardenPlots = pgTable(
  "garden_plot",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    cellId: text("cellId")
      .notNull()
      .references(() => cells.id, { onDelete: "cascade" }),
    slot: integer("slot").notNull(),
    flowerId: text("flowerId")
      .notNull()
      .references(() => flowers.id),
    placedBy: text("placedBy")
      .notNull()
      .references(() => users.id),
    placedAt: timestamp("placedAt", { mode: "date" }).defaultNow().notNull(),
  },
  (plot) => [
    unique().on(plot.cellId, plot.slot),
    index("garden_plot_cellId_idx").on(plot.cellId),
  ]
);

/** 일별 방문 기록 */
export const dailyVisits = pgTable(
  "daily_visit",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  },
  (visit) => [
    unique().on(visit.userId, visit.date),
    index("daily_visit_date_idx").on(visit.date),
  ]
);

/** 물뿌리개 보유량 */
export const wateringCans = pgTable("watering_can", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" })
    .unique(),
  count: integer("count").default(0).notNull(),
});
