import { create } from "zustand";
import { buildAgentContext } from "../agent/agentAdapter";
import { loadAppState, saveAppState } from "../storage/indexedDb";
import type { AgentPatch } from "../types/agent";
import type { ChatMessage, ChatThread } from "../types/chat";
import type {
  DraftParagraph,
  FolderType,
  ParagraphWritingStatus,
  ProjectFile,
  ProjectFolders,
  ReferencePaperMeta
} from "../types/file";
import type { PaperProject, ProjectMetaInput } from "../types/project";
import {
  createFileChangeProposal,
  refreshProjectFileFromDisk,
  writeTextToLocalFile
} from "../utils/fileReader";
import { createId, nowIso } from "../utils/id";
import { hashText, parseMarkdownParagraphs } from "../utils/markdownParser";
import { removeFileFromWorkspace, saveProjectStateToWorkspace } from "../utils/workspaceFs";

const folderTypes: FolderType[] = [
  "draftManuscripts",
  "coreReferences",
  "optionalReferences",
  "draftImages"
];

const emptyFolders = (): ProjectFolders => ({
  draftManuscripts: [],
  coreReferences: [],
  optionalReferences: [],
  draftImages: []
});

type StoreState = {
  projects: PaperProject[];
  activeProjectId?: string;
  isHydrated: boolean;
  hydrate: () => Promise<void>;
  createProject: (input: ProjectMetaInput) => string;
  restoreProject: (project: PaperProject) => void;
  updateProjectMeta: (projectId: string, input: Partial<ProjectMetaInput>) => void;
  deleteProject: (projectId: string) => void;
  enterProject: (projectId: string) => void;
  exitProject: () => void;
  uploadFileToFolder: (projectId: string, folderType: FolderType, file: ProjectFile) => void;
  completePdfParse: (
    projectId: string,
    folderType: FolderType,
    fileId: string,
    result: Pick<ProjectFile, "contentText" | "parsedMarkdownUrl" | "mineruTaskId" | "parsedSections" | "parsedStats">
  ) => void;
  failPdfParse: (
    projectId: string,
    folderType: FolderType,
    fileId: string,
    parseError: string
  ) => void;
  deleteFile: (projectId: string, folderType: FolderType, fileId: string) => void;
  refreshFileFromDisk: (projectId: string, folderType: FolderType, fileId: string) => Promise<void>;
  proposeFileChange: (
    projectId: string,
    folderType: FolderType,
    fileId: string,
    newContent: string,
    summary: string,
    source?: "agent" | "manual"
  ) => void;
  applyPendingFileChange: (
    projectId: string,
    folderType: FolderType,
    fileId: string
  ) => Promise<void>;
  rejectPendingFileChange: (projectId: string, folderType: FolderType, fileId: string) => void;
  updateReferenceMeta: (
    projectId: string,
    folderType: FolderType,
    fileId: string,
    meta: ReferencePaperMeta
  ) => void;
  updateImageCaption: (projectId: string, fileId: string, caption: string) => void;
  updateDraftParagraphStatus: (
    projectId: string,
    fileId: string,
    paragraphId: string,
    patch: Partial<Pick<DraftParagraph, "userAssignedHeading">> & {
      writingStatus?: ParagraphWritingStatus;
    }
  ) => void;
  createThread: (projectId: string, title?: string) => string;
  deleteThread: (projectId: string, threadId: string) => void;
  switchThread: (projectId: string, threadId: string) => void;
  appendMessage: (projectId: string, threadId: string, message: ChatMessage) => void;
  applyAgentPatch: (projectId: string, patch: AgentPatch) => void;
};

function createDefaultThread(): ChatThread {
  const timestamp = nowIso();
  return {
    id: createId("thread"),
    title: "写作协作线程",
    messages: [
      {
        id: createId("msg"),
        role: "assistant",
        content:
          "你好，我是你的论文写作 Agent。进入工程后，我可以围绕项目元信息、初稿、参考论文、图片和段落状态协助你推进英文论文写作。",
        createdAt: timestamp
      }
    ],
    createdAt: timestamp,
    updatedAt: timestamp
  };
}

function touchProject(project: PaperProject): PaperProject {
  return { ...project, updatedAt: nowIso() };
}

function normalizeFile(file: ProjectFile): ProjectFile {
  const contentHash = file.contentText ? file.contentHash ?? hashText(file.contentText) : file.contentHash;
  return {
    ...file,
    sourceType: file.sourceType ?? "browserCopy",
    contentHash
  };
}

function normalizeProject(project: PaperProject): PaperProject {
  const folders = folderTypes.reduce(
    (nextFolders, folderType) => ({
      ...nextFolders,
      [folderType]: (project.folders?.[folderType] ?? []).map(normalizeFile)
    }),
    emptyFolders()
  );

  return {
    ...project,
    folders,
    threads: project.threads ?? []
  };
}

function persist(projects: PaperProject[], activeProjectId?: string) {
  void saveAppState({ projects, activeProjectId });
  projects.forEach((project) => {
    void saveProjectStateToWorkspace(project).catch(() => undefined);
  });
}

function updateFileInProject(
  project: PaperProject,
  folderType: FolderType,
  fileId: string,
  updater: (file: ProjectFile) => ProjectFile
): PaperProject {
  return {
    ...project,
    folders: {
      ...project.folders,
      [folderType]: project.folders[folderType].map((file) =>
        file.id === fileId ? updater(file) : file
      )
    }
  };
}

function applyTextContentToFile(file: ProjectFile, nextContent: string): ProjectFile {
  const timestamp = nowIso();
  return {
    ...file,
    contentText: nextContent,
    contentHash: hashText(nextContent),
    draftParagraphs:
      file.folderType === "draftManuscripts"
        ? parseMarkdownParagraphs(nextContent, file.draftParagraphs)
        : file.draftParagraphs,
    parseStatus: "parsed",
    updatedAt: timestamp,
    lastSyncedAt: timestamp,
    pendingChange: undefined
  };
}

export const useProjectStore = create<StoreState>((set, get) => {
  const setAndPersist = (
    updater: (state: Pick<StoreState, "projects" | "activeProjectId">) => {
      projects: PaperProject[];
      activeProjectId?: string;
    }
  ) => {
    const next = updater({
      projects: get().projects,
      activeProjectId: get().activeProjectId
    });
    set(next);
    persist(next.projects, next.activeProjectId);
  };

  const updateProject = (
    projectId: string,
    updater: (project: PaperProject) => PaperProject
  ) => {
    setAndPersist(({ projects, activeProjectId }) => ({
      activeProjectId,
      projects: projects.map((project) =>
        project.id === projectId ? touchProject(updater(project)) : project
      )
    }));
  };

  return {
    projects: [],
    activeProjectId: undefined,
    isHydrated: false,

    hydrate: async () => {
      const persisted = await loadAppState();
      set({
        projects: persisted.projects.map(normalizeProject),
        activeProjectId: persisted.activeProjectId,
        isHydrated: true
      });
    },

    createProject: (input) => {
      const timestamp = nowIso();
      const defaultThread = createDefaultThread();
      const project: PaperProject = {
        id: createId("project"),
        ...input,
        createdAt: timestamp,
        updatedAt: timestamp,
        workspace: input.workspace,
        folders: emptyFolders(),
        threads: [defaultThread],
        activeThreadId: defaultThread.id
      };

      setAndPersist(({ projects }) => ({
        projects: [project, ...projects],
        activeProjectId: project.id
      }));
      return project.id;
    },

    restoreProject: (project) => {
      const restoredProject = touchProject(normalizeProject(project));
      setAndPersist(({ projects }) => ({
        projects: [
          restoredProject,
          ...projects.filter((candidate) => candidate.id !== restoredProject.id)
        ],
        activeProjectId: restoredProject.id
      }));
    },

    updateProjectMeta: (projectId, input) => {
      updateProject(projectId, (project) => ({
        ...project,
        ...input,
        workspace: input.workspace ?? project.workspace
      }));
    },

    deleteProject: (projectId) => {
      setAndPersist(({ projects, activeProjectId }) => {
        const nextProjects = projects.filter((project) => project.id !== projectId);
        return {
          projects: nextProjects,
          activeProjectId: activeProjectId === projectId ? undefined : activeProjectId
        };
      });
    },

    enterProject: (projectId) => {
      setAndPersist(({ projects }) => ({
        projects,
        activeProjectId: projectId
      }));
    },

    exitProject: () => {
      setAndPersist(({ projects }) => ({
        projects,
        activeProjectId: undefined
      }));
    },

    uploadFileToFolder: (projectId, folderType, file) => {
      updateProject(projectId, (project) => ({
        ...project,
        folders: {
          ...project.folders,
          [folderType]: [normalizeFile(file), ...project.folders[folderType]]
        }
      }));
    },

    completePdfParse: (projectId, folderType, fileId, result) => {
      const contentText = result.contentText ?? "";
      updateProject(projectId, (project) =>
        updateFileInProject(project, folderType, fileId, (file) => ({
          ...file,
          ...result,
          contentText,
          contentHash: hashText(contentText),
          parseStatus: "parsed",
          parseError: undefined,
          updatedAt: nowIso(),
          lastSyncedAt: nowIso()
        }))
      );
    },

    failPdfParse: (projectId, folderType, fileId, parseError) => {
      updateProject(projectId, (project) =>
        updateFileInProject(project, folderType, fileId, (file) => ({
          ...file,
          parseStatus: "failed",
          parseError,
          updatedAt: nowIso()
        }))
      );
    },

    deleteFile: (projectId, folderType, fileId) => {
      const project = get().projects.find((candidate) => candidate.id === projectId);
      const file = project?.folders[folderType].find((candidate) => candidate.id === fileId);
      if (project && file?.sourceType === "localHandle") {
        void removeFileFromWorkspace(project, file).catch(() => undefined);
      }
      updateProject(projectId, (project) => ({
        ...project,
        folders: {
          ...project.folders,
          [folderType]: project.folders[folderType].filter((file) => file.id !== fileId)
        }
      }));
    },

    refreshFileFromDisk: async (projectId, folderType, fileId) => {
      const project = get().projects.find((candidate) => candidate.id === projectId);
      const file = project?.folders[folderType].find((candidate) => candidate.id === fileId);
      if (!file?.localHandle) return;

      const refreshedFile = await refreshProjectFileFromDisk(file);
      updateProject(projectId, (currentProject) =>
        updateFileInProject(currentProject, folderType, fileId, () => refreshedFile)
      );
    },

    proposeFileChange: (
      projectId,
      folderType,
      fileId,
      newContent,
      summary,
      source = "agent"
    ) => {
      updateProject(projectId, (project) =>
        updateFileInProject(project, folderType, fileId, (file) => ({
          ...file,
          pendingChange: createFileChangeProposal(file, newContent, summary, source),
          updatedAt: nowIso()
        }))
      );
    },

    applyPendingFileChange: async (projectId, folderType, fileId) => {
      const project = get().projects.find((candidate) => candidate.id === projectId);
      const file = project?.folders[folderType].find((candidate) => candidate.id === fileId);
      const change = file?.pendingChange;
      if (!file || !change || change.status !== "pending") return;

      const nextFile =
        file.sourceType === "localHandle" && file.localHandle
          ? await writeTextToLocalFile(file, change.newContent)
          : applyTextContentToFile(file, change.newContent);

      updateProject(projectId, (currentProject) =>
        updateFileInProject(currentProject, folderType, fileId, () => ({
          ...nextFile,
          pendingChange: undefined,
          updatedAt: nowIso()
        }))
      );
    },

    rejectPendingFileChange: (projectId, folderType, fileId) => {
      updateProject(projectId, (project) =>
        updateFileInProject(project, folderType, fileId, (file) => ({
          ...file,
          pendingChange: undefined,
          updatedAt: nowIso()
        }))
      );
    },

    updateReferenceMeta: (projectId, folderType, fileId, meta) => {
      updateProject(projectId, (project) =>
        updateFileInProject(project, folderType, fileId, (file) => ({
          ...file,
          referenceMeta: meta,
          updatedAt: nowIso()
        }))
      );
    },

    updateImageCaption: (projectId, fileId, caption) => {
      updateProject(projectId, (project) =>
        updateFileInProject(project, "draftImages", fileId, (file) => ({
          ...file,
          imageCaption: caption,
          updatedAt: nowIso()
        }))
      );
    },

    updateDraftParagraphStatus: (projectId, fileId, paragraphId, patch) => {
      updateProject(projectId, (project) =>
        updateFileInProject(project, "draftManuscripts", fileId, (file) => ({
          ...file,
          draftParagraphs: file.draftParagraphs?.map((paragraph) =>
            paragraph.id === paragraphId
              ? { ...paragraph, ...patch, updatedAt: nowIso() }
              : paragraph
          ),
          updatedAt: nowIso()
        }))
      );
    },

    createThread: (projectId, title = "新的写作线程") => {
      const timestamp = nowIso();
      const thread: ChatThread = {
        id: createId("thread"),
        title,
        messages: [],
        createdAt: timestamp,
        updatedAt: timestamp
      };
      updateProject(projectId, (project) => ({
        ...project,
        threads: [thread, ...project.threads],
        activeThreadId: thread.id
      }));
      return thread.id;
    },

    deleteThread: (projectId, threadId) => {
      updateProject(projectId, (project) => {
        const nextThreads = project.threads.filter((thread) => thread.id !== threadId);
        return {
          ...project,
          threads: nextThreads,
          activeThreadId:
            project.activeThreadId === threadId ? nextThreads[0]?.id : project.activeThreadId
        };
      });
    },

    switchThread: (projectId, threadId) => {
      updateProject(projectId, (project) => ({
        ...project,
        activeThreadId: threadId
      }));
    },

    appendMessage: (projectId, threadId, message) => {
      updateProject(projectId, (project) => ({
        ...project,
        threads: project.threads.map((thread) =>
          thread.id === threadId
            ? {
                ...thread,
                title:
                  thread.messages.length === 0 && message.role === "user"
                    ? message.content.slice(0, 28) || thread.title
                    : thread.title,
                messages: [...thread.messages, message],
                updatedAt: nowIso()
              }
            : thread
        )
      }));
    },

    applyAgentPatch: (projectId, patch) => {
      if (patch.type === "updateProjectMeta") {
        get().updateProjectMeta(projectId, patch.payload);
        return;
      }

      if (patch.type === "proposeFileChange") {
        get().proposeFileChange(
          projectId,
          patch.folderType,
          patch.fileId,
          patch.newContent,
          patch.summary,
          "agent"
        );
        return;
      }

      if (patch.type === "appendSystemMessage") {
        get().appendMessage(projectId, patch.threadId, {
          id: createId("msg"),
          role: "system",
          content: patch.content,
          createdAt: nowIso()
        });
        return;
      }

      if (patch.type === "updateDraftParagraphStatus") {
        get().updateDraftParagraphStatus(projectId, patch.fileId, patch.paragraphId, patch.payload);
        return;
      }

      if (patch.type === "updateIntroductionOutline") {
        updateProject(projectId, (project) => ({
          ...project,
          introductionOutline: {
            draftFileId: patch.payload.draftFileId,
            summary: patch.payload.summary ?? "",
            paragraphs: patch.payload.paragraphs,
            updatedAt: nowIso()
          }
        }));
        return;
      }

      if (patch.type === "updateScientificProblemMemory") {
        updateProject(projectId, (project) => ({
          ...project,
          scientificProblemMemory: {
            scientificProblems: patch.payload.scientificProblems ?? [],
            innovations: patch.payload.innovations ?? [],
            keyTechnologies: patch.payload.keyTechnologies ?? [],
            notes: patch.payload.notes,
            updatedAt: nowIso()
          }
        }));
      }
    }
  };
});

export function selectActiveProject(state: StoreState): PaperProject | undefined {
  return state.projects.find((project) => project.id === state.activeProjectId);
}

export function selectAgentContext(state: StoreState) {
  const project = selectActiveProject(state);
  return project ? buildAgentContext(project) : undefined;
}
