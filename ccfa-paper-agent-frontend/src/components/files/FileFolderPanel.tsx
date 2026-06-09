import { ChevronDown, ChevronRight, FolderOpen } from "lucide-react";
import { useState } from "react";
import type { FolderType, ProjectFile } from "../../types/file";
import { folderLabels } from "../../types/file";
import { FileList } from "./FileList";
import { FileUploadBox } from "./FileUploadBox";

export function FileFolderPanel({
  projectId,
  folderType,
  files,
  defaultExpanded = true,
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
  projectId: string;
  folderType: FolderType;
  files: ProjectFile[];
  defaultExpanded?: boolean;
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
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <section className="overflow-hidden rounded-lg border border-white/54 bg-[#fbfaf7]/88 shadow-[0_10px_24px_rgba(74,67,60,0.08),inset_0_1px_0_rgba(255,255,255,0.68)] backdrop-blur transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(74,67,60,0.12),inset_0_1px_0_rgba(255,255,255,0.78)]">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 bg-white/32 px-3 py-2.5 text-left transition hover:bg-white/58"
        onClick={() => setExpanded((current) => !current)}
      >
        <span className="flex min-w-0 items-center gap-2">
          <FolderOpen className="h-4 w-4 shrink-0 text-sage-700" />
          <span className="truncate text-sm font-semibold text-morandi-ink">{folderLabels[folderType]}</span>
          <span className="rounded bg-morandi-green px-1.5 py-0.5 text-xs text-sage-700">{files.length}</span>
        </span>
        {expanded ? <ChevronDown className="h-4 w-4 text-morandi-muted" /> : <ChevronRight className="h-4 w-4 text-morandi-muted" />}
      </button>
      {expanded ? (
        <div className="border-t border-white/42 bg-[#f7f3ee]/30 px-3 py-3">
          <FileUploadBox projectId={projectId} folderType={folderType} />
          <FileList
            folderType={folderType}
            files={files}
            onOpenMarkdown={onOpenMarkdown}
            onEditFile={onEditFile}
            onReviewChange={onReviewChange}
            onRefreshFile={onRefreshFile}
            onOrganizeSections={onOrganizeSections}
            organizingFileId={organizingFileId}
            onEditReference={onEditReference}
            onRenameReference={onRenameReference}
            onImageCaption={onImageCaption}
            onPreviewImage={onPreviewImage}
            onDeleteFile={onDeleteFile}
          />
        </div>
      ) : null}
    </section>
  );
}
