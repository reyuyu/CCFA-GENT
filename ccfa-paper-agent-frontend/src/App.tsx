import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { AppShell } from "./components/layout/AppShell";
import { ProjectList } from "./components/project/ProjectList";
import { selectActiveProject, useProjectStore } from "./store/projectStore";

function App() {
  const hydrate = useProjectStore((state) => state.hydrate);
  const isHydrated = useProjectStore((state) => state.isHydrated);
  const activeProject = useProjectStore(selectActiveProject);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  if (!isHydrated) {
    return (
      <div className="flex h-full items-center justify-center bg-[linear-gradient(135deg,#d7dfda_0%,#eee8df_56%,#d8cfc4_100%)] text-morandi-muted">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        正在载入本地论文工程...
      </div>
    );
  }

  return activeProject ? <AppShell project={activeProject} /> : <ProjectList />;
}

export default App;
