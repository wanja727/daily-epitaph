"use client";

import { useState } from "react";

export default function WriteArea({ defaultValue }: { defaultValue: string }) {
  const [value, setValue] = useState(defaultValue);
  const max = 100;

  return (
    <div className="space-y-2">
      <textarea
        name="content"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        maxLength={max}
        placeholder="오늘 하루를 한 문장으로 담아보세요..."
        rows={4}
        className="w-full resize-none rounded-xl border border-stone-200 bg-white px-4 py-3 text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-400 text-base leading-relaxed"
        required
      />
      <div className="flex justify-end">
        <span
          className={`text-xs ${
            value.length >= max
              ? "text-red-400"
              : value.length > max * 0.8
              ? "text-amber-500"
              : "text-stone-400"
          }`}
        >
          {value.length} / {max}
        </span>
      </div>
    </div>
  );
}
