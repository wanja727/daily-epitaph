import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { epitaphs, cells } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { formatDateKR } from "@/lib/utils/date";
import { REPENT_CATEGORY_LABELS } from "@/lib/utils/constants";
import { CandleIcon, SproutIcon } from "@/app/components/icons";
import PrintButton from "./PrintButton";

export default async function MyPagePrint() {
  const session = await auth();
  const userId = session!.user.id;

  let cellName: string | null = null;
  if (session!.user.cellId) {
    const [cell] = await db
      .select({ name: cells.name })
      .from(cells)
      .where(eq(cells.id, session!.user.cellId))
      .limit(1);
    cellName = cell?.name ?? null;
  }

  const myEpitaphs = await db
    .select({
      id: epitaphs.id,
      yesterday: epitaphs.yesterday,
      today: epitaphs.today,
      date: epitaphs.date,
      repentCategories: epitaphs.repentCategories,
    })
    .from(epitaphs)
    .where(eq(epitaphs.userId, userId))
    .orderBy(asc(epitaphs.date));

  const displayName =
    session!.user.nickname ?? session!.user.name ?? "익명";

  return (
    <div className="px-5 py-5 space-y-5 print-root">
      <style>{`
        @media print {
          html, body, body > div, main {
            background: #f8f3ea !important;
            margin: 0 !important;
            padding: 0 !important;
            min-height: 0 !important;
            max-width: none !important;
          }
          .print-root {
            background: #f8f3ea !important;
            padding: 14mm 12mm !important;
            max-width: none !important;
          }
          nav, .print\\:hidden { display: none !important; }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      <PrintButton />

      <div>
        <div className="text-xs tracking-[0.25em] uppercase text-brown-light">
          Empty Tomb Project
        </div>
        <h1 className="mt-1 text-[24px] leading-tight font-heading font-bold text-brown-dark">
          나의 기록 모음
        </h1>
        <div className="mt-2 text-sm text-brown-mid">
          {displayName}
          {session!.user.realName && (
            <span className="text-brown-light"> · {session!.user.realName}</span>
          )}
          {cellName && <span className="text-brown-light"> · {cellName}</span>}
          <span className="text-brown-light"> · 총 {myEpitaphs.length}일</span>
        </div>
      </div>

      {myEpitaphs.length === 0 ? (
        <div className="text-center py-8 text-brown-light text-sm">
          아직 작성한 기록이 없어요
        </div>
      ) : (
        <div className="space-y-3">
          {myEpitaphs.map((e) => (
            <div
              key={e.id}
              className="rounded-2xl border border-stone bg-white p-4 space-y-3"
            >
              <div className="text-sm font-medium text-brown-dark">
                {formatDateKR(e.date)}
              </div>

              <div className="rounded-2xl bg-[#F7F1E7] p-3">
                <div className="flex items-center gap-1.5">
                  <CandleIcon className="w-3.5 h-3.5 text-brown-light" />
                  <div className="text-[11px] uppercase tracking-[0.18em] text-brown-light">
                    어제를 돌아보며
                  </div>
                </div>
                {e.repentCategories.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {e.repentCategories.map((c) => {
                      const label =
                        REPENT_CATEGORY_LABELS[
                          c as keyof typeof REPENT_CATEGORY_LABELS
                        ] ?? c;
                      return (
                        <span
                          key={c}
                          className="inline-flex rounded-full bg-white/80 px-2.5 py-0.5 text-[11px] font-medium text-[#a4724a]"
                        >
                          {label}
                        </span>
                      );
                    })}
                  </div>
                )}
                <p className="mt-2 text-sm leading-6 text-brown-mid whitespace-pre-line">
                  {e.yesterday}
                </p>
              </div>

              <div className="rounded-2xl bg-sage-light p-3">
                <div className="flex items-center gap-1.5">
                  <SproutIcon className="w-3.5 h-3.5 text-[#6C7A62]" />
                  <div className="text-[11px] uppercase tracking-[0.18em] text-[#6C7A62]">
                    오늘을 기대하며
                  </div>
                </div>
                <p className="mt-2 text-sm leading-6 text-[#4D5B46] whitespace-pre-line">
                  {e.today}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
