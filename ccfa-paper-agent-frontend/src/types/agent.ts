import type {
  DraftParagraph,
  FolderType,
  ParagraphWritingStatus,
  ReferencePaperMeta
} from "./file";
import type { ScientificProblemMemory, WritingStatus } from "./project";
import type { IntroductionOutline } from "./project";

export type AgentContext = {
  projectMeta: {
    id: string;
    paperTitle: string;
    targetVenue: string;
    writingStatus: WritingStatus;
    writingProgress: string;
    backendWorkspacePath?: string;
    updatedAt: string;
  };
  introductionOutline?: IntroductionOutline;
  scientificProblemMemory?: ScientificProblemMemory;
  folderSummary: Record<FolderType, number>;
  files: Array<{
    id: string;
    name: string;
    folderType: FolderType;
    mimeType: string;
    size: number;
    uploadedAt: string;
    localPath?: string;
    hasPendingChange: boolean;
    parseStatus?: string;
    hasMarkdownContent: boolean;
    hasImageData: boolean;
  }>;
  referencePaperMetas: Array<{
    fileId: string;
    fileName: string;
    folderType: FolderType;
    meta: ReferencePaperMeta;
  }>;
  imageAssets: Array<{
    id: string;
    name: string;
    caption?: string;
    markdownReference: string;
  }>;
  draftManuscripts: Array<{
    id: string;
    name: string;
    folderType: "draftManuscripts";
    localPath?: string;
    contentText?: string;
    draftParagraphs?: DraftParagraph[];
  }>;
  referencePapers: Array<{
    id: string;
    name: string;
    folderType: "coreReferences" | "optionalReferences";
    localPath?: string;
    contentText?: string;
    referenceMeta?: ReferencePaperMeta;
  }>;
};

export type AgentResponse = {
  content: string;
  patches?: AgentPatch[];
  referenceRequests?: AgentReferenceRequest[];
};

export type AgentReferenceRequest = {
  id: string;
  title: string;
  semanticScholarPaperId?: string;
  year?: number;
  venue?: string;
  authors: string[];
  citationCount?: number;
  paperUrl?: string;
  pdfUrl: string;
  externalIds?: Record<string, unknown>;
  relevanceReason: string;
  whyUsefulForThisProject: string;
  suggestedReferenceScope: "coreReferences" | "optionalReferences";
  usefulForSections?: string[];
  status: "pending" | "accepted" | "rejected" | "parsing" | "added" | "failed";
  errorMessage?: string;
};

export type AgentProgressEvent = {
  type:
    | "thinking"
    | "tool_start"
    | "tool_end"
    | "retrieving"
    | "writing"
    | "done"
    | "error";
  message: string;
  createdAt: string;
  data?: Record<string, unknown>;
};

export type AgentStreamEvent =
  | {
      type: "progress";
      event: AgentProgressEvent;
    }
  | {
      type: "final";
      response: AgentResponse;
    }
  | {
      type: "error";
      message: string;
    };

export type AgentPatch =
  | {
      type: "updateProjectMeta";
      payload: Partial<{
        paperTitle: string;
        targetVenue: string;
        writingStatus: WritingStatus;
        writingProgress: string;
      }>;
    }
  | {
      type: "proposeFileChange";
      folderType: FolderType;
      fileId: string;
      summary: string;
      newContent: string;
    }
  | {
      type: "appendSystemMessage";
      threadId: string;
      content: string;
    }
  | {
      type: "updateDraftParagraphStatus";
      fileId: string;
      paragraphId: string;
      payload: Partial<{
        writingStatus: ParagraphWritingStatus;
        userAssignedHeading: string;
      }>;
    }
  | {
      type: "updateIntroductionOutline";
      payload: Partial<IntroductionOutline> & {
        paragraphs: IntroductionOutline["paragraphs"];
      };
    }
  | {
      type: "updateScientificProblemMemory";
      payload: Partial<ScientificProblemMemory>;
    };
