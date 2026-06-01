import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ChatMessage as ChatMessageType } from "../../types/chat";

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
      </article>
    </div>
  );
}
