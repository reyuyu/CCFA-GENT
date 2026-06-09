import type { PaperProject } from "../../types/project";
import { useState } from "react";
import { ProjectSidebar, WorkspaceMain } from "./ProjectSidebar";
import { WorkspaceHeader } from "./WorkspaceHeader";

export function AppShell({ project }: { project: PaperProject }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex h-full flex-col bg-paper-50 text-morandi-ink">
      <WorkspaceHeader project={project} />
      <div className="flex min-h-0 flex-1">
        <ProjectSidebar
          project={project}
          collapsed={sidebarCollapsed}
          onCollapsedChange={setSidebarCollapsed}
        />
        <main className="min-w-0 flex-1 bg-morandi-mist transition-[margin] duration-300 ease-out">
          <WorkspaceMain project={project} />
        </main>
      </div>
    </div>
  );
}
