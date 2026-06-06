import {
  Eye,
  FileClock,
  FilePenLine,
  FileText,
  Info,
  ListTree,
  Pencil,
  RefreshCw,
  Trash2
} from "lucide-react";
import type { ReactNode } from "react";
import type { FolderType, ProjectFile } from "../../types/file";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { ImageAssetPanel } from "./ImageAssetPanel";

function FileAction({
  children,
  icon,
  onClick,
  variant = "ghost",
  disabled
}: {
  children: string;
  icon?: ReactNode;
  onClick: () => void;
  variant?: "secondary" | "ghost" | "danger";
  disabled?: boolean;
}) {
  return (
    <Button className="h-8 px-2.5 text-xs" variant={variant} disabled={disabled} icon={icon} onClick={onClick}>
      {children}
    </Button>
  );
}

export function FileList({
  folderType,
  files,
  onOpenMarkdown,
  onEditFile,
  onReviewChange,
  onRefreshFile,
  onOrganizeSections,
  organizingFileId,
  onEditReference,
  onRenameReference,
  onImageCaption,
  onPreviewImage,
  onDeleteFile
}: {
  folderType: FolderType;
  files: ProjectFile[];
  onOpenMarkdown: (file: ProjectFile) => void;
  onEditFile: (folderType: FolderType, file: ProjectFile) => void;
  onReviewChange: (folderType: FolderType, file: ProjectFile) => void;
  onRefreshFile: (folderType: FolderType, file: ProjectFile) => void;
  onOrganizeSections: (folderType: FolderType, file: ProjectFile) => void;
  organizingFileId?: string;
  onEditReference: (folderType: FolderType, file: ProjectFile) => void;
  onRenameReference: (folderType: FolderType, file: ProjectFile) => void;
  onImageCaption: (fileId: string, caption: string) => void;
  onPreviewImage: (file: ProjectFile) => void;
  onDeleteFile: (folderType: FolderType, file: ProjectFile) => void;
}) {
  if (files.length === 0) {
    if (folderType === "draftManuscripts") {
      return (
        <p className="py-3 text-sm leading-6 text-morandi-muted">
          虽然支持上传tex文档，但仍然建议用户直接上传PDF/md文件，tex解析效果可能不如意。
        </p>
      );
    }
    return <p className="py-3 text-sm text-morandi-muted">暂无文件</p>;
  }

  if (folderType === "draftImages") {
    return (
      <div className="space-y-3 pt-3">
        {files.map((file) => (
          <ImageAssetPanel
            key={file.id}
            file={file}
            onCaptionChange={(caption) => onImageCaption(file.id, caption)}
            onPreview={() => onPreviewImage(file)}
            onDelete={() => onDeleteFile(folderType, file)}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2.5 pt-3">
      {files.map((file) => {
        const isMarkdown = file.name.toLowerCase().endsWith(".md");
        const isPdf = file.name.toLowerCase().endsWith(".pdf");
        const isReference = folderType === "coreReferences" || folderType === "optionalReferences";
        const isDraft = folderType === "draftManuscripts";
        const canPreviewMarkdown = isMarkdown || Boolean(file.contentText);
        const canOrganizeSections = Boolean(file.contentText) && (isReference || isDraft);
        const isOrganizing = organizingFileId === file.id;
        const hasPendingChange = file.pendingChange?.status === "pending";
        const parseStatus = file.parseStatus ?? "none";
        const statusTone =
          parseStatus === "parsed" ? "green" : parseStatus === "failed" ? "red" : "amber";
        const statusLabel =
          parseStatus === "parsed"
            ? "已解析"
            : parseStatus === "failed"
              ? "解析失败"
              : parseStatus === "parsing"
                ? "解析中"
                : parseStatus === "waiting_parse"
                  ? "等待解析"
                  : "文件";

        return (
          <article
            key={file.id}
            className={`rounded-lg border bg-[#fbfaf7] p-3 transition ${
              hasPendingChange
                ? "border-[#d6bd8d] shadow-sm shadow-[#d6bd8d]/20"
                : "border-morandi-clay/70 hover:border-sage-100"
            }`}
          >
            <button
              type="button"
              className="flex w-full min-w-0 items-start gap-2.5 text-left"
              onClick={() => {
                if (canPreviewMarkdown) {
                  onOpenMarkdown(file);
                  return;
                }
                if (isPdf) {
                  window.alert("PDF 正在等待解析为 Markdown。");
                }
              }}
            >
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-morandi-mist text-morandi-muted">
                {isPdf && !file.contentText ? (
                  <FileClock className="h-4 w-4" />
                ) : (
                  <FileText className="h-4 w-4" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-morandi-ink">
                  {file.name}
                </span>
                <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <Badge tone={statusTone}>{statusLabel}</Badge>
                  <Badge tone={file.sourceType === "localHandle" ? "blue" : "neutral"}>
                    {file.sourceType === "localHandle" ? "工程文件" : "浏览器副本"}
                  </Badge>
                  {hasPendingChange ? <Badge tone="amber">待确认</Badge> : null}
                  <span className="text-xs text-morandi-muted">{(file.size / 1024).toFixed(1)} KB</span>
                </span>
              </span>
            </button>

            {file.parsedStats ? (
              <p className="mt-2 text-xs text-morandi-muted">
                {file.parsedStats.sectionCount} 节 / {file.parsedStats.imageCount} 图 /{" "}
                {file.parsedStats.tableCount} 表 / {file.parsedStats.formulaCount} 式
              </p>
            ) : null}
            {file.parseError ? (
              <p className="mt-2 text-xs leading-5 text-red-600">{file.parseError}</p>
            ) : null}

            <div className="mt-3 flex flex-wrap gap-2">
              {canPreviewMarkdown ? (
                <FileAction
                  variant={isReference ? "secondary" : "ghost"}
                  icon={<Eye className="h-3.5 w-3.5" />}
                  onClick={() => onOpenMarkdown(file)}
                >
                  查看
                </FileAction>
              ) : null}
              {isMarkdown ? (
                <FileAction icon={<Pencil className="h-3.5 w-3.5" />} onClick={() => onEditFile(folderType, file)}>
                  编辑
                </FileAction>
              ) : null}
              {isReference ? (
                <FileAction icon={<Info className="h-3.5 w-3.5" />} onClick={() => onEditReference(folderType, file)}>
                  论文信息
                </FileAction>
              ) : null}
              {isReference ? (
                <FileAction
                  icon={<FilePenLine className="h-3.5 w-3.5" />}
                  onClick={() => onRenameReference(folderType, file)}
                >
                  重命名
                </FileAction>
              ) : null}
              {canOrganizeSections ? (
                <FileAction
                  icon={<ListTree className="h-3.5 w-3.5" />}
                  disabled={isOrganizing}
                  onClick={() => onOrganizeSections(folderType, file)}
                >
                  {isOrganizing ? "整理中" : "章节整理"}
                </FileAction>
              ) : null}
              {file.sourceType === "localHandle" ? (
                <FileAction icon={<RefreshCw className="h-3.5 w-3.5" />} onClick={() => onRefreshFile(folderType, file)}>
                  同步
                </FileAction>
              ) : null}
              {hasPendingChange ? (
                <FileAction variant="secondary" onClick={() => onReviewChange(folderType, file)}>
                  查看修改
                </FileAction>
              ) : null}
              <FileAction variant="danger" icon={<Trash2 className="h-3.5 w-3.5" />} onClick={() => onDeleteFile(folderType, file)}>
                删除
              </FileAction>
            </div>
          </article>
        );
      })}
    </div>
  );
}
