import { Files, MessagesSquare, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useState } from "react";
import { organizeMarkdownSections } from "../../agent/markdownOrganizerApi";
import { useProjectStore } from "../../store/projectStore";
import type { FolderType, ProjectFile } from "../../types/file";
import type { PaperProject } from "../../types/project";
import { ChatPanel } from "../chat/ChatPanel";
import { ThreadList } from "../chat/ThreadList";
import { FileChangeReviewModal } from "../files/FileChangeReviewModal";
import { FileEditModal } from "../files/FileEditModal";
import { FileFolderPanel } from "../files/FileFolderPanel";
import { MarkdownPreviewModal } from "../files/MarkdownPreviewModal";
import { ReferencePaperMetaForm } from "../files/ReferencePaperMetaForm";
import { WritingMapPanel } from "../project/WritingMapPanel";
import { Modal } from "../ui/Modal";

const folderOrder: FolderType[] = [
  "draftManuscripts",
  "coreReferences",
  "optionalReferences",
  "draftImages"
];

const defaultExpandedFolders: Record<FolderType, boolean> = {
  draftManuscripts: true,
  coreReferences: true,
  optionalReferences: false,
  draftImages: false
};

export function ProjectSidebar({
  project,
  collapsed,
  onCollapsedChange
}: {
  project: PaperProject;
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
}) {
  const updateReferenceMeta = useProjectStore((state) => state.updateReferenceMeta);
  const renameReferenceFile = useProjectStore((state) => state.renameReferenceFile);
  const updateImageCaption = useProjectStore((state) => state.updateImageCaption);
  const updateDraftParagraphStatus = useProjectStore((state) => state.updateDraftParagraphStatus);
  const deleteFile = useProjectStore((state) => state.deleteFile);
  const refreshFileFromDisk = useProjectStore((state) => state.refreshFileFromDisk);
  const proposeFileChange = useProjectStore((state) => state.proposeFileChange);
  const applyPendingFileChange = useProjectStore((state) => state.applyPendingFileChange);
  const rejectPendingFileChange = useProjectStore((state) => state.rejectPendingFileChange);
  const [markdownFile, setMarkdownFile] = useState<ProjectFile | undefined>();
  const [markdownFolder, setMarkdownFolder] = useState<FolderType | undefined>();
  const [editingTarget, setEditingTarget] = useState<{
    folderType: FolderType;
    file: ProjectFile;
  }>();
  const [reviewTarget, setReviewTarget] = useState<{
    folderType: FolderType;
    file: ProjectFile;
  }>();
  const [referenceTarget, setReferenceTarget] = useState<{
    folderType: FolderType;
    file: ProjectFile;
  }>();
  const [imagePreview, setImagePreview] = useState<ProjectFile | undefined>();
  const [applyingChange, setApplyingChange] = useState(false);
  const [organizingFileId, setOrganizingFileId] = useState<string | undefined>();
  const [sidebarView, setSidebarView] = useState<"files" | "threads">("files");

  const currentMarkdownFile = markdownFile
    ? project.folders[markdownFolder!].find((file) => file.id === markdownFile.id) ?? markdownFile
    : undefined;
  const currentEditingFile = editingTarget
    ? project.folders[editingTarget.folderType].find((file) => file.id === editingTarget.file.id) ??
      editingTarget.file
    : undefined;
  const currentReviewFile = reviewTarget
    ? project.folders[reviewTarget.folderType].find((file) => file.id === reviewTarget.file.id) ??
      reviewTarget.file
    : undefined;

  const removeFile = (targetFolder: FolderType, file: ProjectFile) => {
    if (!window.confirm(`确定删除文件“${file.name}”吗？`)) return;
    deleteFile(project.id, targetFolder, file.id);
    if (markdownFile?.id === file.id) {
      setMarkdownFile(undefined);
      setMarkdownFolder(undefined);
    }
    if (editingTarget?.file.id === file.id) {
      setEditingTarget(undefined);
    }
    if (reviewTarget?.file.id === file.id) {
      setReviewTarget(undefined);
    }
    if (referenceTarget?.file.id === file.id) {
      setReferenceTarget(undefined);
    }
    if (imagePreview?.id === file.id) {
      setImagePreview(undefined);
    }
  };

  const renameReference = async (targetFolder: FolderType, file: ProjectFile) => {
    const nextName = window.prompt("请输入新的参考论文文件名：", file.name);
    if (nextName === null || nextName.trim() === "" || nextName.trim() === file.name) return;

    try {
      await renameReferenceFile(project.id, targetFolder, file.id, nextName);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "重命名参考论文失败。");
    }
  };

  return (
    <>
      <div
        className={`relative z-20 h-full shrink-0 transition-[width] duration-300 ease-out ${
          collapsed ? "w-0" : "w-[376px]"
        }`}
      >
        <aside
          className={`absolute inset-y-0 left-0 flex h-full w-[376px] flex-col overflow-hidden border-r border-[#b9aaa0] bg-[linear-gradient(180deg,rgba(247,243,238,0.96)_0%,rgba(238,232,223,0.94)_48%,rgba(224,216,207,0.92)_100%)] shadow-[16px_0_42px_rgba(74,67,60,0.16)] backdrop-blur transition-transform duration-300 ease-out ${
            collapsed ? "pointer-events-none -translate-x-full" : "translate-x-0"
          }`}
          aria-hidden={collapsed}
        >
        <div className="border-b border-white/40 bg-[#fbfaf7]/72 px-4 py-3 shadow-[0_10px_24px_rgba(74,67,60,0.06)] backdrop-blur">
          <div className="grid grid-cols-2 gap-1 rounded-lg bg-morandi-clay/35 p-1">
            <button
              type="button"
              className={`flex h-9 items-center justify-center gap-2 rounded-md text-sm font-medium transition-all duration-200 active:scale-[0.98] ${
                sidebarView === "files"
                  ? "bg-[#fbfaf7] text-morandi-ink shadow-sm"
                  : "text-morandi-muted hover:bg-white/35 hover:text-morandi-ink"
              }`}
              onClick={() => setSidebarView("files")}
            >
              <Files className="h-4 w-4" />
              资料
            </button>
            <button
              type="button"
              className={`flex h-9 items-center justify-center gap-2 rounded-md text-sm font-medium transition-all duration-200 active:scale-[0.98] ${
                sidebarView === "threads"
                  ? "bg-[#fbfaf7] text-morandi-ink shadow-sm"
                  : "text-morandi-muted hover:bg-white/35 hover:text-morandi-ink"
              }`}
              onClick={() => setSidebarView("threads")}
            >
              <MessagesSquare className="h-4 w-4" />
              线程
            </button>
          </div>
        </div>

        {sidebarView === "files" ? (
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4 pr-3">
            <WritingMapPanel
              memory={project.scientificProblemMemory}
              outline={project.introductionOutline}
            />
            {folderOrder.map((folderType) => (
              <FileFolderPanel
                key={folderType}
                projectId={project.id}
                folderType={folderType}
                files={project.folders[folderType]}
                defaultExpanded={defaultExpandedFolders[folderType]}
                onOpenMarkdown={(file) => {
                  setMarkdownFile(file);
                  setMarkdownFolder(folderType);
                }}
                onEditFile={(targetFolder, file) =>
                  setEditingTarget({ folderType: targetFolder, file })
                }
                onReviewChange={(targetFolder, file) =>
                  setReviewTarget({ folderType: targetFolder, file })
                }
                onRefreshFile={(targetFolder, file) => {
                  void refreshFileFromDisk(project.id, targetFolder, file.id);
                }}
                onOrganizeSections={(targetFolder, file) => {
                  if (!file.contentText || organizingFileId) return;
                  setOrganizingFileId(file.id);
                  void organizeMarkdownSections(file.name, file.contentText)
                    .then((result) => {
                      proposeFileChange(
                        project.id,
                        targetFolder,
                        file.id,
                        result.organizedMarkdown,
                        result.summary || "Agent 仅整理 Markdown 标题结构，正文保持不变。",
                        "agent"
                      );
                      setReviewTarget({ folderType: targetFolder, file });
                    })
                    .catch((error) => {
                      window.alert(error instanceof Error ? error.message : "章节整理失败。");
                    })
                    .finally(() => setOrganizingFileId(undefined));
                }}
                organizingFileId={organizingFileId}
                onEditReference={(targetFolder, file) =>
                  setReferenceTarget({ folderType: targetFolder, file })
                }
                onRenameReference={(targetFolder, file) => {
                  void renameReference(targetFolder, file);
                }}
                onImageCaption={(fileId, caption) => updateImageCaption(project.id, fileId, caption)}
                onPreviewImage={(file) => setImagePreview(file)}
                onDeleteFile={removeFile}
              />
            ))}
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            <ThreadList
              projectId={project.id}
              activeThreadId={project.activeThreadId}
              threads={project.threads}
            />
          </div>
        )}
        </aside>
        <button
          type="button"
          className={`absolute z-30 inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#b9aaa0] bg-[#fbfaf7]/96 text-sage-700 shadow-panel backdrop-blur transition-all duration-300 ease-out hover:bg-white hover:text-morandi-ink focus:outline-none focus:ring-2 focus:ring-sage-600/35 ${
            collapsed
              ? "left-2 top-1/2 -translate-y-1/2 hover:translate-x-0.5"
              : "-right-4 top-4 hover:-translate-y-0.5"
          }`}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!collapsed}
          onClick={() => onCollapsedChange(!collapsed)}
        >
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>
      </div>

      <MarkdownPreviewModal
        open={Boolean(markdownFile)}
        file={currentMarkdownFile}
        isDraft={markdownFolder === "draftManuscripts"}
        onClose={() => {
          setMarkdownFile(undefined);
          setMarkdownFolder(undefined);
        }}
        onParagraphChange={(paragraphId, patch) => {
          if (currentMarkdownFile) {
            updateDraftParagraphStatus(project.id, currentMarkdownFile.id, paragraphId, patch);
          }
        }}
      />

      <ReferencePaperMetaForm
        open={Boolean(referenceTarget)}
        file={referenceTarget?.file}
        folderType={referenceTarget?.folderType}
        onClose={() => setReferenceTarget(undefined)}
        onSave={(folderType, fileId, meta) => {
          updateReferenceMeta(project.id, folderType, fileId, meta);
          setReferenceTarget(undefined);
        }}
      />

      <FileEditModal
        open={Boolean(editingTarget)}
        file={currentEditingFile}
        onClose={() => setEditingTarget(undefined)}
        onCreateProposal={(newContent, summary) => {
          if (!editingTarget) return;
          proposeFileChange(
            project.id,
            editingTarget.folderType,
            editingTarget.file.id,
            newContent,
            summary,
            "manual"
          );
          setReviewTarget(editingTarget);
          setEditingTarget(undefined);
        }}
      />

      <FileChangeReviewModal
        open={Boolean(reviewTarget)}
        file={currentReviewFile}
        applying={applyingChange}
        onClose={() => setReviewTarget(undefined)}
        onReject={() => {
          if (!reviewTarget) return;
          rejectPendingFileChange(project.id, reviewTarget.folderType, reviewTarget.file.id);
          setReviewTarget(undefined);
        }}
        onApply={async () => {
          if (!reviewTarget) return;
          setApplyingChange(true);
          try {
            await applyPendingFileChange(project.id, reviewTarget.folderType, reviewTarget.file.id);
            setReviewTarget(undefined);
          } catch (error) {
            window.alert(error instanceof Error ? error.message : "应用修改失败。");
          } finally {
            setApplyingChange(false);
          }
        }}
      />

      <Modal
        open={Boolean(imagePreview)}
        title={imagePreview?.name ?? "图片预览"}
        onClose={() => setImagePreview(undefined)}
        widthClass="max-w-4xl"
      >
        {imagePreview?.dataUrl ? (
          <img
            src={imagePreview.dataUrl}
            alt={imagePreview.name}
            className="max-h-[70vh] w-full rounded-md object-contain"
          />
        ) : null}
      </Modal>
    </>
  );
}

export function WorkspaceMain({ project }: { project: PaperProject }) {
  return <ChatPanel project={project} />;
}
