// 작성자 본인 전용 — 피드에 절대 노출되지 않는다.
// TODO: 개역개정 원문 직접 저장/노출 전 대한성서공회 저작권 검토 필요

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
    <div className="rounded-[28px] border border-olive/30 bg-[#F2F4EC]/70 backdrop-blur-sm p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-[11px] uppercase tracking-[0.18em] text-[#6B7B61]">
          오늘 나에게 주신 말씀
        </div>
        <span className="text-[10px] text-brown-light">나에게만 보여요</span>
      </div>

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((t) => (
            <span
              key={t}
              className="inline-flex rounded-full px-2.5 py-0.5 text-[11px] bg-white/70 text-[#516047]"
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
            className="rounded-2xl bg-white/80 p-3 border border-stone/60"
          >
            <a
              href={r.deepLinkUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="text-sm font-medium text-brown-dark hover:underline"
            >
              {r.reference} ↗
            </a>
            <p className="mt-1 text-xs leading-5 text-brown-mid">{r.reason}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
