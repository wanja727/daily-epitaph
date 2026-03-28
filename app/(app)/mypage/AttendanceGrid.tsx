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
    <div className="rounded-2xl bg-white border border-warm-gray/30 p-4">
      <div className="grid grid-cols-8 gap-1.5">
        {days.map((d) => (
          <div
            key={d.dayNum}
            className={`aspect-square rounded-lg flex items-center justify-center text-xs font-medium transition-colors ${
              d.attended
                ? "bg-olive/20 text-olive border border-olive/30"
                : d.isToday
                ? "bg-gold/10 text-brown border border-gold/40 ring-1 ring-gold/30"
                : d.isPast
                ? "bg-warm-gray/10 text-warm-gray border border-warm-gray/15"
                : "bg-warm-gray/5 text-warm-gray/60 border border-warm-gray/10"
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
