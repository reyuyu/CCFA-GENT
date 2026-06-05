import {
  Activity,
  AlertTriangle,
  Bot,
  Braces,
  CheckCircle2,
  Loader2,
  PenLine,
  Search,
  Wrench
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { buildAgentContext, sendMessageToAgentStream } from "../../agent/agentAdapter";
import { useProjectStore } from "../../store/projectStore";
import type { AgentProgressEvent } from "../../types/agent";
import type { ChatThread } from "../../types/chat";
import type { PaperProject } from "../../types/project";
import { createId, nowIso } from "../../utils/id";
import { Button } from "../ui/Button";
import { AgentContextDrawer } from "./AgentContextDrawer";
import { ChatComposer } from "./ChatComposer";
import { ChatMessage } from "./ChatMessage";

const editKeywordPattern =
  /(\u4fee\u6539|\u6539\u5199|\u6da6\u8272|\u91cd\u5199|\u4f18\u5316|\u7f16\u8f91|rewrite|revise|polish|modify|edit)/i;

const editCommandPattern =
  /(\u8bf7|\u8bf7\u4f60|\u5e2e\u6211|\u5e2e\u5fd9|\u9ebb\u70e6|\u628a|\u5c06|\u7ed9\u6211|\u76f4\u63a5|\u73b0\u5728|\u4fee\u6539\u521d\u7a3f|\u6539\u5199\u521d\u7a3f|\u6da6\u8272\u521d\u7a3f|\u4fee\u6539\u7b2c|\u6539\u5199\u7b2c|\u6da6\u8272\u7b2c|rewrite|revise|polish|modify|edit)/i;

const capabilityQuestionPattern =
  /(\u54ea\u4e9b\u5de5\u5177|\u4ec0\u4e48\u5de5\u5177|\u5de5\u5177|\u53ef\u4ee5.*\u5417|\u80fd.*\u5417|\u4f1a.*\u5417|what tools|which tools|can you|are you able)/i;

const claimedFileChangePattern =
  /(\u5df2.*proposeFileChange|\u5df2\u4fee\u6539|\u5df2\u6539\u5199|\u5df2\u6da6\u8272|\u5df2\u66ff\u6362|\u5df2\u66f4\u65b0|\u5b8c\u6574\u66ff\u6362|\u5df2\u751f\u6210.*\u4fee\u6539|\u5237\u65b0\u524d\u7aef\u6587\u4ef6\u67e5\u770b)/i;

function didRequestEditCommand(content: string) {
  return editKeywordPattern.test(content) && editCommandPattern.test(content) && !capabilityQuestionPattern.test(content);
}

function claimsFileChange(content: string) {
  return claimedFileChangePattern.test(content);
}

function AgentProgressCard({ events }: { events: AgentProgressEvent[] }) {
  const latestEvent = events[events.length - 1];
  const visibleHistory = events.slice(Math.max(0, events.length - 5));

  const getEventIcon = (event?: AgentProgressEvent) => {
    if (!event) return <Bot className="h-4 w-4" />;
    if (event.type === "tool_start" || event.type === "tool_end") {
      return <Wrench className="h-4 w-4" />;
    }
    if (event.type === "retrieving") {
      return <Search className="h-4 w-4" />;
    }
    if (event.type === "writing") {
      return <PenLine className="h-4 w-4" />;
    }
    if (event.type === "done") {
      return <CheckCircle2 className="h-4 w-4" />;
    }
    if (event.type === "error") {
      return <AlertTriangle className="h-4 w-4" />;
    }
    return <Activity className="h-4 w-4" />;
  };

  return (
    <div className="flex justify-start animate-paper-fade-up">
      <div className="agent-thinking-card w-full max-w-[82%] overflow-hidden rounded-xl border border-[#b9c3bd] bg-[#f7f3ee]/92 px-4 py-3 text-sm text-morandi-muted shadow-panel shadow-[#7c756e]/10 backdrop-blur">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className="relative mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#252b27] text-white shadow-sm">
              <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full bg-sage-600 ring-2 ring-[#f7f3ee] agent-live-dot" />
              {getEventIcon(latestEvent)}
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-sage-700">Agent is working</p>
              <p className="mt-1 font-medium leading-6 text-morandi-ink">
                {latestEvent?.message ?? "正在启动论文写作 Agent..."}
              </p>
            </div>
          </div>
          <Loader2 className="mt-1 h-4 w-4 shrink-0 animate-spin text-sage-700" />
        </div>

        <div className="agent-progress-track mt-4 h-1.5 rounded-full bg-morandi-clay/45" />

        {visibleHistory.length ? (
          <ol className="mt-4 space-y-2">
            {visibleHistory.map((event, index) => (
              <li
                key={`${event.createdAt}-${index}`}
                className="grid grid-cols-[28px_minmax(0,1fr)] items-start gap-2 text-xs text-morandi-muted"
              >
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-md border ${
                    event === latestEvent
                      ? "border-sage-600/45 bg-sage-100 text-sage-700"
                      : "border-morandi-clay/70 bg-white/58 text-morandi-muted"
                  }`}
                >
                  {getEventIcon(event)}
                </span>
                <div className="min-w-0 rounded-md bg-white/40 px-2.5 py-1.5">
                  <span className={event === latestEvent ? "font-medium text-morandi-ink" : ""}>
                    {event.message}
                  </span>
                  <span className="mt-0.5 block text-[10px] uppercase text-[#9a8d7f]">
                    {event.type} · {new Date(event.createdAt).toLocaleTimeString()}
                  </span>
                </div>
              </li>
            ))}
          </ol>
        ) : null}
      </div>
    </div>
  );
}

export function ChatPanel({ project }: { project: PaperProject }) {
  const appendMessage = useProjectStore((state) => state.appendMessage);
  const createThread = useProjectStore((state) => state.createThread);
  const applyAgentPatch = useProjectStore((state) => state.applyAgentPatch);
  const context = useMemo(() => buildAgentContext(project), [project]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progressEvents, setProgressEvents] = useState<AgentProgressEvent[]>([]);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const activeThread = useMemo<ChatThread | undefined>(
    () => project.threads.find((thread) => thread.id === project.activeThreadId),
    [project.activeThreadId, project.threads]
  );

  useEffect(() => {
    if (!activeThread && project.id) {
      createThread(project.id, "Writing thread");
    }
  }, [activeThread, createThread, project.id]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [activeThread?.messages.length, loading, progressEvents.length]);

  const handleSend = async (content: string) => {
    const thread = activeThread;
    if (!thread) return;

    appendMessage(project.id, thread.id, {
      id: createId("msg"),
      role: "user",
      content,
      createdAt: nowIso()
    });
    setProgressEvents([]);
    setLoading(true);

    try {
      const latestProject = useProjectStore
        .getState()
        .projects.find((candidate) => candidate.id === project.id);
      const latestThread = latestProject?.threads.find((candidate) => candidate.id === thread.id);
      let runProgressEvents: AgentProgressEvent[] = [];
      const reply = await sendMessageToAgentStream(latestProject ?? project, latestThread ?? thread, content, {
        onProgress: (event) => {
          runProgressEvents = [...runProgressEvents, event];
          setProgressEvents(runProgressEvents);
        }
      });
      const hasFileChangePatch = Boolean(
        reply.patches?.some((patch) => patch.type === "proposeFileChange")
      );
      const assistantContent =
        !hasFileChangePatch && claimsFileChange(reply.content)
          ? "没有收到后端返回的真实文件修改 patch，所以初稿没有被改动，也不会出现“查看修改/确认应用”。"
          : reply.content;

      appendMessage(project.id, thread.id, {
        id: createId("msg"),
        role: "assistant",
        content: assistantContent,
        createdAt: nowIso(),
        progressEvents: runProgressEvents
      });

      reply.patches?.forEach((patch) => applyAgentPatch(project.id, patch));

      if (hasFileChangePatch) {
        appendMessage(project.id, thread.id, {
          id: createId("msg"),
          role: "system",
          content:
            "Agent 已生成待确认的初稿修改。打开对应初稿可以预览修改；如需真正写入，请在左侧文件卡片点击“查看修改/确认应用”。",
          createdAt: nowIso()
        });
      } else if (didRequestEditCommand(content) || claimsFileChange(reply.content)) {
        appendMessage(project.id, thread.id, {
          id: createId("msg"),
          role: "system",
          content:
            "本次没有返回文件修改 patch，所以不会出现“查看修改/确认应用”。如果回复声称已经修改，前端会将其拦截。",
          createdAt: nowIso()
        });
      }
    } catch (error) {
      appendMessage(project.id, thread.id, {
        id: createId("msg"),
        role: "assistant",
        content:
          error instanceof Error
            ? `Agent backend request failed: ${error.message}`
            : "Agent backend request failed. Please confirm the Python service is running.",
        createdAt: nowIso()
      });
    } finally {
      setLoading(false);
      setProgressEvents([]);
    }
  };

  return (
    <section className="flex h-full min-w-0 flex-col bg-[linear-gradient(180deg,#d7dfda_0%,#d9d4cb_56%,#d2c7bb_100%)]">
      <div className="flex items-center justify-between border-b border-[#b8afa4] bg-[#cfd9d5]/85 px-5 py-3 backdrop-blur">
        <div>
          <h2 className="text-base font-semibold text-morandi-ink">
            {activeThread?.title ?? "Writing thread"}
          </h2>
          <p className="mt-1 text-sm text-morandi-muted">
            Paper writing assistant based on the current project and thread.
          </p>
        </div>
        <Button
          variant="secondary"
          icon={<Braces className="h-4 w-4" />}
          onClick={() => setDrawerOpen(true)}
        >
          View Agent Context
        </Button>
      </div>
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
        {activeThread?.messages.map((message) => <ChatMessage key={message.id} message={message} />)}
        {loading ? <AgentProgressCard events={progressEvents} /> : null}
      </div>
      <ChatComposer disabled={loading || !activeThread} onSend={handleSend} />
      <AgentContextDrawer open={drawerOpen} context={context} onClose={() => setDrawerOpen(false)} />
    </section>
  );
}
