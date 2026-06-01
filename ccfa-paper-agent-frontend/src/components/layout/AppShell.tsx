import type { PaperProject } from "../../types/project";
import { ProjectSidebar, WorkspaceMain } from "./ProjectSidebar";
import { WorkspaceHeader } from "./WorkspaceHeader";

export function AppShell({ project }: { project: PaperProject }) {
  return (
    <div className="flex h-full flex-col bg-paper-50 text-morandi-ink">
      <WorkspaceHeader project={project} />
      <div className="flex min-h-0 flex-1">
        <ProjectSidebar project={project} />
        <main className="min-w-0 flex-1 bg-morandi-mist">
          <WorkspaceMain project={project} />
        </main>
      </div>
    </div>
  );
}
