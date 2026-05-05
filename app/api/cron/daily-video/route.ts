/**
 * 매일 묵상 영상 자동 등록 cron.
 *
 * 동작:
 *  1. CRON_SECRET Bearer 토큰으로 인증 (Vercel Cron 이 자동 부여).
 *  2. YOUTUBE_PLAYLIST_ID 의 최신 5개를 조회.
 *  3. publishedAt 이 오늘(KST) 인 항목만 daily_video 에 upsert.
 *  4. 오늘자 영상이 아직 없으면 no-op 으로 보류 (사용자가 보는 화면은 폴백으로 가장 최근 영상이 노출됨).
 *
 * vercel.json 에서 호출되며, 멱등하므로 같은 날 여러 번 돌아도 안전하다.
 */

import { db } from "@/lib/db";
import { dailyVideos } from "@/lib/db/schema";
import { fetchLatestPlaylistItems, isoToKstDate } from "@/lib/youtube";
import { getTodayKST } from "@/lib/utils/date";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  // Vercel Cron 은 Authorization: Bearer <CRON_SECRET> 헤더로 호출한다.
  const expected = process.env.CRON_SECRET;
  if (expected) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${expected}`) {
      return Response.json({ error: "unauthorized" }, { status: 401 });
    }
  } else {
    // 시크릿 미설정 상태로는 외부 호출을 허용하지 않는다.
    return Response.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }

  const apiKey = process.env.YOUTUBE_API_KEY;
  const playlistId = process.env.YOUTUBE_PLAYLIST_ID;
  if (!apiKey || !playlistId) {
    return Response.json(
      { error: "YOUTUBE_API_KEY or YOUTUBE_PLAYLIST_ID not configured" },
      { status: 500 },
    );
  }

  const today = getTodayKST();

  let items;
  try {
    items = await fetchLatestPlaylistItems(playlistId, apiKey, 5);
  } catch (err) {
    console.error("[cron/daily-video] playlist fetch failed", err);
    return Response.json(
      { error: "playlist fetch failed", message: (err as Error).message },
      { status: 502 },
    );
  }

  // 오늘(KST) 업로드된 항목만 채택. 없으면 보류.
  const todays = items.find((it) => isoToKstDate(it.publishedAt) === today);
  if (!todays) {
    return Response.json({
      status: "deferred",
      reason: "no item published today (KST)",
      checked: items.length,
      today,
    });
  }

  await db
    .insert(dailyVideos)
    .values({
      date: today,
      youtubeVideoId: todays.videoId,
      title: todays.title || null,
      postedBy: null,
    })
    .onConflictDoUpdate({
      target: dailyVideos.date,
      set: {
        youtubeVideoId: todays.videoId,
        title: todays.title || null,
        updatedAt: new Date(),
      },
    });

  return Response.json({
    status: "registered",
    date: today,
    videoId: todays.videoId,
    title: todays.title,
  });
}
