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

    return { dayNum, dateStr, isToday, attended, isPast };
  });

  return (
    <div className="grid grid-cols-8 gap-2">
      {days.map((d) => (
        <div
          key={d.dayNum}
          className={`aspect-square rounded-2xl text-xs flex items-center justify-center border transition-colors ${
            d.attended
              ? "bg-[#DDE6D7] text-[#506146] border-[#C8D4C1]"
              : d.isToday
              ? "bg-gold-light text-brown-dark border-gold ring-1 ring-gold/40"
              : "bg-[#F8F4EC] text-brown-light border-stone"
          }`}
          title={d.dateStr}
        >
          {d.attended ? "✓" : d.dayNum}
        </div>
      ))}
    </div>
  );
}
