import { FileText, FolderOpen, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { clearProjectAgentSessions } from "../../agent/sessionAdapter";
import { useProjectStore } from "../../store/projectStore";
import { importProjectFromWorkspace } from "../../utils/projectImporter";
import { isDirectoryPickerSupported } from "../../utils/workspaceFs";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { EmptyState } from "../ui/EmptyState";
import { LocalConfigPanel } from "./LocalConfigPanel";
import { ProjectCreateModal } from "./ProjectCreateModal";

export function ProjectList() {
  const projects = useProjectStore((state) => state.projects);
  const createProject = useProjectStore((state) => state.createProject);
  const restoreProject = useProjectStore((state) => state.restoreProject);
  const enterProject = useProjectStore((state) => state.enterProject);
  const deleteProject = useProjectStore((state) => state.deleteProject);
  const [createOpen, setCreateOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");

  const openExistingProject = async () => {
    setImporting(true);
    setError("");
    try {
      const project = await importProjectFromWorkspace();
      restoreProject(project);
    } catch (errorValue) {
      setError(errorValue instanceof Error ? errorValue.message : "打开已有工程失败。");
    } finally {
      setImporting(false);
    }
  };

  return (
    <main className="min-h-full overflow-y-auto bg-[linear-gradient(135deg,#d7dfda_0%,#eee8df_46%,#d8cfc4_100%)] px-6 py-8">
      <div className="mx-auto max-w-6xl">
        <section className="overflow-hidden rounded-xl border border-[#b8afa4]/70 bg-[#f7f3ee]/82 shadow-panel backdrop-blur">
          <div className="grid gap-6 p-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
            <div className="min-w-0">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-sage-700">
                CCFA / SCI Paper Agent
              </p>
              <h1 className="mt-3 text-3xl font-semibold text-morandi-ink">论文工程</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-morandi-muted">
                把初稿、参考论文、图片、写作线程和项目记忆组织到同一个论文工作台里。
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                variant="secondary"
                icon={<FolderOpen className="h-4 w-4" />}
                disabled={importing || !isDirectoryPickerSupported()}
                onClick={openExistingProject}
              >
                {importing ? "打开中..." : "打开已有工程"}
              </Button>
              <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setCreateOpen(true)}>
                创建工程
              </Button>
            </div>
          </div>
        </section>

        {error ? (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <LocalConfigPanel />

        <div className="mt-6">
          {projects.length === 0 ? (
            <EmptyState
              title="还没有论文工程"
              description="创建一个新工程，或打开已有本地工程目录来恢复论文、线程和聊天记录。"
              action={
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    variant="secondary"
                    icon={<FolderOpen className="h-4 w-4" />}
                    disabled={importing || !isDirectoryPickerSupported()}
                    onClick={openExistingProject}
                  >
                    打开已有工程
                  </Button>
                  <Button
                    variant="primary"
                    icon={<Plus className="h-4 w-4" />}
                    onClick={() => setCreateOpen(true)}
                  >
                    创建论文工程
                  </Button>
                </div>
              }
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {projects.map((project) => (
                <article
                  key={project.id}
                  className="rounded-xl border border-[#b8afa4]/70 bg-[#f7f3ee]/88 p-5 shadow-soft transition hover:-translate-y-0.5 hover:bg-[#fbfaf7]/92 hover:shadow-panel"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 gap-3">
                      <div className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-morandi-blue text-[#536b73]">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <h2 className="line-clamp-2 text-base font-semibold text-morandi-ink">
                          {project.paperTitle}
                        </h2>
                        <p className="mt-1 text-sm text-morandi-muted">
                          {project.targetVenue || "未设置投稿目标"}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      className="h-8 w-8 shrink-0 px-0 text-red-600 hover:bg-red-50"
                      onClick={() => {
                        void clearProjectAgentSessions(project.id);
                        deleteProject(project.id);
                      }}
                      aria-label="删除工程"
                      title="删除工程"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <Badge tone={project.writingStatus === "writing" ? "blue" : "green"}>
                      {project.writingStatus === "writing" ? "在写" : "定稿"}
                    </Badge>
                    <span className="text-xs text-morandi-muted">
                      更新于 {new Date(project.updatedAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="mt-4 line-clamp-3 min-h-[60px] text-sm leading-6 text-morandi-muted">
                    {project.writingProgress || "暂无写作进度描述"}
                  </p>
                  <Button className="mt-5 w-full" variant="secondary" onClick={() => enterProject(project.id)}>
                    进入工程
                  </Button>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>

      <ProjectCreateModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={(input) => {
          createProject(input);
          setCreateOpen(false);
        }}
      />
    </main>
  );
}
