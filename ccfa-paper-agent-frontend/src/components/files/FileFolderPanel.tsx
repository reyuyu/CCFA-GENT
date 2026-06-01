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
  onImageCaption: (fileId: string, caption: string) => void;
  onPreviewImage: (file: ProjectFile) => void;
  onDeleteFile: (folderType: FolderType, file: ProjectFile) => void;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <section className="overflow-hidden rounded-lg border border-morandi-clay/70 bg-[#fbfaf7]/90 shadow-sm">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left transition hover:bg-morandi-mist"
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
        <div className="border-t border-morandi-clay/60 px-3 py-3">
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
            onImageCaption={onImageCaption}
            onPreviewImage={onPreviewImage}
            onDeleteFile={onDeleteFile}
          />
        </div>
      ) : null}
    </section>
  );
}
