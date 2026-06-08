import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  CircleCheck,
  CircleDot,
  ExternalLink,
  FilePlus2,
  Loader2,
  PenLine,
  Search,
  Wrench,
  XCircle
} from "lucide-react";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { parsePdfUrlWithMinerU } from "../../agent/mineruApi";
import { useProjectStore } from "../../store/projectStore";
import type { AgentReferenceRequest } from "../../types/agent";
import type { ChatMessage as ChatMessageType } from "../../types/chat";
import type { PaperProject } from "../../types/project";
import { createProjectFile, createProjectFileInWorkspace } from "../../utils/fileReader";
import {
  createMineruAssetFolderName,
  createParsedMarkdownFile,
  rewriteMineruAssetLinks
} from "../../utils/mineruMarkdown";
import { sanitizeFolderName, saveAssetsIntoWorkspace } from "../../utils/workspaceFs";
import { Button } from "../ui/Button";

type ReferenceFolderType = AgentReferenceRequest["suggestedReferenceScope"];

function eventIcon(type: string) {
  if (type === "tool_start" || type === "retrieving") {
    return type === "retrieving" ? (
      <Search className="mt-0.5 h-3.5 w-3.5 text-[#6c7f76]" />
    ) : (
      <Wrench className="mt-0.5 h-3.5 w-3.5 text-[#6c7f76]" />
    );
  }
  if (type === "tool_end" || type === "done") {
    return <CircleCheck className="mt-0.5 h-3.5 w-3.5 text-sage-700" />;
  }
  if (type === "writing") {
    return <PenLine className="mt-0.5 h-3.5 w-3.5 text-[#7f625a]" />;
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
        className="group flex items-center gap-1.5 rounded-md px-1 py-1 text-xs font-medium text-[#66766f] transition-all duration-200 hover:bg-white/42 hover:text-morandi-ink"
        onClick={() => setOpen((current) => !current)}
      >
        {open ? (
          <ChevronDown className="h-3.5 w-3.5 transition-transform group-hover:translate-y-0.5" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        )}
        查看思考和调用过程
        <span className="rounded-full bg-[#d8e1d5] px-1.5 py-0.5 text-[10px] text-sage-700">
          {events.length}
        </span>
      </button>
      {open ? (
        <ol className="mt-3 space-y-2 rounded-lg border border-[#d1c4b8]/70 bg-white/32 p-3 animate-paper-fade-up">
          {events.map((event, index) => (
            <li key={`${event.createdAt}-${index}`} className="grid grid-cols-[28px_minmax(0,1fr)] gap-2 text-xs">
              <span className="flex h-6 w-6 items-center justify-center rounded-md border border-morandi-clay/70 bg-[#efe8df] text-[10px] font-semibold text-[#7d6e60]">
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

function requestPdfFileName(request: AgentReferenceRequest) {
  const doi = typeof request.externalIds?.DOI === "string" ? request.externalIds.DOI : "";
  const base = sanitizeFolderName(doi || request.title).slice(0, 96) || "retrieved-paper";
  return `${base}.pdf`;
}

function statusLabel(status: AgentReferenceRequest["status"]) {
  if (status === "parsing") return "Parsing";
  if (status === "added") return "Added";
  if (status === "rejected") return "Ignored";
  if (status === "failed") return "Failed";
  if (status === "accepted") return "Accepted";
  return "Pending";
}

function ReferenceRequestList({
  message,
  project
}: {
  message: ChatMessageType;
  project: PaperProject;
}) {
  const uploadFileToFolder = useProjectStore((state) => state.uploadFileToFolder);
  const updateMessageReferenceRequest = useProjectStore((state) => state.updateMessageReferenceRequest);
  const [busyRequestId, setBusyRequestId] = useState<string | null>(null);

  const requests = message.referenceRequests ?? [];
  if (!requests.length || !project.activeThreadId) return null;

  const updateRequest = (requestId: string, patch: Partial<AgentReferenceRequest>) => {
    updateMessageReferenceRequest(project.id, project.activeThreadId!, message.id, requestId, patch);
  };

  const addReference = async (request: AgentReferenceRequest, folderType: ReferenceFolderType) => {
    setBusyRequestId(request.id);
    updateRequest(request.id, { status: "parsing", errorMessage: undefined });
    try {
      const pdfFileName = requestPdfFileName(request);
      const parsed = await parsePdfUrlWithMinerU(request.pdfUrl, pdfFileName);
      const assetFolderName = createMineruAssetFolderName(pdfFileName);
      const markdown = rewriteMineruAssetLinks(parsed.markdown, assetFolderName);

      if (project.workspace?.rootDirectoryHandle && parsed.assets.length > 0) {
        await saveAssetsIntoWorkspace(
          project.workspace.rootDirectoryHandle,
          folderType,
          assetFolderName,
          parsed.assets
        );
      }

      const markdownFile = createParsedMarkdownFile(pdfFileName, markdown, folderType);
      const projectFile = project.workspace?.rootDirectoryHandle
        ? await createProjectFileInWorkspace(project, markdownFile, folderType)
        : await createProjectFile(markdownFile, folderType);

      uploadFileToFolder(project.id, folderType, {
        ...projectFile,
        parsedMarkdownUrl: parsed.markdownUrl,
        mineruTaskId: parsed.taskId,
        parsedSections: parsed.sections,
        parsedStats: parsed.stats,
        parsedImageAssets: parsed.assets,
        parsedAssetFolder: assetFolderName,
        referenceMeta: {
          paperYear: request.year ? String(request.year) : "",
          paperVenueOrQuality: request.venue ?? "",
          semanticScholarPaperId: request.semanticScholarPaperId ?? "",
          referenceSummary: request.whyUsefulForThisProject || request.relevanceReason,
          referenceSections: request.usefulForSections?.join("; ") || "Queued by Agent for close reading."
        }
      });

      updateRequest(request.id, { status: "added", suggestedReferenceScope: folderType });
    } catch (error) {
      updateRequest(request.id, {
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "Failed to parse and add this PDF."
      });
    } finally {
      setBusyRequestId(null);
    }
  };

  return (
    <div className="mt-4 border-t border-[#d6cbbf] pt-3">
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-[#66766f]">
        <BookOpen className="h-3.5 w-3.5" />
        Reference Reading Requests
      </div>
      <div className="space-y-2">
        {requests.map((request) => {
          const isBusy = busyRequestId === request.id || request.status === "parsing";
          const isFinal = request.status === "added" || request.status === "rejected";
          return (
            <div key={request.id} className="rounded-md border border-[#c9c0b4] bg-white/42 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#7a6b5d]">
                    <span className="rounded bg-[#e0e8df] px-1.5 py-0.5 text-sage-700">
                      {statusLabel(request.status)}
                    </span>
                    {request.year ? <span>{request.year}</span> : null}
                    {request.venue ? <span>{request.venue}</span> : null}
                    <span>{request.suggestedReferenceScope === "coreReferences" ? "Core" : "Optional"}</span>
                  </div>
                  <h4 className="mt-1 text-sm font-semibold leading-5 text-morandi-ink">
                    {request.title}
                  </h4>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-morandi-muted">
                    {request.whyUsefulForThisProject || request.relevanceReason}
                  </p>
                  {request.errorMessage ? (
                    <p className="mt-2 text-xs leading-5 text-red-700">{request.errorMessage}</p>
                  ) : null}
                </div>
                {request.paperUrl ? (
                  <a
                    href={request.paperUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0 rounded-md p-1.5 text-morandi-muted transition hover:bg-white/70 hover:text-morandi-ink"
                    title="Open paper page"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                ) : null}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  className="h-8"
                  variant="primary"
                  icon={isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FilePlus2 className="h-3.5 w-3.5" />}
                  disabled={isBusy || isFinal}
                  onClick={() => void addReference(request, request.suggestedReferenceScope)}
                >
                  Add
                </Button>
                {request.suggestedReferenceScope !== "coreReferences" ? (
                  <Button
                    className="h-8"
                    variant="secondary"
                    disabled={isBusy || isFinal}
                    onClick={() => void addReference(request, "coreReferences")}
                  >
                    Add as core
                  </Button>
                ) : null}
                <Button
                  className="h-8"
                  variant="ghost"
                  icon={<XCircle className="h-3.5 w-3.5" />}
                  disabled={isBusy || isFinal}
                  onClick={() => updateRequest(request.id, { status: "rejected" })}
                >
                  Ignore
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ChatMessage({ message, project }: { message: ChatMessageType; project: PaperProject }) {
  const isUser = message.role === "user";
  const isSystem = message.role === "system";

  return (
    <div className={`flex animate-paper-fade-up ${isUser ? "justify-end" : "justify-start"}`}>
      <article
        className={`max-w-[78%] rounded-lg px-4 py-3 shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-panel ${
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
        {!isUser && !isSystem ? <ReferenceRequestList message={message} project={project} /> : null}
        {!isUser && !isSystem && message.progressEvents?.length ? (
          <AgentProcessTrace events={message.progressEvents} />
        ) : null}
      </article>
    </div>
  );
}
