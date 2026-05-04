"use client";

import Image from "next/image";
import { useState } from "react";
import { getTodayKST } from "@/lib/utils/date";

export default function PinnedVideoCard({
  videoId,
  title,
  date,
}: {
  videoId: string;
  title: string | null;
  date: string;
}) {
  const today = getTodayKST();
  const isToday = date === today;
  const watchUrl = `https://youtu.be/${videoId}`;
  // maxresdefault(1280x720, 진짜 16:9)를 우선 시도하고, 존재하지 않으면 hqdefault로 폴백.
  const [thumbnail, setThumbnail] = useState(
    `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
  );

  // 카카오톡 인앱 브라우저에선 youtu.be 링크가 카톡 WebView 안의 모바일 유튜브로 열린다.
  // openExternal 스킴으로 시스템 외부 브라우저로 빼면, 거기서 유튜브 universal link가
  // 동작해 앱이 설치돼 있으면 앱으로 열린다.
  function handleClick(e: React.MouseEvent<HTMLAnchorElement>) {
    if (
      typeof navigator !== "undefined" &&
      /KAKAOTALK/i.test(navigator.userAgent)
    ) {
      e.preventDefault();
      window.location.href = `kakaotalk://web/openExternal?url=${encodeURIComponent(
        watchUrl,
      )}`;
    }
  }

  return (
    <a
      href={watchUrl}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      className="block rounded-[28px] overflow-hidden border border-stone bg-white/80 backdrop-blur-sm shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="relative aspect-video bg-stone/30">
        <Image
          src={thumbnail}
          alt={title ?? "오늘의 묵상"}
          fill
          sizes="(max-width: 512px) 100vw, 512px"
          className="object-cover"
          onError={() =>
            setThumbnail(`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`)
          }
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-14 h-14 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="white"
              className="ml-1"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
        <div className="absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-medium text-brown-dark">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
          오늘의 묵상
        </div>
      </div>
      <div className="p-4 space-y-1">
        {title && (
          <p className="text-sm font-medium text-brown-dark line-clamp-2">
            {title}
          </p>
        )}
        <p className="text-[11px] text-brown-light">
          {isToday ? "오늘 업로드" : `${date} 업로드`} · 유튜브에서 보기
        </p>
      </div>
    </a>
  );
}
