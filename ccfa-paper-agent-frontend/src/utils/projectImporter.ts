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
  const [workspace, savedProject] = await Promise.all([
    createWorkspaceFromExistingRoot(rootDirectoryHandle),
    loadProjectStateFromWorkspace(rootDirectoryHandle)
  ]);

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
