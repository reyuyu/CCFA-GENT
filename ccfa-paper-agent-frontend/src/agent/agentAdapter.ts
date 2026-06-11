import type {
  AgentContext,
  AgentMode,
  AgentPatch,
  AgentProgressEvent,
  AgentReferenceRequest,
  AgentResponse,
  AgentStreamEvent
} from "../types/agent";
import type { ChatThread } from "../types/chat";
import { folderLabels } from "../types/file";
import type { FolderType } from "../types/file";
import type { PaperProject } from "../types/project";
import { getAgentApiUrl } from "./agentApi";

const folderTypes: FolderType[] = [
  "draftManuscripts",
  "coreReferences",
  "optionalReferences",
  "draftImages"
];

function isSupportedAgentPatch(patch: AgentPatch): patch is AgentPatch {
  return (
    patch.type === "updateProjectMeta" ||
    patch.type === "proposeFileChange" ||
    patch.type === "appendSystemMessage" ||
    patch.type === "updateDraftParagraphStatus" ||
    patch.type === "updateIntroductionOutline" ||
    patch.type === "updateScientificProblemMemory"
  );
}

function isReferenceRequest(request: unknown): request is AgentReferenceRequest {
  if (!request || typeof request !== "object") return false;
  const candidate = request as Partial<AgentReferenceRequest>;
  return Boolean(
    candidate.id &&
      candidate.title &&
      candidate.pdfUrl &&
      (candidate.suggestedReferenceScope === "coreReferences" ||
        candidate.suggestedReferenceScope === "optionalReferences")
  );
}

function normalizeReferenceRequests(requests: unknown): AgentReferenceRequest[] | undefined {
  if (!Array.isArray(requests)) return undefined;
  const normalized = requests.filter(isReferenceRequest).map((request) => ({
    ...request,
    authors: Array.isArray(request.authors) ? request.authors : [],
    usefulForSections: Array.isArray(request.usefulForSections) ? request.usefulForSections : [],
    status: request.status ?? "pending"
  }));
  return normalized.length ? normalized : undefined;
}

export function buildAgentContext(project: PaperProject): AgentContext {
  return {
    projectMeta: {
      id: project.id,
      paperTitle: project.paperTitle,
      targetVenue: project.targetVenue,
      writingStatus: project.writingStatus,
      writingProgress: project.writingProgress,
      backendWorkspacePath: project.workspace?.backendWorkspacePath?.trim() || undefined,
      updatedAt: project.updatedAt
    },
    introductionOutline: project.introductionOutline,
    scientificProblemMemory: project.scientificProblemMemory,
    folderSummary: folderTypes.reduce(
      (summary, folderType) => ({
        ...summary,
        [folderType]: project.folders[folderType].length
      }),
      {} as Record<FolderType, number>
    ),
    files: folderTypes.flatMap((folderType) =>
      project.folders[folderType].map((file) => ({
        id: file.id,
        name: file.name,
        folderType,
        mimeType: file.mimeType,
        size: file.size,
        uploadedAt: file.uploadedAt,
        localPath: file.localPath,
        hasPendingChange: Boolean(file.pendingChange && file.pendingChange.status === "pending"),
        parseStatus: file.parseStatus,
        hasMarkdownContent: Boolean(file.contentText),
        hasImageData: Boolean(file.dataUrl)
      }))
    ),
    referencePaperMetas: (["coreReferences", "optionalReferences"] as FolderType[]).flatMap(
      (folderType) =>
        project.folders[folderType]
          .filter((file) => file.referenceMeta)
          .map((file) => ({
            fileId: file.id,
            fileName: file.name,
            folderType,
            meta: file.referenceMeta!
          }))
    ),
    imageAssets: project.folders.draftImages.map((file) => ({
      id: file.id,
      name: file.name,
      caption: file.imageCaption,
      markdownReference: `![${file.imageCaption || "Figure caption"}](local-image://${file.id})`
    })),
    draftManuscripts: project.folders.draftManuscripts.map((file) => ({
      id: file.id,
      name: file.name,
      folderType: "draftManuscripts",
      localPath: file.localPath,
      contentText: file.contentText,
      draftParagraphs: file.draftParagraphs
    })),
    referencePapers: (["coreReferences", "optionalReferences"] as const).flatMap((folderType) =>
      project.folders[folderType].map((file) => ({
        id: file.id,
        name: file.name,
        folderType,
        localPath: file.localPath,
        contentText: file.contentText,
        referenceMeta: file.referenceMeta
      }))
    )
  };
}

export async function sendMessageToAgent(
  project: PaperProject,
  thread: ChatThread,
  userMessage: string,
  model?: string,
  agentMode: AgentMode = "auto"
): Promise<AgentResponse> {
  const context = buildAgentContext({ ...project, activeThreadId: thread.id });
  const response = await fetch(`${getAgentApiUrl()}/api/agent/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      projectId: project.id,
      threadId: thread.id,
      userMessage,
      context,
      model,
      agentMode
    })
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(errorText || `Agent service request failed with ${response.status}`);
  }

  const data = (await response.json()) as AgentResponse;
  return {
    content: data.content,
    patches: data.patches?.filter(isSupportedAgentPatch),
    referenceRequests: normalizeReferenceRequests(data.referenceRequests)
  };
}

type AgentStreamHandlers = {
  onProgress?: (event: AgentProgressEvent) => void;
};

function normalizeAgentResponse(data: AgentResponse): AgentResponse {
  return {
    content: data.content,
    patches: data.patches?.filter(isSupportedAgentPatch),
    referenceRequests: normalizeReferenceRequests(data.referenceRequests)
  };
}

function parseSseMessage(message: string): AgentStreamEvent | undefined {
  const data = message
    .split(/\r?\n/)
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trimStart())
    .join("\n");

  if (!data) return undefined;
  return JSON.parse(data) as AgentStreamEvent;
}

async function readAgentEventStream(
  response: Response,
  handlers: AgentStreamHandlers
): Promise<AgentResponse> {
  if (!response.body) {
    throw new Error("Agent service did not return a readable stream");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let finalResponse: AgentResponse | undefined;

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const messages = buffer.split(/\r?\n\r?\n/);
    buffer = messages.pop() ?? "";

    for (const message of messages) {
      const streamEvent = parseSseMessage(message);
      if (!streamEvent) continue;

      if (streamEvent.type === "progress") {
        handlers.onProgress?.(streamEvent.event);
      } else if (streamEvent.type === "final") {
        finalResponse = normalizeAgentResponse(streamEvent.response);
      } else if (streamEvent.type === "error") {
        throw new Error(streamEvent.message);
      }
    }
  }

  const tail = decoder.decode();
  if (tail) buffer += tail;
  const tailEvent = parseSseMessage(buffer);
  if (tailEvent?.type === "progress") {
    handlers.onProgress?.(tailEvent.event);
  } else if (tailEvent?.type === "final") {
    finalResponse = normalizeAgentResponse(tailEvent.response);
  } else if (tailEvent?.type === "error") {
    throw new Error(tailEvent.message);
  }

  if (!finalResponse) {
    throw new Error("Agent stream ended before a final response was received");
  }

  return finalResponse;
}

export async function sendMessageToAgentStream(
  project: PaperProject,
  thread: ChatThread,
  userMessage: string,
  model?: string,
  agentMode: AgentMode = "auto",
  handlers: AgentStreamHandlers = {}
): Promise<AgentResponse> {
  const context = buildAgentContext({ ...project, activeThreadId: thread.id });
  const response = await fetch(`${getAgentApiUrl()}/api/agent/chat/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream"
    },
    body: JSON.stringify({
      projectId: project.id,
      threadId: thread.id,
      userMessage,
      context,
      model,
      agentMode
    })
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(errorText || `Agent stream request failed with ${response.status}`);
  }

  return readAgentEventStream(response, handlers);
}

export function describeFolder(folderType: FolderType): string {
  return folderLabels[folderType];
}

export type ApplyAgentPatch = (projectId: string, patch: AgentPatch) => void;
