import { Columns2, FileCode2, FileText } from "lucide-react";
import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import type { ProjectFile } from "../../types/file";
import { sanitizeRelativeAssetPath } from "../../utils/workspaceFs";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";

type DiffOp = {
  type: "same" | "removed" | "added";
  text: string;
  oldLine?: number;
  newLine?: number;
};

type DiffRow = {
  kind: "same" | "changed" | "removed" | "added";
  oldLine?: number;
  newLine?: number;
  oldText?: string;
  newText?: string;
};

type RenderedSection = {
  id: string;
  oldStart?: number;
  oldEnd?: number;
  newStart?: number;
  newEnd?: number;
  oldMarkdown: string;
  newMarkdown: string;
};

const markdownImagePattern =
  /!\[(?<alt>[^\]]*)\]\((?<target><[^>]+>|[^\n]*?\.(?:png|jpe?g|gif|webp|bmp|svg))(?:\s+(?<title>"[^"]*"|'[^']*'|\([^)]*\)))?\)/gi;

const normalizeMarkdownImageTargets = (markdown: string) =>
  markdown.replace(markdownImagePattern, (...args) => {
    const groups = args[args.length - 1] as { alt: string; target: string; title?: string };
    const target = groups.target.trim();
    if (target.startsWith("<") && target.endsWith(">")) {
      return `![${groups.alt}](${target}${groups.title ? ` ${groups.title}` : ""})`;
    }
    const safeTarget = /[\s()]/.test(target) ? `<${target.replace(/[<>]/g, "-")}>` : target;
    return `![${groups.alt}](${safeTarget}${groups.title ? ` ${groups.title}` : ""})`;
  });

function buildLineDiff(oldContent: string, newContent: string): DiffOp[] {
  const oldLines = oldContent.split(/\r?\n/);
  const newLines = newContent.split(/\r?\n/);

  if (oldLines.length * newLines.length > 2_250_000) {
    return buildPositionDiff(oldLines, newLines);
  }

  const width = newLines.length + 1;
  const table = new Uint32Array((oldLines.length + 1) * width);

  for (let oldIndex = oldLines.length - 1; oldIndex >= 0; oldIndex -= 1) {
    for (let newIndex = newLines.length - 1; newIndex >= 0; newIndex -= 1) {
      const offset = oldIndex * width + newIndex;
      table[offset] =
        oldLines[oldIndex] === newLines[newIndex]
          ? table[(oldIndex + 1) * width + newIndex + 1] + 1
          : Math.max(table[(oldIndex + 1) * width + newIndex], table[oldIndex * width + newIndex + 1]);
    }
  }

  const ops: DiffOp[] = [];
  let oldIndex = 0;
  let newIndex = 0;

  while (oldIndex < oldLines.length && newIndex < newLines.length) {
    if (oldLines[oldIndex] === newLines[newIndex]) {
      ops.push({
        type: "same",
        text: oldLines[oldIndex],
        oldLine: oldIndex + 1,
        newLine: newIndex + 1
      });
      oldIndex += 1;
      newIndex += 1;
      continue;
    }

    if (table[(oldIndex + 1) * width + newIndex] >= table[oldIndex * width + newIndex + 1]) {
      ops.push({ type: "removed", text: oldLines[oldIndex], oldLine: oldIndex + 1 });
      oldIndex += 1;
    } else {
      ops.push({ type: "added", text: newLines[newIndex], newLine: newIndex + 1 });
      newIndex += 1;
    }
  }

  while (oldIndex < oldLines.length) {
    ops.push({ type: "removed", text: oldLines[oldIndex], oldLine: oldIndex + 1 });
    oldIndex += 1;
  }
  while (newIndex < newLines.length) {
    ops.push({ type: "added", text: newLines[newIndex], newLine: newIndex + 1 });
    newIndex += 1;
  }

  return ops;
}

function buildPositionDiff(oldLines: string[], newLines: string[]): DiffOp[] {
  const maxLength = Math.max(oldLines.length, newLines.length);
  const ops: DiffOp[] = [];

  for (let index = 0; index < maxLength; index += 1) {
    const oldLine = oldLines[index];
    const newLine = newLines[index];
    if (oldLine === newLine) {
      ops.push({ type: "same", text: oldLine ?? "", oldLine: index + 1, newLine: index + 1 });
      continue;
    }
    if (oldLine !== undefined) {
      ops.push({ type: "removed", text: oldLine, oldLine: index + 1 });
    }
    if (newLine !== undefined) {
      ops.push({ type: "added", text: newLine, newLine: index + 1 });
    }
  }

  return ops;
}

function buildDiffRows(ops: DiffOp[]): DiffRow[] {
  const rows: DiffRow[] = [];
  let index = 0;

  while (index < ops.length) {
    const op = ops[index];
    if (op.type === "same") {
      rows.push({
        kind: "same",
        oldLine: op.oldLine,
        newLine: op.newLine,
        oldText: op.text,
        newText: op.text
      });
      index += 1;
      continue;
    }

    const removed: DiffOp[] = [];
    const added: DiffOp[] = [];
    while (index < ops.length && ops[index].type !== "same") {
      if (ops[index].type === "removed") {
        removed.push(ops[index]);
      } else {
        added.push(ops[index]);
      }
      index += 1;
    }

    const maxLength = Math.max(removed.length, added.length);
    for (let rowIndex = 0; rowIndex < maxLength; rowIndex += 1) {
      const oldOp = removed[rowIndex];
      const newOp = added[rowIndex];
      rows.push({
        kind: oldOp && newOp ? "changed" : oldOp ? "removed" : "added",
        oldLine: oldOp?.oldLine,
        newLine: newOp?.newLine,
        oldText: oldOp?.text,
        newText: newOp?.text
      });
    }
  }

  return rows;
}

function buildRenderedSections(rows: DiffRow[], contextLines = 6): RenderedSection[] {
  const changedIndexes = rows
    .map((row, index) => (row.kind === "same" ? -1 : index))
    .filter((index) => index >= 0);

  if (!changedIndexes.length) return [];

  const ranges: Array<{ start: number; end: number }> = [];
  for (const changedIndex of changedIndexes) {
    const nextRange = {
      start: Math.max(0, changedIndex - contextLines),
      end: Math.min(rows.length - 1, changedIndex + contextLines)
    };
    const previous = ranges[ranges.length - 1];
    if (previous && nextRange.start <= previous.end + 1) {
      previous.end = Math.max(previous.end, nextRange.end);
    } else {
      ranges.push(nextRange);
    }
  }

  return ranges.map((range, index) => {
    const slice = rows.slice(range.start, range.end + 1);
    const oldLines = slice.filter((row) => row.oldText !== undefined);
    const newLines = slice.filter((row) => row.newText !== undefined);

    return {
      id: `section-${index}`,
      oldStart: oldLines[0]?.oldLine,
      oldEnd: oldLines[oldLines.length - 1]?.oldLine,
      newStart: newLines[0]?.newLine,
      newEnd: newLines[newLines.length - 1]?.newLine,
      oldMarkdown: oldLines.map((row) => row.oldText ?? "").join("\n"),
      newMarkdown: newLines.map((row) => row.newText ?? "").join("\n")
    };
  });
}

function formatLineRange(start?: number, end?: number) {
  if (!start || !end) return "新增";
  return start === end ? `L${start}` : `L${start}-L${end}`;
}

function MarkdownContent({
  content,
  file,
  emptyText = "No content."
}: {
  content: string;
  file?: ProjectFile;
  emptyText?: string;
}) {
  if (!content.trim()) {
    return (
      <div className="px-5 py-4 text-sm italic text-morandi-muted">
        {emptyText}
      </div>
    );
  }

  const normalizedContent = normalizeMarkdownImageTargets(content);
  const resolveImageSrc = (src: string | undefined) => {
    if (!src || !file?.parsedImageAssets?.length || !file.parsedAssetFolder) {
      return src;
    }
    if (/^(?:[a-z][a-z0-9+.-]*:|#|\/)/i.test(src)) {
      return src;
    }

    const hashIndex = src.indexOf("#");
    const beforeHash = hashIndex >= 0 ? src.slice(0, hashIndex) : src;
    const queryIndex = beforeHash.indexOf("?");
    const path = queryIndex >= 0 ? beforeHash.slice(0, queryIndex) : beforeHash;
    const prefix = `${file.parsedAssetFolder}/`;
    const relativePath = path.startsWith(prefix) ? path.slice(prefix.length) : path;
    const safePath = sanitizeRelativeAssetPath(relativePath);
    return (
      file.parsedImageAssets.find(
        (asset) => sanitizeRelativeAssetPath(asset.path) === safePath
      )?.dataUrl ?? src
    );
  };

  return (
    <article className="markdown-reader prose-paper prose prose-sm max-w-none px-5 py-4">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeRaw, rehypeKatex]}
        components={{
          img: ({ src, alt, ...props }) => (
            <img {...props} src={resolveImageSrc(src)} alt={alt ?? ""} />
          )
        }}
      >
        {normalizedContent}
      </ReactMarkdown>
    </article>
  );
}

function DiffStats({ added, removed, changedBlocks }: { added: number; removed: number; changedBlocks: number }) {
  return (
    <div className="flex flex-wrap gap-2 text-xs">
      <span className="rounded-md bg-emerald-50 px-2.5 py-1 font-medium text-emerald-700">
        +{added} 行
      </span>
      <span className="rounded-md bg-red-50 px-2.5 py-1 font-medium text-red-700">
        -{removed} 行
      </span>
      <span className="rounded-md bg-morandi-mist px-2.5 py-1 font-medium text-morandi-muted">
        {changedBlocks} 个改动片段
      </span>
    </div>
  );
}

export function FileChangeReviewModal({
  open,
  file,
  applying,
  onClose,
  onApply,
  onReject
}: {
  open: boolean;
  file?: ProjectFile;
  applying?: boolean;
  onClose: () => void;
  onApply: () => void;
  onReject: () => void;
}) {
  const [mode, setMode] = useState<"rendered" | "source" | "full">("rendered");
  const change = file?.pendingChange;
  const { rows, sections, added, removed } = useMemo(() => {
    if (!change) {
      return { rows: [] as DiffRow[], sections: [] as RenderedSection[], added: 0, removed: 0 };
    }

    const ops = buildLineDiff(change.oldContent, change.newContent);
    const diffRows = buildDiffRows(ops);
    return {
      rows: diffRows,
      sections: buildRenderedSections(diffRows),
      added: ops.filter((op) => op.type === "added").length,
      removed: ops.filter((op) => op.type === "removed").length
    };
  }, [change]);

  return (
    <Modal
      open={open}
      title={file ? `确认文件修改：${file.name}` : "确认文件修改"}
      description={change?.summary}
      onClose={onClose}
      widthClass="max-w-none w-[min(1480px,calc(100vw-32px))]"
      bodyClassName="p-0"
    >
      {change ? (
        <div className="flex max-h-[calc(92vh-72px)] min-h-[650px] flex-col">
          <div className="border-b border-morandi-clay/70 bg-paper-100 px-5 py-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm text-stone-600">
                <p>
                  来源：{change.source === "agent" ? "Agent" : "手动编辑"} · 状态：
                  {change.status === "pending" ? "待确认" : change.status}
                </p>
                <p className="mt-1">
                  确认后
                  {file?.sourceType === "localHandle"
                    ? "会写回本地文件并重新同步前端状态。"
                    : "会更新浏览器本地副本，无法写回磁盘原文件。"}
                </p>
              </div>
              <DiffStats added={added} removed={removed} changedBlocks={sections.length} />
            </div>
            <div className="mt-3 grid max-w-xl grid-cols-3 gap-1 rounded-lg bg-morandi-clay/35 p-1">
              <button
                type="button"
                className={`flex h-9 items-center justify-center gap-2 rounded-md text-sm font-medium transition ${
                  mode === "rendered"
                    ? "bg-white text-morandi-ink shadow-sm"
                    : "text-morandi-muted hover:bg-white/45 hover:text-morandi-ink"
                }`}
                onClick={() => setMode("rendered")}
              >
                <Columns2 className="h-4 w-4" />
                渲染对照
              </button>
              <button
                type="button"
                className={`flex h-9 items-center justify-center gap-2 rounded-md text-sm font-medium transition ${
                  mode === "source"
                    ? "bg-white text-morandi-ink shadow-sm"
                    : "text-morandi-muted hover:bg-white/45 hover:text-morandi-ink"
                }`}
                onClick={() => setMode("source")}
              >
                <FileCode2 className="h-4 w-4" />
                源码差异
              </button>
              <button
                type="button"
                className={`flex h-9 items-center justify-center gap-2 rounded-md text-sm font-medium transition ${
                  mode === "full"
                    ? "bg-white text-morandi-ink shadow-sm"
                    : "text-morandi-muted hover:bg-white/45 hover:text-morandi-ink"
                }`}
                onClick={() => setMode("full")}
              >
                <FileText className="h-4 w-4" />
                全文预览
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-hidden bg-[#f8f6f2]">
            {mode === "rendered" ? (
              <div className="h-full overflow-y-auto p-5">
                {sections.length ? (
                  <div className="space-y-5">
                    {sections.map((section, index) => (
                      <section
                        key={section.id}
                        className="overflow-hidden rounded-lg border border-morandi-clay/70 bg-white shadow-sm"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-morandi-clay/60 bg-[#fbfaf7] px-4 py-3">
                          <h3 className="text-sm font-semibold text-morandi-ink">
                            改动片段 {index + 1}
                          </h3>
                          <div className="flex flex-wrap gap-2 text-xs text-morandi-muted">
                            <span>原文 {formatLineRange(section.oldStart, section.oldEnd)}</span>
                            <span>修改后 {formatLineRange(section.newStart, section.newEnd)}</span>
                          </div>
                        </div>
                        <div className="grid min-h-[220px] lg:grid-cols-2">
                          <div className="border-b border-morandi-clay/60 lg:border-b-0 lg:border-r">
                            <div className="sticky top-0 z-10 border-b border-red-100 bg-red-50 px-4 py-2 text-xs font-semibold text-red-700">
                              原文
                            </div>
                            <MarkdownContent content={section.oldMarkdown} file={file} emptyText="这里是新增内容。" />
                          </div>
                          <div>
                            <div className="sticky top-0 z-10 border-b border-emerald-100 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-700">
                              修改后
                            </div>
                            <MarkdownContent content={section.newMarkdown} file={file} emptyText="这里的内容被删除。" />
                          </div>
                        </div>
                      </section>
                    ))}
                  </div>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-morandi-muted">
                    没有检测到文本差异。
                  </div>
                )}
              </div>
            ) : null}

            {mode === "source" ? (
              <div className="h-full overflow-auto bg-stone-950 text-xs leading-5 text-stone-200">
                <div className="sticky top-0 z-10 grid min-w-[980px] grid-cols-[72px_minmax(0,1fr)_72px_minmax(0,1fr)] border-b border-stone-800 bg-stone-900 text-[11px] font-semibold uppercase tracking-[0.08em] text-stone-400">
                  <div className="px-3 py-2 text-right">Old</div>
                  <div className="px-3 py-2">原文 Markdown / LaTeX</div>
                  <div className="px-3 py-2 text-right">New</div>
                  <div className="px-3 py-2">修改后 Markdown / LaTeX</div>
                </div>
                <div className="min-w-[980px] font-mono">
                  {rows.map((row, index) => {
                    const isAdded = row.kind === "added";
                    const isRemoved = row.kind === "removed";
                    const isChanged = row.kind === "changed";
                    const oldClass =
                      isRemoved || isChanged
                        ? "bg-red-500/12 text-red-100"
                        : "text-stone-400";
                    const newClass =
                      isAdded || isChanged
                        ? "bg-emerald-500/12 text-emerald-100"
                        : "text-stone-400";

                    return (
                      <div
                        key={`${row.oldLine ?? "x"}-${row.newLine ?? "x"}-${index}`}
                        className="grid grid-cols-[72px_minmax(0,1fr)_72px_minmax(0,1fr)] border-b border-stone-800/70"
                      >
                        <div className="select-none px-3 py-1.5 text-right text-stone-600">
                          {row.oldLine ?? ""}
                        </div>
                        <div className={`whitespace-pre-wrap break-words px-3 py-1.5 ${oldClass}`}>
                          {row.oldText ?? ""}
                        </div>
                        <div className="select-none px-3 py-1.5 text-right text-stone-600">
                          {row.newLine ?? ""}
                        </div>
                        <div className={`whitespace-pre-wrap break-words px-3 py-1.5 ${newClass}`}>
                          {row.newText ?? ""}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {mode === "full" ? (
              <div className="grid h-full overflow-hidden lg:grid-cols-2">
                <div className="min-h-0 overflow-y-auto border-b border-morandi-clay/70 bg-white lg:border-b-0 lg:border-r">
                  <div className="sticky top-0 z-10 border-b border-red-100 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700">
                    原文全文
                  </div>
                  <MarkdownContent content={change.oldContent} file={file} />
                </div>
                <div className="min-h-0 overflow-y-auto bg-white">
                  <div className="sticky top-0 z-10 border-b border-emerald-100 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
                    修改后全文
                  </div>
                  <MarkdownContent content={change.newContent} file={file} />
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex justify-end gap-2 border-t border-morandi-clay/70 bg-white px-5 py-4">
            <Button variant="danger" disabled={applying} onClick={onReject}>
              拒绝修改
            </Button>
            <Button variant="primary" disabled={applying} onClick={onApply}>
              {applying ? "正在写入..." : "确认并应用"}
            </Button>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
