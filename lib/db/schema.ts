import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  date,
  primaryKey,
  unique,
} from "drizzle-orm/pg-core";
import type { AdapterAccountType } from "next-auth/adapters";

// ─── Auth.js required tables ───────────────────────────────────────────────

export const users = pgTable("user", {
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
});

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
export const cellMembers = pgTable("cell_member", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  cellId: text("cellId")
    .notNull()
    .references(() => cells.id, { onDelete: "cascade" }),
  name: text("name").notNull(), // 실명
});

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
    createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull(),
  },
  (epitaph) => [unique().on(epitaph.userId, epitaph.date)]
);

/** 아멘(공감) 이력 */
export const epitaphAmens = pgTable(
  "epitaph_amen",
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
    createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  },
  (amen) => [unique().on(amen.epitaphId, amen.userId)]
);

// ─── 꽃 키우기 ──────────────────────────────────────────────────────────────

export const flowers = pgTable("flower", {
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
});

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
  (plot) => [unique().on(plot.cellId, plot.slot)]
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
  (visit) => [unique().on(visit.userId, visit.date)]
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
