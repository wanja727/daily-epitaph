"use client";

import { useState } from "react";

type AdminTab = "metrics" | "video";

export default function AdminTabs({
  metrics,
  video,
}: {
  metrics: React.ReactNode;
  video: React.ReactNode;
}) {
  const [tab, setTab] = useState<AdminTab>("metrics");

  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-auto pb-1">
        <TabPill active={tab === "metrics"} onClick={() => setTab("metrics")}>
          서비스 지표
        </TabPill>
        <TabPill active={tab === "video"} onClick={() => setTab("video")}>
          오늘의 묵상 영상
        </TabPill>
      </div>

      <div>{tab === "metrics" ? metrics : video}</div>
    </div>
  );
}

function TabPill({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex rounded-full px-3 py-1 text-xs transition-colors ${
        active
          ? "bg-[#DCE5D6] text-[#516047]"
          : "bg-sand/60 text-brown-mid hover:bg-sand"
      }`}
    >
      {children}
    </button>
  );
}
