import type { DraftParagraph, ParagraphWritingStatus } from "../../types/file";
import { Badge } from "../ui/Badge";
import { Input } from "../ui/Input";

const statusLabels: Record<ParagraphWritingStatus, string> = {
  todo: "未完成",
  draft: "初稿",
  final: "定稿"
};

const statusTone: Record<ParagraphWritingStatus, "amber" | "blue" | "green"> = {
  todo: "amber",
  draft: "blue",
  final: "green"
};

export function DraftParagraphManager({
  paragraphs,
  onChange
}: {
  paragraphs: DraftParagraph[];
  onChange: (
    paragraphId: string,
    patch: Partial<Pick<DraftParagraph, "userAssignedHeading" | "writingStatus">>
  ) => void;
}) {
  if (paragraphs.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-stone-300 bg-white p-5 text-sm text-stone-500">
        当前 Markdown 未解析出自然段。
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {paragraphs.map((paragraph, index) => {
        const heading = paragraph.userAssignedHeading || paragraph.headingPath.join(" / ") || "未归属章节";
        return (
          <div key={paragraph.id} className="rounded-md border border-stone-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-stone-400">
                  Paragraph {index + 1}
                </p>
                <p className="mt-1 truncate text-sm font-semibold text-stone-800">{heading}</p>
              </div>
              <Badge tone={statusTone[paragraph.writingStatus]}>
                {statusLabels[paragraph.writingStatus]}
              </Badge>
            </div>
            <p className="mt-3 line-clamp-3 text-sm leading-6 text-stone-600">{paragraph.content}</p>
            <div className="mt-4 grid gap-3 md:grid-cols-[1fr_150px]">
              <Input
                value={paragraph.userAssignedHeading ?? ""}
                onChange={(event) =>
                  onChange(paragraph.id, {
                    userAssignedHeading: event.target.value
                  })
                }
                placeholder="手动修正所属标题，例如 2 Method / 2.4 Loss"
              />
              <select
                className="h-10 rounded-md border-stone-200 bg-white text-sm shadow-sm focus:border-sage-600 focus:ring-sage-600/20"
                value={paragraph.writingStatus}
                onChange={(event) =>
                  onChange(paragraph.id, {
                    writingStatus: event.target.value as ParagraphWritingStatus
                  })
                }
              >
                <option value="todo">未完成</option>
                <option value="draft">初稿</option>
                <option value="final">定稿</option>
              </select>
            </div>
          </div>
        );
      })}
    </div>
  );
}
