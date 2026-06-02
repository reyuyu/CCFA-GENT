import { ChevronDown, ChevronRight, CircleCheck, CircleDot, Wrench } from "lucide-react";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ChatMessage as ChatMessageType } from "../../types/chat";

function eventIcon(type: string) {
  if (type === "tool_start" || type === "retrieving") {
    return <Wrench className="mt-0.5 h-3.5 w-3.5 text-[#6c7f76]" />;
  }
  if (type === "tool_end" || type === "done") {
    return <CircleCheck className="mt-0.5 h-3.5 w-3.5 text-sage-700" />;
  }
  return <CircleDot className="mt-0.5 h-3.5 w-3.5 text-[#8b7968]" />;
}

function AgentProcessTrace({ events }: { events: NonNullable<ChatMessageType["progressEvents"]> }) {
  const [open, setOpen] = useState(false);
  if (!events.length) return null;

  return (
    <div className="mt-3 border-t border-[#d6cbbf] pt-3">
      <button
        type="button"
        className="flex items-center gap-1.5 text-xs font-medium text-[#66766f] transition hover:text-morandi-ink"
        onClick={() => setOpen((current) => !current)}
      >
        {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        查看思考和调用过程
        <span className="rounded-full bg-[#d8e1d5] px-1.5 py-0.5 text-[10px] text-sage-700">
          {events.length}
        </span>
      </button>
      {open ? (
        <ol className="mt-3 space-y-2 border-l border-[#d1c4b8] pl-3">
          {events.map((event, index) => (
            <li key={`${event.createdAt}-${index}`} className="grid grid-cols-[24px_minmax(0,1fr)] gap-2 text-xs">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#efe8df] text-[10px] font-semibold text-[#7d6e60]">
                {index + 1}
              </span>
              <div className="min-w-0">
                <div className="flex items-start gap-1.5 text-morandi-muted">
                  {eventIcon(event.type)}
                  <span className="leading-5">{event.message}</span>
                </div>
                <div className="mt-0.5 text-[10px] uppercase tracking-[0.08em] text-[#9a8d7f]">
                  {event.type} · {new Date(event.createdAt).toLocaleTimeString()}
                </div>
              </div>
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  );
}

export function ChatMessage({ message }: { message: ChatMessageType }) {
  const isUser = message.role === "user";
  const isSystem = message.role === "system";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <article
        className={`max-w-[78%] rounded-lg px-4 py-3 shadow-md ${
          isUser
            ? "bg-[#657d86] text-white shadow-[#657d86]/18 [&_*]:text-white"
            : isSystem
              ? "border border-[#c9aa7d] bg-[#ead9ca] text-[#6f5a37] shadow-[#8a6d3b]/10"
              : "border border-[#b8afa4] bg-[#f6f0e8] text-morandi-ink shadow-[#7c756e]/12"
        }`}
      >
        <div className="mb-2 flex items-center justify-between gap-4">
          <span className="text-xs font-medium uppercase tracking-[0.12em] opacity-70">
            {isUser ? "You" : isSystem ? "System" : "Paper Agent"}
          </span>
          <span className="text-xs opacity-60">{new Date(message.createdAt).toLocaleTimeString()}</span>
        </div>
        <div className="prose-paper prose prose-sm max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
        </div>
        {!isUser && !isSystem && message.progressEvents?.length ? (
          <AgentProcessTrace events={message.progressEvents} />
        ) : null}
      </article>
    </div>
  );
}
