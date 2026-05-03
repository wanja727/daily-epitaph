"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { dailyVideos } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getTodayKST } from "@/lib/utils/date";

const YOUTUBE_ID_RE = /^[A-Za-z0-9_-]{11}$/;

function extractYoutubeId(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (YOUTUBE_ID_RE.test(trimmed)) return trimmed;
  try {
    const url = new URL(trimmed);
    const host = url.hostname.replace(/^www\.|^m\./, "");
    if (host === "youtu.be") {
      const id = url.pathname.replace(/^\//, "").split("/")[0];
      return YOUTUBE_ID_RE.test(id) ? id : null;
    }
    if (host === "youtube.com") {
      const v = url.searchParams.get("v");
      if (v && YOUTUBE_ID_RE.test(v)) return v;
      const m = url.pathname.match(
        /\/(?:shorts|embed|live)\/([A-Za-z0-9_-]{11})/,
      );
      if (m) return m[1];
    }
    return null;
  } catch {
    return null;
  }
}

export async function setDailyVideo(formData: FormData) {
  const session = await auth();
  if (!session?.user?.isAdmin || !session.user.id) redirect("/main");

  const userId = session.user.id;
  const dateRaw = ((formData.get("date") as string) ?? "").trim();
  const urlOrId = ((formData.get("url") as string) ?? "").trim();
  const titleRaw = ((formData.get("title") as string) ?? "").trim();

  const date = /^\d{4}-\d{2}-\d{2}$/.test(dateRaw) ? dateRaw : getTodayKST();
  const youtubeVideoId = extractYoutubeId(urlOrId);
  if (!youtubeVideoId) return;

  const title = titleRaw ? titleRaw.slice(0, 200) : null;

  await db
    .insert(dailyVideos)
    .values({ date, youtubeVideoId, title, postedBy: userId })
    .onConflictDoUpdate({
      target: dailyVideos.date,
      set: { youtubeVideoId, title, updatedAt: new Date() },
    });

  revalidatePath("/main");
  revalidatePath("/admin");
}

export async function deleteDailyVideo(formData: FormData) {
  const session = await auth();
  if (!session?.user?.isAdmin) redirect("/main");

  const id = ((formData.get("id") as string) ?? "").trim();
  if (!id) return;

  await db.delete(dailyVideos).where(eq(dailyVideos.id, id));

  revalidatePath("/main");
  revalidatePath("/admin");
}
