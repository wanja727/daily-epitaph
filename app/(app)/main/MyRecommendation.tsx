// 작성자 본인 전용 — 피드에 절대 노출되지 않는다.
// TODO: 개역개정 원문 직접 저장/노출 전 대한성서공회 저작권 검토 필요

import { BookIcon, SunriseIcon } from "@/app/components/icons";

type Recommendation = {
  reference: string;
  reason: string;
  deepLinkUrl: string;
};

export default function MyRecommendation({
  themes,
  situationTags,
  emotionTags,
  recommendations,
}: {
  themes: string[];
  situationTags: string[];
  emotionTags: string[];
  recommendations: Recommendation[];
}) {
  if (recommendations.length === 0) return null;
  const tags = [...themes, ...situationTags, ...emotionTags].slice(0, 6);

  return (
    <div className="rounded-2xl bg-[#FAF1D6] p-3 space-y-2.5 border border-gold/40">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <SunriseIcon className="w-3.5 h-3.5 text-[#9A8551]" />
          <div className="text-[11px] uppercase tracking-[0.18em] text-[#7A6841]">
            부활의 말씀
          </div>
        </div>
        <span className="text-[10px] text-brown-light">나에게만 보여요</span>
      </div>

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((t) => (
            <span
              key={t}
              className="inline-flex rounded-full px-2.5 py-0.5 text-[11px] bg-white/70 text-[#7A6841]"
            >
              {t}
            </span>
          ))}
        </div>
      )}

      <ul className="space-y-2">
        {recommendations.map((r) => (
          <li
            key={r.reference}
            className="rounded-xl bg-white/80 p-3 border border-gold/30"
          >
            <a
              href={r.deepLinkUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-brown-dark hover:underline"
            >
              <BookIcon className="w-3.5 h-3.5 text-[#9A8551]" />
              <span>{r.reference}</span>
            </a>
            <p className="mt-1 text-xs leading-5 text-brown-mid">{r.reason}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
