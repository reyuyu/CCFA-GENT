import type { FolderType, ProjectFile } from "../types/file";
import type { PaperProject } from "../types/project";
import { refreshProjectFileFromDisk } from "./fileReader";
import {
  createWorkspaceFromExistingRoot,
  getWorkspaceFileHandle,
  loadProjectStateFromWorkspace,
  restoreParsedAssetsFromWorkspace
} from "./workspaceFs";

const folderTypes: FolderType[] = [
  "draftManuscripts",
  "coreReferences",
  "optionalReferences",
  "draftImages"
];

function normalizeImportError(error: unknown): Error {
  if (
    error instanceof DOMException &&
    (error.name === "NotFoundError" || error.message.includes("could not be found"))
  ) {
    return new Error(
      "所选目录不是已保存的 CCFA Paper Agent 工程。请打开包含 .agent/project-state.json 的工程目录；首次使用请点击“创建论文工程”。"
    );
  }

  if (error instanceof Error && error.message.includes("could not be found")) {
    return new Error(
      "所选目录不是已保存的 CCFA Paper Agent 工程。请打开包含 .agent/project-state.json 的工程目录；首次使用请点击“创建论文工程”。"
    );
  }

  return error instanceof Error ? error : new Error("打开已有工程失败。");
}

async function restoreProjectFile(
  rootDirectoryHandle: FileSystemDirectoryHandle,
  file: ProjectFile
): Promise<ProjectFile> {
  if (!file.localPath) {
    return file;
  }

  try {
    const localHandle = await getWorkspaceFileHandle(rootDirectoryHandle, file.localPath);
    const refreshedFile = await refreshProjectFileFromDisk({
      ...file,
      sourceType: "localHandle",
      localHandle
    });
    if (!refreshedFile.parsedAssetFolder) {
      return refreshedFile;
    }

    const parsedImageAssets = await restoreParsedAssetsFromWorkspace(
      rootDirectoryHandle,
      refreshedFile.folderType,
      refreshedFile.parsedAssetFolder
    );
    return parsedImageAssets.length > 0
      ? {
          ...refreshedFile,
          parsedImageAssets
        }
      : refreshedFile;
  } catch {
    return {
      ...file,
      sourceType: file.sourceType ?? "localHandle",
      parseStatus: "failed",
      localHandle: undefined
    };
  }
}

export async function importProjectFromWorkspace(): Promise<PaperProject> {
  if (!window.showDirectoryPicker) {
    throw new Error("当前浏览器不支持打开本地工程目录。请使用 Chromium 系浏览器。");
  }

  const rootDirectoryHandle = await window.showDirectoryPicker();
  let savedProject: PaperProject;
  try {
    savedProject = await loadProjectStateFromWorkspace(rootDirectoryHandle);
  } catch (error) {
    throw normalizeImportError(error);
  }

  const workspace = await createWorkspaceFromExistingRoot(rootDirectoryHandle);

  const restoredFolders = {
    ...savedProject.folders
  };

  for (const folderType of folderTypes) {
    restoredFolders[folderType] = await Promise.all(
      (savedProject.folders[folderType] ?? []).map((file) =>
        restoreProjectFile(rootDirectoryHandle, file)
      )
    );
  }

  return {
    ...savedProject,
    workspace: {
      ...workspace,
      createdAt: savedProject.workspace?.createdAt ?? workspace.createdAt
    },
    folders: restoredFolders
  };
}
