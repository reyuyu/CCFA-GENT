import type { ChatThread } from "./chat";
import type { ProjectFolders } from "./file";

export type WritingStatus = "writing" | "finalized";

export type IntroductionOutlineParagraph = {
  paragraphNumber: number;
  outline: string;
};

export type IntroductionOutline = {
  draftFileId?: string;
  summary: string;
  paragraphs: IntroductionOutlineParagraph[];
  updatedAt: string;
};

export type ScientificProblemMemoryItem = {
  id: string;
  title: string;
  description: string;
  relatedProblemIds?: string[];
};

export type ScientificProblemMemory = {
  scientificProblems: ScientificProblemMemoryItem[];
  innovations: ScientificProblemMemoryItem[];
  keyTechnologies: ScientificProblemMemoryItem[];
  notes?: string;
  updatedAt: string;
};

export type ProjectWorkspace = {
  rootDirectoryName: string;
  rootDirectoryHandle?: FileSystemDirectoryHandle;
  backendWorkspacePath?: string;
  relativePathLabel: string;
  stateFilePath: string;
  createdAt: string;
  lastStateSyncedAt?: string;
};

export type PaperProject = {
  id: string;
  paperTitle: string;
  targetVenue: string;
  writingStatus: WritingStatus;
  writingProgress: string;
  createdAt: string;
  updatedAt: string;
  introductionOutline?: IntroductionOutline;
  scientificProblemMemory?: ScientificProblemMemory;
  workspace?: ProjectWorkspace;
  folders: ProjectFolders;
  threads: ChatThread[];
  activeThreadId?: string;
};

export type ProjectMetaInput = {
  paperTitle: string;
  targetVenue: string;
  writingStatus: WritingStatus;
  writingProgress: string;
  workspace?: ProjectWorkspace;
};
