// 작성자 본인 전용 — 피드에 절대 노출되지 않는다.
// TODO: 개역개정 원문 직접 저장/노출 전 대한성서공회 저작권 검토 필요

type Recommendation = {
  reference: string;
  reason: string;
  deepLinkUrl: string;
};

function BookIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}

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
    <div className="rounded-2xl bg-[#F2F4EC] p-3 space-y-2.5 border border-olive/15">
      <div className="flex items-center justify-between">
        <div className="text-[11px] uppercase tracking-[0.18em] text-[#6B7B61]">
          부활의 말씀
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
            className="rounded-xl bg-white/80 p-3 border border-stone/60"
          >
            <a
              href={r.deepLinkUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-brown-dark hover:underline"
            >
              <BookIcon className="w-3.5 h-3.5 text-[#6B7B61]" />
              <span>{r.reference}</span>
            </a>
            <p className="mt-1 text-xs leading-5 text-brown-mid">{r.reason}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
