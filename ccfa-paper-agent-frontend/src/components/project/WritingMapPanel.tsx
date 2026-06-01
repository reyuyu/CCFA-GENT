import { BookOpen, ChevronDown, Lightbulb, Map, Target } from "lucide-react";
import type { ReactNode } from "react";
import type {
  IntroductionOutline,
  ScientificProblemMemory,
  ScientificProblemMemoryItem
} from "../../types/project";

function hasItems(items?: ScientificProblemMemoryItem[]) {
  return Boolean(items?.some((item) => item.title.trim() || item.description.trim()));
}

function CompactMemoryList({
  title,
  icon,
  items
}: {
  title: string;
  icon: ReactNode;
  items: ScientificProblemMemoryItem[];
}) {
  if (!hasItems(items)) return null;

  return (
    <div>
      <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-morandi-muted">
        {icon}
        <span>{title}</span>
      </div>
      <ul className="space-y-1">
        {items.slice(0, 3).map((item, index) => (
          <li
            key={item.id || `${title}-${index}`}
            className="rounded-md bg-[#fbfaf7]/80 px-2 py-1.5 text-xs leading-5 text-morandi-ink"
          >
            <span className="font-medium">{item.title || item.description}</span>
            {item.title && item.description ? (
              <span className="block line-clamp-1 text-morandi-muted">{item.description}</span>
            ) : null}
          </li>
        ))}
        {items.length > 3 ? (
          <li className="px-2 text-xs text-morandi-muted">+{items.length - 3} more</li>
        ) : null}
      </ul>
    </div>
  );
}

export function WritingMapPanel({
  memory,
  outline
}: {
  memory?: ScientificProblemMemory;
  outline?: IntroductionOutline;
}) {
  const scientificProblems = memory?.scientificProblems ?? [];
  const innovations = memory?.innovations ?? [];
  const keyTechnologies = memory?.keyTechnologies ?? [];
  const memoryCount = scientificProblems.length + innovations.length + keyTechnologies.length;
  const hasMemory =
    hasItems(scientificProblems) ||
    hasItems(innovations) ||
    hasItems(keyTechnologies) ||
    Boolean(memory?.notes?.trim());
  const hasOutline = Boolean(outline?.paragraphs.length);

  if (!hasMemory && !hasOutline) {
    return null;
  }

  return (
    <section className="overflow-hidden rounded-lg border border-morandi-clay/70 bg-morandi-mist/70 shadow-sm">
      <details open>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 bg-[#fbfaf7] px-3 py-2.5 text-left marker:hidden">
          <span className="flex min-w-0 items-center gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-morandi-green text-sage-700">
              <Map className="h-4 w-4" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-morandi-ink">论文脉络</span>
              <span className="block truncate text-xs text-morandi-muted">
                {memoryCount} 项记忆 / {outline?.paragraphs.length ?? 0} 段 Intro 大纲
              </span>
            </span>
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-morandi-muted" />
        </summary>

        <div className="space-y-3 border-t border-morandi-clay/60 px-3 py-3">
          {memory?.notes ? (
            <p className="rounded-md bg-[#fbfaf7]/80 px-2 py-1.5 text-xs leading-5 text-morandi-muted">
              {memory.notes}
            </p>
          ) : null}

          <CompactMemoryList
            title="科学问题"
            icon={<Target className="h-3.5 w-3.5" />}
            items={scientificProblems}
          />
          <CompactMemoryList
            title="创新点"
            icon={<Lightbulb className="h-3.5 w-3.5" />}
            items={innovations}
          />
          <CompactMemoryList
            title="关键技术"
            icon={<BookOpen className="h-3.5 w-3.5" />}
            items={keyTechnologies}
          />

          {hasOutline ? (
            <div>
              <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-morandi-muted">
                <BookOpen className="h-3.5 w-3.5" />
                <span>Introduction 大纲</span>
              </div>
              <ol className="space-y-1">
                {outline!.paragraphs.slice(0, 5).map((item) => (
                  <li
                    key={`${item.paragraphNumber}-${item.outline}`}
                    className="grid grid-cols-[28px_minmax(0,1fr)] gap-2 rounded-md bg-[#fbfaf7]/80 px-2 py-1.5 text-xs leading-5"
                  >
                    <span className="font-semibold text-sage-700">P{item.paragraphNumber}</span>
                    <span className="line-clamp-2 text-morandi-ink">{item.outline}</span>
                  </li>
                ))}
                {outline!.paragraphs.length > 5 ? (
                  <li className="px-2 text-xs text-morandi-muted">
                    +{outline!.paragraphs.length - 5} more
                  </li>
                ) : null}
              </ol>
            </div>
          ) : null}
        </div>
      </details>
    </section>
  );
}
