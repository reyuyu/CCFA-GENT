import {
  ArrowRight,
  BookOpen,
  Bot,
  CheckCircle2,
  Clock,
  Database,
  FileText,
  FolderOpen,
  Plus,
  Sparkles,
  Wrench,
  Trash2
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { clearProjectAgentSessions } from "../../agent/sessionAdapter";
import { useProjectStore } from "../../store/projectStore";
import type { PaperProject } from "../../types/project";
import { importProjectFromWorkspace } from "../../utils/projectImporter";
import { isDirectoryPickerSupported } from "../../utils/workspaceFs";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { EmptyState } from "../ui/EmptyState";
import { LocalConfigPanel } from "./LocalConfigPanel";
import { ProjectCreateModal } from "./ProjectCreateModal";

const formatUpdatedAt = (updatedAt: string) =>
  new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(updatedAt));

const countProjectFiles = (project: PaperProject) =>
  Object.values(project.folders).reduce((total, files) => total + files.length, 0);

function ProjectMetric({
  icon,
  label,
  value,
  tone = "neutral"
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
  tone?: "neutral" | "sage" | "blue" | "rose";
}) {
  const toneClass = {
    neutral: "bg-[#f4efe7] text-morandi-muted",
    sage: "bg-sage-100 text-sage-700",
    blue: "bg-morandi-blue text-[#536b73]",
    rose: "bg-morandi-rose text-[#7f625a]"
  }[tone];

  return (
    <div className="min-w-0 rounded-lg border border-white/70 bg-white/62 p-3 shadow-[0_10px_28px_rgba(61,58,54,0.06)] backdrop-blur">
      <div className="flex items-center gap-2">
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${toneClass}`}>
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-xs text-morandi-muted">{label}</p>
          <p className="truncate text-lg font-semibold text-morandi-ink">{value}</p>
        </div>
      </div>
    </div>
  );
}

export function ProjectList() {
  const projects = useProjectStore((state) => state.projects);
  const createProject = useProjectStore((state) => state.createProject);
  const restoreProject = useProjectStore((state) => state.restoreProject);
  const enterProject = useProjectStore((state) => state.enterProject);
  const deleteProject = useProjectStore((state) => state.deleteProject);
  const [createOpen, setCreateOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");
  const writingProjects = projects.filter((project) => project.writingStatus === "writing").length;
  const totalFiles = projects.reduce((total, project) => total + countProjectFiles(project), 0);
  const latestProject = projects[0];

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
    <main className="paper-home-bg h-full min-h-0 overflow-y-auto overscroll-contain px-4 py-6 text-morandi-ink sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="grid min-h-[360px] gap-8 py-4 lg:grid-cols-[minmax(0,1.08fr)_420px] lg:items-center lg:py-8">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <img
                src="/ccfa-paper-agent-dark-icon.png"
                alt="CCFA Paper Agent"
                className="h-14 w-14 rounded-lg border border-white/70 bg-[#1f2521] object-cover shadow-panel"
              />
              <div>
                <p className="paper-home-kicker text-sage-700">CCFA / SCI Paper Agent</p>
                <p className="mt-1 text-xs font-medium text-morandi-muted">
                  Local-first academic writing workspace
                </p>
              </div>
            </div>

            <h1 className="paper-home-title mt-7 max-w-4xl text-[#26231f]">
              让论文工程像一个清醒、可靠的研究工作台。
            </h1>
            <p className="paper-home-copy mt-5 max-w-2xl text-morandi-muted">
              统一管理初稿、参考论文、图片资产、写作线程和项目记忆，把每一次修改都落在可追踪的本地工程里。
            </p>

            <div className="mt-7 flex flex-col gap-2 sm:flex-row">
              <Button
                variant="primary"
                icon={<Plus className="h-4 w-4" />}
                className="h-10 px-4"
                onClick={() => setCreateOpen(true)}
              >
                创建论文工程
              </Button>
              <Button
                variant="secondary"
                icon={<FolderOpen className="h-4 w-4" />}
                className="h-10 px-4"
                disabled={importing || !isDirectoryPickerSupported()}
                onClick={openExistingProject}
              >
                {importing ? "打开中..." : "打开已有工程"}
              </Button>
            </div>

            <div className="mt-8 grid max-w-3xl gap-3 sm:grid-cols-3">
              <ProjectMetric
                icon={<BookOpen className="h-4 w-4" />}
                label="论文工程"
                value={projects.length}
                tone="sage"
              />
              <ProjectMetric
                icon={<Clock className="h-4 w-4" />}
                label="写作中"
                value={writingProjects}
                tone="blue"
              />
              <ProjectMetric
                icon={<Database className="h-4 w-4" />}
                label="本地文件"
                value={totalFiles}
                tone="rose"
              />
            </div>
          </div>

          <div className="paper-hero-panel relative hidden overflow-hidden rounded-xl border border-white/70 bg-[#fbfaf7]/76 p-5 shadow-panel backdrop-blur lg:block">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-sage-700">Today focus</p>
                <h2 className="mt-2 text-lg font-semibold text-morandi-ink">
                  {latestProject?.paperTitle ?? "建立你的第一个论文工程"}
                </h2>
              </div>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#252b27] text-white">
                <Bot className="h-5 w-5" />
              </span>
            </div>

            <div className="mt-5 rounded-lg border border-morandi-clay/70 bg-white/64 p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-morandi-ink">工程状态</span>
                <Badge tone={latestProject?.writingStatus === "finalized" ? "green" : "blue"}>
                  {latestProject
                    ? latestProject.writingStatus === "finalized"
                      ? "定稿"
                      : "在写"
                    : "待创建"}
                </Badge>
              </div>
              <p className="mt-3 min-h-[72px] text-sm leading-6 text-morandi-muted">
                {latestProject?.writingProgress ||
                  "创建工程后，Agent 会把初稿段落、参考论文、图片说明和写作线程组织成一个可恢复的本地状态。"}
              </p>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-morandi-clay/70 bg-[#f7f3ee]/72 p-3">
                <p className="text-xs text-morandi-muted">参考与解析</p>
                <p className="mt-2 text-2xl font-semibold text-morandi-ink">
                  {latestProject
                    ? latestProject.folders.coreReferences.length +
                      latestProject.folders.optionalReferences.length
                    : 0}
                </p>
              </div>
              <div className="rounded-lg border border-morandi-clay/70 bg-[#f7f3ee]/72 p-3">
                <p className="text-xs text-morandi-muted">写作线程</p>
                <p className="mt-2 text-2xl font-semibold text-morandi-ink">
                  {latestProject?.threads.length ?? 0}
                </p>
              </div>
            </div>

            <div className="mt-5 border-t border-morandi-clay/70 pt-4">
              <div className="grid gap-3 text-sm text-morandi-muted">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-sage-700" />
                  <span>本地工程状态持久化</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-sage-700" />
                  <span>Agent 修改先审阅再应用</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-sage-700" />
                  <span>参考论文、图片、段落进度统一管理</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden rounded-xl border border-white/80 bg-[#253029] px-5 py-5 text-white shadow-panel sm:px-6">
          <div className="absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_70%_45%,rgba(221,229,220,0.24),transparent_42%)]" />
          <div className="relative grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-center">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#dfe9dc]">
                <Sparkles className="h-4 w-4" />
                <span>当前使用说明</span>
              </div>
              <h2 className="mt-3 text-2xl font-semibold leading-snug text-white sm:text-3xl">
                目前专注 Introduction 写作与检查
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-[#e8ece6]/86 sm:text-base">
                本项目现阶段已经为 Introduction 部分的写作和检查配置了专有 skills。
                Method、Experiment、Abstract 等其他模块的专项能力还在更新中；你也可以按自己的论文风格，
                个性化编辑本地 skill，让 Agent 更懂你的写作偏好。
              </p>
            </div>
            <div className="grid gap-2 text-sm">
              <div className="flex items-center gap-3 rounded-lg border border-white/14 bg-white/10 px-3 py-2.5 backdrop-blur">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-[#cfe0ca]" />
                <span>Introduction 写作 skill 已就绪</span>
              </div>
              <div className="flex items-center gap-3 rounded-lg border border-white/14 bg-white/10 px-3 py-2.5 backdrop-blur">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-[#cfe0ca]" />
                <span>Introduction 检查 skill 已就绪</span>
              </div>
              <div className="flex items-center gap-3 rounded-lg border border-white/14 bg-white/10 px-3 py-2.5 backdrop-blur">
                <Wrench className="h-4 w-4 shrink-0 text-[#d9c8a6]" />
                <span>其他章节模块持续完善中</span>
              </div>
            </div>
          </div>
        </section>

        {error ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-soft">
            {error}
          </p>
        ) : null}

        <LocalConfigPanel />

        <section className="mt-7 pb-10">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="paper-section-title text-morandi-ink">论文工程</h2>
              <p className="mt-1 text-sm text-morandi-muted">
                从最近的研究任务进入，也可以恢复一个已有本地工程目录。
              </p>
            </div>
            {projects.length > 0 ? (
              <Button
                variant="secondary"
                icon={<FolderOpen className="h-4 w-4" />}
                disabled={importing || !isDirectoryPickerSupported()}
                onClick={openExistingProject}
              >
                {importing ? "打开中..." : "打开已有工程"}
              </Button>
            ) : null}
          </div>

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
                  className="group rounded-xl border border-white/70 bg-[#fbfaf7]/78 p-5 shadow-soft backdrop-blur transition hover:-translate-y-0.5 hover:border-sage-100 hover:bg-[#fffdf8]/92 hover:shadow-panel"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 gap-3">
                      <div className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#252b27] text-white shadow-sm transition group-hover:bg-sage-700">
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
                      更新于 {formatUpdatedAt(project.updatedAt)}
                    </span>
                  </div>
                  <p className="mt-4 line-clamp-3 min-h-[60px] text-sm leading-6 text-morandi-muted">
                    {project.writingProgress || "暂无写作进度描述"}
                  </p>
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <div className="rounded-md bg-morandi-mist/70 px-2 py-2">
                      <p className="text-xs text-morandi-muted">初稿</p>
                      <p className="text-sm font-semibold text-morandi-ink">
                        {project.folders.draftManuscripts.length}
                      </p>
                    </div>
                    <div className="rounded-md bg-morandi-mist/70 px-2 py-2">
                      <p className="text-xs text-morandi-muted">参考</p>
                      <p className="text-sm font-semibold text-morandi-ink">
                        {project.folders.coreReferences.length + project.folders.optionalReferences.length}
                      </p>
                    </div>
                    <div className="rounded-md bg-morandi-mist/70 px-2 py-2">
                      <p className="text-xs text-morandi-muted">图片</p>
                      <p className="text-sm font-semibold text-morandi-ink">
                        {project.folders.draftImages.length}
                      </p>
                    </div>
                  </div>
                  <Button
                    className="mt-5 w-full justify-between"
                    variant="secondary"
                    onClick={() => enterProject(project.id)}
                  >
                    <span>进入工程</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </article>
              ))}
            </div>
          )}
        </section>
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
