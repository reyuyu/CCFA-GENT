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
      <div className="paper-home-bg flex h-full items-center justify-center text-morandi-muted">
        <div className="flex items-center rounded-lg border border-white/70 bg-[#fbfaf7]/78 px-4 py-3 shadow-soft backdrop-blur">
          <Loader2 className="mr-2 h-5 w-5 animate-spin text-sage-700" />
          正在载入本地论文工程...
        </div>
      </div>
    );
  }

  return activeProject ? <AppShell project={activeProject} /> : <ProjectList />;
}

export default App;
