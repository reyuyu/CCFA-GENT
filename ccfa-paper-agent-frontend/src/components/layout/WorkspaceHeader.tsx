import { LogOut, Pencil } from "lucide-react";
import { useState } from "react";
import { useProjectStore } from "../../store/projectStore";
import type { PaperProject } from "../../types/project";
import { ProjectCreateModal } from "../project/ProjectCreateModal";
import { ProjectMetaPanel } from "../project/ProjectMetaPanel";
import { Button } from "../ui/Button";

export function WorkspaceHeader({ project }: { project: PaperProject }) {
  const exitProject = useProjectStore((state) => state.exitProject);
  const updateProjectMeta = useProjectStore((state) => state.updateProjectMeta);
  const [editOpen, setEditOpen] = useState(false);

  return (
    <header className="flex h-[88px] shrink-0 items-center justify-between gap-5 border-b border-morandi-clay/70 bg-[#fbfaf7]/90 px-6 backdrop-blur">
      <div className="min-w-0">
        <h1 className="truncate text-xl font-semibold text-morandi-ink">{project.paperTitle}</h1>
        <div className="mt-2">
          <ProjectMetaPanel project={project} />
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button
          variant="secondary"
          icon={<Pencil className="h-4 w-4" />}
          onClick={() => setEditOpen(true)}
        >
          编辑工程
        </Button>
        <Button variant="ghost" icon={<LogOut className="h-4 w-4" />} onClick={exitProject}>
          退出
        </Button>
      </div>

      <ProjectCreateModal
        open={editOpen}
        project={project}
        onClose={() => setEditOpen(false)}
        onSubmit={(input) => {
          updateProjectMeta(project.id, input);
          setEditOpen(false);
        }}
      />
    </header>
  );
}
