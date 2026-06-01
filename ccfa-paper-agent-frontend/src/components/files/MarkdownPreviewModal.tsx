import { useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import type { ProjectFile } from "../../types/file";
import { sanitizeRelativeAssetPath } from "../../utils/workspaceFs";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";
import { DraftParagraphManager } from "./DraftParagraphManager";

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

export function MarkdownPreviewModal({
  open,
  file,
  isDraft,
  onClose,
  onParagraphChange
}: {
  open: boolean;
  file?: ProjectFile;
  isDraft: boolean;
  onClose: () => void;
  onParagraphChange: Parameters<typeof DraftParagraphManager>[0]["onChange"];
}) {
  const [mode, setMode] = useState<"preview" | "paragraphs">("preview");
  const pendingChange = file?.pendingChange?.status === "pending" ? file.pendingChange : undefined;
  const previewContent = pendingChange?.newContent ?? file?.contentText;
  const normalizedPreviewContent = normalizeMarkdownImageTargets(
    previewContent || "No Markdown content yet."
  );
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
    <Modal
      open={open}
      title={file?.name ?? "Markdown Preview"}
      description={file ? `Uploaded at ${new Date(file.uploadedAt).toLocaleString()}` : undefined}
      onClose={onClose}
      widthClass="max-w-none w-[min(1320px,calc(100vw-40px))]"
      bodyClassName="p-0"
    >
      {file ? (
        <div className="grid max-h-[calc(92vh-73px)] min-h-[620px] lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="border-b border-stone-200 bg-paper-100/80 p-5 text-sm lg:border-b-0 lg:border-r">
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-400">
                  File Type
                </p>
                <p className="mt-1 break-words font-medium text-stone-800">{file.mimeType}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-400">
                  Size
                </p>
                <p className="mt-1 font-medium text-stone-800">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-400">
                  Parse Status
                </p>
                <div className="mt-2">
                  <Badge
                    tone={
                      file.parseStatus === "parsed"
                        ? "green"
                        : file.parseStatus === "failed"
                          ? "red"
                          : "amber"
                    }
                  >
                    {file.parseStatus === "parsed"
                      ? "Parsed"
                      : file.parseStatus === "failed"
                        ? "Failed"
                        : "Waiting"}
                  </Badge>
                </div>
              </div>
              {file.parsedStats ? (
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <Badge tone="neutral">{file.parsedStats.sectionCount} sections</Badge>
                  <Badge tone="neutral">{file.parsedStats.imageCount} images</Badge>
                  <Badge tone="neutral">{file.parsedStats.tableCount} tables</Badge>
                  <Badge tone="neutral">{file.parsedStats.formulaCount} formulas</Badge>
                </div>
              ) : null}
              {file.parsedMarkdownUrl ? (
                <a
                  className="block break-words text-xs leading-5 text-sage-700 hover:text-sage-900"
                  href={file.parsedMarkdownUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  MinerU Markdown source
                </a>
              ) : null}
              {file.parseError ? (
                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs leading-5 text-red-700">
                  {file.parseError}
                </div>
              ) : null}
              {pendingChange ? (
                <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
                  This draft has an Agent revision waiting for review.
                </div>
              ) : null}
            </div>
            {isDraft ? (
              <div className="mt-6 grid gap-2">
                <Button
                  className="justify-start"
                  variant={mode === "preview" ? "primary" : "secondary"}
                  onClick={() => setMode("preview")}
                >
                  Markdown Preview
                </Button>
                <Button
                  className="justify-start"
                  variant={mode === "paragraphs" ? "primary" : "secondary"}
                  onClick={() => setMode("paragraphs")}
                >
                  Paragraphs
                </Button>
              </div>
            ) : null}
          </aside>
          <section className="min-h-0 overflow-y-auto bg-white">
            {isDraft && mode === "paragraphs" ? (
              <div className="p-6">
                {pendingChange ? (
                  <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    Agent has generated a pending change for this draft. Paragraph management still shows the saved version until the change is applied.
                  </div>
                ) : null}
                <DraftParagraphManager
                  paragraphs={file.draftParagraphs ?? []}
                  onChange={onParagraphChange}
                />
              </div>
            ) : (
              <>
                {pendingChange ? (
                  <div className="border-b border-amber-200 bg-amber-50 px-8 py-3 text-sm text-amber-800 lg:px-12">
                    Showing the Agent's pending revision preview. Use the file card's review action to apply it to the draft.
                  </div>
                ) : null}
                <article className="markdown-reader prose-paper prose max-w-none px-8 py-7 lg:px-12">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={[rehypeRaw, rehypeKatex]}
                    components={{
                      img: ({ src, alt, ...props }) => (
                        <img {...props} src={resolveImageSrc(src)} alt={alt ?? ""} />
                      )
                    }}
                  >
                    {normalizedPreviewContent}
                  </ReactMarkdown>
                </article>
              </>
            )}
          </section>
        </div>
      ) : null}
    </Modal>
  );
}
