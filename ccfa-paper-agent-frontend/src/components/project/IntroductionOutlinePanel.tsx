import type { IntroductionOutline } from "../../types/project";

export function IntroductionOutlinePanel({
  outline
}: {
  outline?: IntroductionOutline;
}) {
  if (!outline?.paragraphs.length) {
    return null;
  }

  return (
    <section className="rounded-lg border border-stone-200 bg-white p-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-stone-800">Introduction Outline</h2>
          {outline.summary ? (
            <p className="mt-1 line-clamp-2 text-xs leading-5 text-stone-500">{outline.summary}</p>
          ) : null}
        </div>
        <span className="rounded bg-sage-50 px-1.5 py-0.5 text-xs text-sage-700">
          {outline.paragraphs.length}
        </span>
      </div>

      <ol className="mt-3 space-y-2">
        {outline.paragraphs.map((item) => (
          <li
            key={`${item.paragraphNumber}-${item.outline}`}
            className="grid grid-cols-[34px_minmax(0,1fr)] gap-2 text-xs leading-5"
          >
            <span className="rounded bg-stone-100 px-1.5 py-0.5 text-center font-medium text-stone-500">
              P{item.paragraphNumber}
            </span>
            <span className="text-stone-700">{item.outline}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
