import { MessageSquarePlus, Trash2 } from "lucide-react";
import { clearThreadAgentSession } from "../../agent/sessionAdapter";
import { useProjectStore } from "../../store/projectStore";
import type { ChatThread } from "../../types/chat";
import { Button } from "../ui/Button";

export function ThreadList({
  projectId,
  activeThreadId,
  threads
}: {
  projectId: string;
  activeThreadId?: string;
  threads: ChatThread[];
}) {
  const createThread = useProjectStore((state) => state.createThread);
  const deleteThread = useProjectStore((state) => state.deleteThread);
  const switchThread = useProjectStore((state) => state.switchThread);

  return (
    <section className="rounded-lg border border-morandi-clay/70 bg-[#fbfaf7]/90 shadow-sm">
      <div className="flex items-center justify-between border-b border-morandi-clay/60 px-3 py-2.5">
        <div>
          <h3 className="text-sm font-semibold text-morandi-ink">写作线程</h3>
          <p className="mt-0.5 text-xs text-morandi-muted">{threads.length} 个对话上下文</p>
        </div>
        <Button
          className="h-8 w-8 px-0"
          variant="ghost"
          aria-label="新建线程"
          title="新建线程"
          onClick={() => createThread(projectId)}
        >
          <MessageSquarePlus className="h-4 w-4" />
        </Button>
      </div>
      <div className="max-h-[calc(100vh-180px)] space-y-1 overflow-y-auto p-2">
        {threads.map((thread) => (
          <div
            key={thread.id}
            className={`group flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition ${
              thread.id === activeThreadId
                ? "bg-morandi-green font-medium text-sage-700"
                : "text-morandi-muted hover:bg-morandi-mist"
            }`}
          >
            <button
              type="button"
              className="min-w-0 flex-1 text-left"
              onClick={() => switchThread(projectId, thread.id)}
            >
              <span className="block truncate">{thread.title}</span>
              <span className="mt-0.5 block text-xs text-morandi-muted">
                {thread.messages.length} 条消息
              </span>
            </button>
            <button
              type="button"
              title="删除线程"
              aria-label={`删除线程 ${thread.title}`}
              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-morandi-muted opacity-70 transition hover:bg-red-50 hover:text-red-600 hover:opacity-100 focus:opacity-100"
              onClick={(event) => {
                event.stopPropagation();
                if (window.confirm(`确定删除线程“${thread.title}”吗？`)) {
                  void clearThreadAgentSession(projectId, thread.id);
                  deleteThread(projectId, thread.id);
                }
              }}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
