import { db } from "@/lib/db";
import { dailyVideos, users } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { getTodayKST } from "@/lib/utils/date";
import { setDailyVideo, deleteDailyVideo } from "./actions";

export default async function DailyVideoSection() {
  const today = getTodayKST();

  const recent = await db
    .select({
      id: dailyVideos.id,
      date: dailyVideos.date,
      youtubeVideoId: dailyVideos.youtubeVideoId,
      title: dailyVideos.title,
      postedById: dailyVideos.postedBy,
      postedByName: users.realName,
      updatedAt: dailyVideos.updatedAt,
    })
    .from(dailyVideos)
    .leftJoin(users, eq(dailyVideos.postedBy, users.id))
    .orderBy(desc(dailyVideos.date))
    .limit(7);

  const todayVideo = recent.find((v) => v.date === today) ?? null;

  return (
    <section className="space-y-3">
      <h3 className="text-lg font-heading font-bold text-brown-dark">
        오늘의 묵상 영상
      </h3>

      {todayVideo ? (
        <div className="bg-white/60 rounded-xl px-4 py-3 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-olive font-medium">등록됨</span>
            <span className="text-xs text-brown-mid">{todayVideo.date}</span>
            {todayVideo.postedById === null ? (
              <span className="text-[10px] rounded-full bg-sage-light text-[#516047] px-2 py-0.5">
                자동
              </span>
            ) : (
              <span className="text-[10px] rounded-full bg-sand text-brown-mid px-2 py-0.5">
                수동 · {todayVideo.postedByName ?? "관리자"}
              </span>
            )}
          </div>
          <div className="text-sm text-brown-dark">
            {todayVideo.title || todayVideo.youtubeVideoId}
          </div>
          <a
            href={`https://youtu.be/${todayVideo.youtubeVideoId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-brown-mid underline break-all"
          >
            youtu.be/{todayVideo.youtubeVideoId}
          </a>
        </div>
      ) : (
        <div className="bg-rose-50/60 rounded-xl px-4 py-3 text-sm text-[#7A5858]">
          오늘({today}) 등록된 영상이 없습니다. 아래에 등록해주세요.
        </div>
      )}

      <form action={setDailyVideo} className="bg-white/60 rounded-xl p-4 space-y-3">
        <div className="grid grid-cols-[auto_1fr] gap-2 items-center">
          <label className="text-xs text-brown-mid">날짜</label>
          <input
            type="date"
            name="date"
            defaultValue={today}
            className="rounded-md border border-stone bg-white px-2 py-1 text-sm text-brown-dark"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-brown-mid">유튜브 URL 또는 ID</label>
          <input
            type="text"
            name="url"
            required
            placeholder="https://youtu.be/... 또는 https://youtube.com/watch?v=..."
            className="w-full rounded-md border border-stone bg-white px-3 py-2 text-sm text-brown-dark placeholder:text-brown-light/60"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-brown-mid">제목 (선택)</label>
          <input
            type="text"
            name="title"
            maxLength={200}
            placeholder="예: 4월 6일 새벽 묵상"
            className="w-full rounded-md border border-stone bg-white px-3 py-2 text-sm text-brown-dark placeholder:text-brown-light/60"
          />
        </div>
        <button
          type="submit"
          className="w-full rounded-md bg-olive text-ivory text-sm font-medium py-2 hover:bg-sage transition-colors"
        >
          등록 / 갱신
        </button>
      </form>

      {recent.length > 0 && (
        <div className="bg-white/60 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone/30">
                <th className="text-left px-3 py-2 text-brown-mid font-medium">
                  날짜
                </th>
                <th className="text-left px-3 py-2 text-brown-mid font-medium">
                  영상
                </th>
                <th className="text-right px-3 py-2 text-brown-mid font-medium">
                  &nbsp;
                </th>
              </tr>
            </thead>
            <tbody>
              {recent.map((v) => (
                <tr
                  key={v.id}
                  className="border-b border-stone/10 last:border-0"
                >
                  <td className="px-3 py-2 text-brown-dark whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <span>{v.date}</span>
                      {v.postedById === null && (
                        <span className="text-[10px] rounded-full bg-sage-light text-[#516047] px-1.5 py-0.5">
                          자동
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <a
                      href={`https://youtu.be/${v.youtubeVideoId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brown-mid hover:text-brown-dark underline break-all"
                    >
                      {v.title || v.youtubeVideoId}
                    </a>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <form action={deleteDailyVideo}>
                      <input type="hidden" name="id" value={v.id} />
                      <button
                        type="submit"
                        className="text-xs text-rose-500 hover:underline"
                      >
                        삭제
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
