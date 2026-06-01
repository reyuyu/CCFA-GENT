import type { PaperProject } from "../../types/project";
import { Badge } from "../ui/Badge";

export function ProjectMetaPanel({ project }: { project: PaperProject }) {
  return (
    <div className="grid gap-3 text-sm md:grid-cols-[auto_auto_1fr] md:items-center">
      <div>
        <span className="text-morandi-muted">{"\u76ee\u6807\uff1a"}</span>
        <span className="font-medium text-morandi-ink">
          {project.targetVenue || "\u672a\u8bbe\u7f6e"}
        </span>
      </div>
      <Badge tone={project.writingStatus === "writing" ? "blue" : "green"}>
        {project.writingStatus === "writing" ? "\u5728\u5199" : "\u5b9a\u7a3f"}
      </Badge>
      <p className="truncate text-morandi-muted">
        {project.writingProgress || "\u6682\u65e0\u5199\u4f5c\u8fdb\u5ea6"}
        {project.workspace ? ` / ${project.workspace.relativePathLabel}` : ""}
        {project.workspace?.backendWorkspacePath ? ` / backend: ${project.workspace.backendWorkspacePath}` : ""}
      </p>
    </div>
  );
}
