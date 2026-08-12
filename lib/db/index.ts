import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * 접속할 DB 를 결정한다.
 *
 * 기본값은 `DATABASE_URL` (배포 환경은 항상 이 값만 사용).
 * 로컬 개발 환경에 한해 `.env.local` 의 `DB_TARGET` 으로 전환할 수 있다.
 *   DB_TARGET=prod → DATABASE_URL_PROD  (운영 데이터로 화면 확인/캡처용)
 *   DB_TARGET=dev  → DATABASE_URL_DEV
 */
function resolveDatabaseUrl(): string {
  const target = process.env.DB_TARGET;

  if (process.env.NODE_ENV !== "production" && target) {
    const url =
      target === "prod"
        ? process.env.DATABASE_URL_PROD
        : target === "dev"
          ? process.env.DATABASE_URL_DEV
          : undefined;

    if (!url) {
      throw new Error(
        `DB_TARGET=${target} 에 해당하는 DATABASE_URL_${target.toUpperCase()} 가 .env.local 에 없습니다.`,
      );
    }

    // 어떤 DB 에 붙는지 콘솔에서 바로 확인 (운영 DB 오접속 방지)
    console.warn(
      `[db] DB_TARGET=${target} → ${new URL(url.replace(/^postgresql:/, "http:")).host}` +
        (target === "prod" ? "  ⚠️ 운영 DB 에 연결되었습니다" : ""),
    );
    return url;
  }

  return process.env.DATABASE_URL!;
}

// prepare: false required for Supabase transaction pooler
const client = postgres(resolveDatabaseUrl(), { prepare: false });
export const db = drizzle(client, { schema });
