import { Copy, X } from "lucide-react";
import type { AgentContext } from "../../types/agent";
import { Button } from "../ui/Button";

export function AgentContextDrawer({
  open,
  context,
  onClose
}: {
  open: boolean;
  context?: AgentContext;
  onClose: () => void;
}) {
  if (!open) return null;

  const json = JSON.stringify(context, null, 2);

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-stone-950/25">
      <aside className="flex h-full w-full max-w-2xl flex-col bg-stone-950 text-stone-100 shadow-soft">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold">Agent Context JSON</h2>
            <p className="mt-1 text-sm text-stone-400">当前会暴露给 Agent adapter 的工程上下文。</p>
          </div>
          <Button className="h-8 w-8 border-white/10 bg-white/5 px-0 text-white hover:bg-white/10" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center justify-end border-b border-white/10 px-5 py-3">
          <Button
            className="border-white/10 bg-white/5 text-white hover:bg-white/10"
            icon={<Copy className="h-4 w-4" />}
            onClick={() => void navigator.clipboard.writeText(json)}
          >
            复制 JSON
          </Button>
        </div>
        <pre className="flex-1 overflow-auto p-5 text-xs leading-5 text-stone-200">{json}</pre>
      </aside>
    </div>
  );
}
