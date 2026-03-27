"use client";

import { getTodayKST } from "@/lib/utils/date";

export default function AttendanceGrid({
  startDate,
  totalDays,
  attendedDates,
}: {
  startDate: string;
  totalDays: number;
  attendedDates: Set<string>;
}) {
  const today = getTodayKST();
  const start = new Date(startDate);

  const days = Array.from({ length: totalDays }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split("T")[0];
    const dayNum = i + 1;
    const isToday = dateStr === today;
    const attended = attendedDates.has(dateStr);
    const isPast = dateStr < today;
    const isFuture = dateStr > today;

    return { dayNum, dateStr, isToday, attended, isPast, isFuture };
  });

  return (
    <div className="rounded-2xl bg-white/[0.04] border border-white/[0.06] p-4">
      <div className="grid grid-cols-8 gap-1.5">
        {days.map((d) => (
          <div
            key={d.dayNum}
            className={`aspect-square rounded-lg flex items-center justify-center text-xs font-medium transition-colors ${
              d.attended
                ? "bg-accent/30 text-accent-bright border border-accent/40"
                : d.isToday
                ? "bg-white/10 text-white border border-white/20 ring-1 ring-accent/50"
                : d.isPast
                ? "bg-white/[0.02] text-slate-600 border border-white/[0.04]"
                : "bg-white/[0.02] text-slate-600 border border-white/[0.04]"
            }`}
            title={d.dateStr}
          >
            {d.attended ? "✓" : d.dayNum}
          </div>
        ))}
      </div>
    </div>
  );
}
