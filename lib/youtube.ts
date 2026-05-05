/**
 * YouTube Data API v3 클라이언트.
 * 메인 피드 상단 고정 영상의 자동 등록 cron 에서 사용한다.
 *
 * 필요한 환경변수:
 *   - YOUTUBE_API_KEY     공개 데이터 조회용 API 키
 *   - YOUTUBE_PLAYLIST_ID 묵상 영상이 올라오는 재생목록 ID
 */

export type PlaylistItem = {
  videoId: string;
  title: string;
  /** ISO 8601 UTC. playlistItems 의 snippet.publishedAt — "재생목록에 추가된 시각" */
  publishedAt: string;
};

const PLAYLIST_ITEMS_URL = "https://www.googleapis.com/youtube/v3/playlistItems";

/**
 * 재생목록 최신 N개를 publishedAt 내림차순으로 반환.
 * 응답 구조의 일부만 안전하게 파싱한다.
 */
export async function fetchLatestPlaylistItems(
  playlistId: string,
  apiKey: string,
  maxResults = 5,
): Promise<PlaylistItem[]> {
  const url = new URL(PLAYLIST_ITEMS_URL);
  url.searchParams.set("part", "snippet");
  url.searchParams.set("playlistId", playlistId);
  url.searchParams.set("maxResults", String(maxResults));
  url.searchParams.set("key", apiKey);

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`YouTube API ${res.status}: ${body.slice(0, 300)}`);
  }

  const json = (await res.json()) as {
    items?: Array<{
      snippet?: {
        title?: string;
        publishedAt?: string;
        resourceId?: { videoId?: string };
      };
    }>;
  };

  const items: PlaylistItem[] = [];
  for (const it of json.items ?? []) {
    const videoId = it.snippet?.resourceId?.videoId;
    const publishedAt = it.snippet?.publishedAt;
    const title = it.snippet?.title ?? "";
    if (!videoId || !publishedAt) continue;
    items.push({ videoId, title, publishedAt });
  }

  items.sort((a, b) =>
    a.publishedAt < b.publishedAt ? 1 : a.publishedAt > b.publishedAt ? -1 : 0,
  );
  return items;
}

/** ISO 시각을 KST YYYY-MM-DD 로 변환 (lib/utils/date 의 getTodayKST 와 동일 포맷) */
export function isoToKstDate(iso: string): string {
  return new Date(iso)
    .toLocaleDateString("ko-KR", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
    .replace(/\. /g, "-")
    .replace(/\.$/, "");
}
