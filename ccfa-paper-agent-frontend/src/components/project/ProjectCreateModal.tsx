import { FolderOpen } from "lucide-react";
import { useEffect, useState } from "react";
import type { PaperProject, ProjectMetaInput, ProjectWorkspace, WritingStatus } from "../../types/project";
import { createProjectWorkspace, isDirectoryPickerSupported } from "../../utils/workspaceFs";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Modal } from "../ui/Modal";
import { Textarea } from "../ui/Textarea";

type ProjectCreateModalProps = {
  open: boolean;
  project?: PaperProject;
  onClose: () => void;
  onSubmit: (input: ProjectMetaInput) => void;
};

const emptyInput: ProjectMetaInput = {
  paperTitle: "",
  targetVenue: "",
  writingStatus: "writing",
  writingProgress: ""
};

export function ProjectCreateModal({ open, project, onClose, onSubmit }: ProjectCreateModalProps) {
  const [form, setForm] = useState<ProjectMetaInput>(emptyInput);
  const [workspace, setWorkspace] = useState<ProjectWorkspace | undefined>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (project) {
      setForm({
        paperTitle: project.paperTitle,
        targetVenue: project.targetVenue,
        writingStatus: project.writingStatus,
        writingProgress: project.writingProgress,
        workspace: project.workspace
      });
      setWorkspace(project.workspace);
    } else {
      setForm(emptyInput);
      setWorkspace(undefined);
    }
    setError("");
  }, [project, open]);

  const update = <K extends keyof ProjectMetaInput>(key: K, value: ProjectMetaInput[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const chooseWorkspace = async () => {
    if (!form.paperTitle.trim()) {
      setError("请先填写论文名称，再选择工程目录。");
      return;
    }

    setBusy(true);
    setError("");
    try {
      const nextWorkspace = await createProjectWorkspace(form.paperTitle);
      setWorkspace(nextWorkspace);
      update("workspace", nextWorkspace);
    } catch (errorValue) {
      const message = errorValue instanceof Error ? errorValue.message : "选择工程目录失败。";
      setError(message);
    } finally {
      setBusy(false);
    }
  };

  const updateBackendWorkspacePath = (backendWorkspacePath: string) => {
    setWorkspace((current) => {
      const nextWorkspace =
        current ??
        form.workspace ?? {
          rootDirectoryName: "",
          relativePathLabel: "",
          stateFilePath: ".agent/project-state.json",
          createdAt: new Date().toISOString()
        };
      const updatedWorkspace = {
        ...nextWorkspace,
        backendWorkspacePath
      };
      update("workspace", updatedWorkspace);
      return updatedWorkspace;
    });
  };

  return (
    <Modal
      open={open}
      title={project ? "编辑工程信息" : "创建论文工程"}
      description={
        project
          ? "工程信息会同步到本地工程目录的状态文件。"
          : "创建时请选择一个父目录，系统会在其中创建论文工程目录和标准子文件夹。"
      }
      onClose={onClose}
      widthClass="max-w-xl"
    >
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (!form.paperTitle.trim()) return;
          if (!project && !workspace) {
            setError("请先选择本地工程目录。");
            return;
          }
          onSubmit({
            ...form,
            workspace,
            paperTitle: form.paperTitle.trim(),
            targetVenue: form.targetVenue.trim(),
            writingProgress: form.writingProgress.trim()
          });
        }}
      >
        <label className="block">
          <span className="text-sm font-medium text-morandi-ink">论文名称</span>
          <Input
            className="mt-1"
            value={form.paperTitle}
            onChange={(event) => update("paperTitle", event.target.value)}
            placeholder="例如：Efficient Multimodal Reasoning for Scientific Discovery"
            required
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-morandi-ink">投稿会议 / 期刊</span>
          <Input
            className="mt-1"
            value={form.targetVenue}
            onChange={(event) => update("targetVenue", event.target.value)}
            placeholder="例如：ACL / NeurIPS / IEEE T-PAMI"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-morandi-ink">写作状态</span>
          <select
            className="mt-1 h-10 w-full rounded-md border-morandi-clay/70 bg-[#fbfaf7] text-sm text-morandi-ink shadow-sm focus:border-sage-600 focus:ring-sage-600/20"
            value={form.writingStatus}
            onChange={(event) => update("writingStatus", event.target.value as WritingStatus)}
          >
            <option value="writing">在写</option>
            <option value="finalized">定稿</option>
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-medium text-morandi-ink">写作进度</span>
          <Textarea
            className="mt-1 min-h-[92px]"
            value={form.writingProgress}
            onChange={(event) => update("writingProgress", event.target.value)}
            placeholder="例如：Method 已完成，Introduction 初稿中"
          />
        </label>

        <div className="rounded-lg border border-morandi-clay/70 bg-[#f7f3ee]/80 p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-morandi-ink">本地工程目录</p>
              <p className="mt-1 truncate text-xs text-morandi-muted">
                {workspace?.relativePathLabel ?? "尚未选择"}
              </p>
            </div>
            {!project ? (
              <Button
                variant="secondary"
                icon={<FolderOpen className="h-4 w-4" />}
                disabled={busy || !isDirectoryPickerSupported()}
                onClick={chooseWorkspace}
              >
                {busy ? "创建中..." : "选择目录"}
              </Button>
            ) : null}
          </div>
          <p className="mt-2 text-xs leading-5 text-morandi-muted">
            目录结构：draft-manuscripts/、core-references/、optional-references/、
            draft-images/、.agent/project-state.json
          </p>
          <label className="mt-3 block">
            <span className="text-xs font-medium text-morandi-muted">
              后端可访问的工程绝对路径
            </span>
            <Input
              className="mt-1"
              value={workspace?.backendWorkspacePath ?? ""}
              onChange={(event) => updateBackendWorkspacePath(event.target.value)}
              placeholder="D:\\papers\\my-project"
            />
          </label>
          <p className="mt-2 text-xs leading-5 text-morandi-muted">
            填写后，后端 tools 会优先从该本地工程目录读取最新文件；修改仍然在前端 diff 中确认应用。
          </p>
          {!isDirectoryPickerSupported() && !project ? (
            <p className="mt-2 text-xs text-red-600">
              当前浏览器不支持本地目录写入，请使用 Chromium 系浏览器。
            </p>
          ) : null}
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>
            取消
          </Button>
          <Button type="submit" variant="primary" disabled={busy || (!project && !workspace)}>
            {project ? "保存修改" : "创建并进入"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
