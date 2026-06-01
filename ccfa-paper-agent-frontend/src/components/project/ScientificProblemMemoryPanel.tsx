import type { ScientificProblemMemory, ScientificProblemMemoryItem } from "../../types/project";

const groupLabels = {
  scientificProblems: "Scientific Problems",
  innovations: "Innovations",
  keyTechnologies: "Key Technologies"
} as const;

function hasItems(items?: ScientificProblemMemoryItem[]) {
  return Boolean(items?.some((item) => item.title.trim() || item.description.trim()));
}

function MemoryGroup({
  label,
  items
}: {
  label: string;
  items: ScientificProblemMemoryItem[];
}) {
  if (!hasItems(items)) return null;

  return (
    <div className="space-y-1.5">
      <h3 className="text-xs font-semibold text-stone-500">{label}</h3>
      <ul className="space-y-1.5">
        {items.map((item, index) => (
          <li key={item.id || `${label}-${index}`} className="rounded bg-stone-50 px-2 py-1.5">
            <p className="line-clamp-2 text-xs font-medium leading-5 text-stone-700">
              {item.title || item.description}
            </p>
            {item.title && item.description ? (
              <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-stone-500">
                {item.description}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ScientificProblemMemoryPanel({
  memory
}: {
  memory?: ScientificProblemMemory;
}) {
  const scientificProblems = memory?.scientificProblems ?? [];
  const innovations = memory?.innovations ?? [];
  const keyTechnologies = memory?.keyTechnologies ?? [];

  if (
    !memory ||
    (!hasItems(scientificProblems) &&
      !hasItems(innovations) &&
      !hasItems(keyTechnologies) &&
      !memory.notes?.trim())
  ) {
    return null;
  }

  const itemCount = scientificProblems.length + innovations.length + keyTechnologies.length;

  return (
    <section className="rounded-lg border border-stone-200 bg-white p-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-stone-800">Scientific Memory</h2>
          {memory.notes ? (
            <p className="mt-1 line-clamp-2 text-xs leading-5 text-stone-500">{memory.notes}</p>
          ) : null}
        </div>
        <span className="rounded bg-sage-50 px-1.5 py-0.5 text-xs text-sage-700">
          {itemCount}
        </span>
      </div>

      <div className="mt-3 space-y-3">
        <MemoryGroup label={groupLabels.scientificProblems} items={scientificProblems} />
        <MemoryGroup label={groupLabels.innovations} items={innovations} />
        <MemoryGroup label={groupLabels.keyTechnologies} items={keyTechnologies} />
      </div>
    </section>
  );
}
