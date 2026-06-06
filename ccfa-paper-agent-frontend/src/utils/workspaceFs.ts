import type { FolderType, ParsedImageAsset, ProjectFile } from "../types/file";
import type { PaperProject, ProjectWorkspace } from "../types/project";
import { createId, nowIso } from "./id";

export const workspaceFolderNames: Record<FolderType, string> = {
  draftManuscripts: "draft-manuscripts",
  coreReferences: "core-references",
  optionalReferences: "optional-references",
  draftImages: "draft-images"
};

const metadataFolderName = ".agent";
const stateFileName = "project-state.json";
const scientificProblemMemoryFileName = "scientific-problem-memory.json";

export function isDirectoryPickerSupported(): boolean {
  return typeof window !== "undefined" && typeof window.showDirectoryPicker === "function";
}

export function sanitizeFolderName(name: string): string {
  const cleaned = name
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return cleaned || `paper-project-${Date.now()}`;
}

export function sanitizeProjectFolderName(name: string): string {
  const cleaned = name
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001F-]/g, "_")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");

  return cleaned || `paper_project_${Date.now()}`;
}

export function sanitizeRelativeAssetPath(path: string): string {
  return path
    .replace(/\\/g, "/")
    .split("/")
    .filter((part) => part && part !== "." && part !== "..")
    .map(sanitizeFolderName)
    .join("/");
}

export async function ensureDirectoryWritePermission(
  handle: FileSystemDirectoryHandle
): Promise<boolean> {
  if (!handle.queryPermission || !handle.requestPermission) {
    return true;
  }

  const descriptor = { mode: "readwrite" as const };
  if ((await handle.queryPermission(descriptor)) === "granted") {
    return true;
  }

  return (await handle.requestPermission(descriptor)) === "granted";
}

export async function createProjectWorkspace(
  paperTitle: string
): Promise<ProjectWorkspace> {
  if (!window.showDirectoryPicker) {
    throw new Error("当前浏览器不支持选择本地工程目录。请使用 Chromium 系浏览器。");
  }

  const parentHandle = await window.showDirectoryPicker();
  const permitted = await ensureDirectoryWritePermission(parentHandle);
  if (!permitted) {
    throw new Error("没有写入所选目录的权限。");
  }

  const projectFolderName = sanitizeProjectFolderName(paperTitle);
  const rootDirectoryHandle = await parentHandle.getDirectoryHandle(projectFolderName, {
    create: true
  });

  await ensureWorkspaceFolders(rootDirectoryHandle);

  const timestamp = nowIso();
  return {
    rootDirectoryName: rootDirectoryHandle.name,
    rootDirectoryHandle,
    relativePathLabel: `${parentHandle.name}/${rootDirectoryHandle.name}`,
    stateFilePath: `${metadataFolderName}/${stateFileName}`,
    createdAt: timestamp,
    lastStateSyncedAt: timestamp
  };
}

export async function createWorkspaceFromExistingRoot(
  rootDirectoryHandle: FileSystemDirectoryHandle
): Promise<ProjectWorkspace> {
  const permitted = await ensureDirectoryWritePermission(rootDirectoryHandle);
  if (!permitted) {
    throw new Error("没有读取和写入所选工程目录的权限。");
  }

  await ensureWorkspaceFolders(rootDirectoryHandle);

  return {
    rootDirectoryName: rootDirectoryHandle.name,
    rootDirectoryHandle,
    relativePathLabel: rootDirectoryHandle.name,
    stateFilePath: `${metadataFolderName}/${stateFileName}`,
    createdAt: nowIso(),
    lastStateSyncedAt: nowIso()
  };
}

export async function ensureWorkspaceFolders(rootHandle: FileSystemDirectoryHandle) {
  await rootHandle.getDirectoryHandle(metadataFolderName, { create: true });
  for (const folderName of Object.values(workspaceFolderNames)) {
    await rootHandle.getDirectoryHandle(folderName, { create: true });
  }
}

function uniqueWorkspaceFileName(originalName: string): string {
  const dotIndex = originalName.lastIndexOf(".");
  const baseName = dotIndex > 0 ? originalName.slice(0, dotIndex) : originalName;
  const extension = dotIndex > 0 ? originalName.slice(dotIndex) : "";
  return `${sanitizeFolderName(baseName)}-${createId("asset").slice(6, 14)}${extension}`;
}

export async function copyFileIntoWorkspace(
  rootHandle: FileSystemDirectoryHandle,
  folderType: FolderType,
  file: File
): Promise<{
  handle: FileSystemFileHandle;
  relativePath: string;
  fileName: string;
}> {
  await ensureWorkspaceFolders(rootHandle);
  const folderName = workspaceFolderNames[folderType];
  const folderHandle = await rootHandle.getDirectoryHandle(folderName, { create: true });
  const fileName = uniqueWorkspaceFileName(file.name);
  const handle = await folderHandle.getFileHandle(fileName, { create: true });
  const writable = await handle.createWritable();
  await writable.write(file);
  await writable.close();

  return {
    handle,
    relativePath: `${folderName}/${fileName}`,
    fileName
  };
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, payload] = dataUrl.split(",", 2);
  const mimeMatch = /^data:([^;]+);base64$/i.exec(header);
  if (!mimeMatch || !payload) {
    throw new Error("Invalid data URL asset.");
  }

  const binary = atob(payload);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new Blob([bytes], { type: mimeMatch[1] });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export async function saveAssetsIntoWorkspace(
  rootHandle: FileSystemDirectoryHandle,
  folderType: FolderType,
  assetFolderName: string,
  assets: ParsedImageAsset[]
): Promise<void> {
  await ensureWorkspaceFolders(rootHandle);
  const folderName = workspaceFolderNames[folderType];
  const folderHandle = await rootHandle.getDirectoryHandle(folderName, { create: true });
  const assetRootHandle = await folderHandle.getDirectoryHandle(assetFolderName, { create: true });

  for (const asset of assets) {
    const relativePath = sanitizeRelativeAssetPath(asset.path);
    if (!relativePath) continue;
    const parts = relativePath.split("/");
    const fileName = parts.pop();
    if (!fileName) continue;

    let currentHandle = assetRootHandle;
    for (const part of parts) {
      currentHandle = await currentHandle.getDirectoryHandle(part, { create: true });
    }

    const fileHandle = await currentHandle.getFileHandle(fileName, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(dataUrlToBlob(asset.dataUrl));
    await writable.close();
  }
}

async function readAssetsFromDirectory(
  directoryHandle: FileSystemDirectoryHandle,
  prefix = ""
): Promise<ParsedImageAsset[]> {
  if (!directoryHandle.entries) {
    return [];
  }

  const assets: ParsedImageAsset[] = [];
  for await (const [name, handle] of directoryHandle.entries()) {
    const relativePath = prefix ? `${prefix}/${name}` : name;
    if (handle.kind === "directory") {
      assets.push(...(await readAssetsFromDirectory(handle as FileSystemDirectoryHandle, relativePath)));
      continue;
    }

    const file = await (handle as FileSystemFileHandle).getFile();
    if (!file.type.startsWith("image/")) {
      continue;
    }
    assets.push({
      path: relativePath,
      mimeType: file.type,
      dataUrl: await blobToDataUrl(file)
    });
  }
  return assets;
}

export async function restoreParsedAssetsFromWorkspace(
  rootHandle: FileSystemDirectoryHandle,
  folderType: FolderType,
  assetFolderName: string
): Promise<ParsedImageAsset[]> {
  const permitted = await ensureDirectoryWritePermission(rootHandle);
  if (!permitted) return [];

  try {
    const folderHandle = await rootHandle.getDirectoryHandle(workspaceFolderNames[folderType]);
    const assetRootHandle = await folderHandle.getDirectoryHandle(assetFolderName);
    return readAssetsFromDirectory(assetRootHandle);
  } catch {
    return [];
  }
}

function stripHandlesFromFile(file: ProjectFile) {
  const {
    localHandle: _localHandle,
    dataUrl: _dataUrl,
    contentText: _contentText,
    parsedImageAssets: _parsedImageAssets,
    ...rest
  } = file;
  return rest;
}

function stripHandlesFromProject(project: PaperProject) {
  const workspace = project.workspace
    ? {
        ...project.workspace,
        rootDirectoryHandle: undefined
      }
    : undefined;

  return {
    ...project,
    workspace,
    folders: {
      draftManuscripts: project.folders.draftManuscripts.map(stripHandlesFromFile),
      coreReferences: project.folders.coreReferences.map(stripHandlesFromFile),
      optionalReferences: project.folders.optionalReferences.map(stripHandlesFromFile),
      draftImages: project.folders.draftImages.map(stripHandlesFromFile)
    }
  };
}

export async function saveProjectStateToWorkspace(project: PaperProject): Promise<void> {
  const rootHandle = project.workspace?.rootDirectoryHandle;
  if (!rootHandle) return;

  const permitted = await ensureDirectoryWritePermission(rootHandle);
  if (!permitted) return;

  await ensureWorkspaceFolders(rootHandle);
  const metadataHandle = await rootHandle.getDirectoryHandle(metadataFolderName, { create: true });
  const stateHandle = await metadataHandle.getFileHandle(stateFileName, { create: true });
  const writable = await stateHandle.createWritable();
  await writable.write(
    JSON.stringify(
      {
        schemaVersion: 1,
        savedAt: nowIso(),
        project: stripHandlesFromProject(project)
      },
      null,
      2
    )
  );
  await writable.close();

  const memoryHandle = await metadataHandle.getFileHandle(scientificProblemMemoryFileName, {
    create: true
  });
  const memoryWritable = await memoryHandle.createWritable();
  await memoryWritable.write(
    JSON.stringify(
      {
        schemaVersion: 1,
        savedAt: nowIso(),
        scientificProblemMemory: project.scientificProblemMemory ?? null
      },
      null,
      2
    )
  );
  await memoryWritable.close();
}

async function readScientificProblemMemory(
  metadataHandle: FileSystemDirectoryHandle
): Promise<PaperProject["scientificProblemMemory"] | undefined> {
  try {
    const memoryHandle = await metadataHandle.getFileHandle(scientificProblemMemoryFileName);
    const memoryFile = await memoryHandle.getFile();
    const rawMemory = JSON.parse(await memoryFile.text()) as {
      scientificProblemMemory?: PaperProject["scientificProblemMemory"] | null;
    };
    return rawMemory.scientificProblemMemory ?? undefined;
  } catch {
    return undefined;
  }
}

export async function loadProjectStateFromWorkspace(
  rootDirectoryHandle: FileSystemDirectoryHandle
): Promise<PaperProject> {
  const permitted = await ensureDirectoryWritePermission(rootDirectoryHandle);
  if (!permitted) {
    throw new Error("没有读取所选工程目录的权限。");
  }

  const metadataHandle = await rootDirectoryHandle.getDirectoryHandle(metadataFolderName);
  const stateHandle = await metadataHandle.getFileHandle(stateFileName);
  const stateFile = await stateHandle.getFile();
  const rawState = JSON.parse(await stateFile.text()) as {
    schemaVersion?: number;
    project?: PaperProject;
  };

  if (!rawState.project) {
    throw new Error("所选目录的 .agent/project-state.json 不是有效工程状态文件。");
  }

  const scientificProblemMemory = await readScientificProblemMemory(metadataHandle);
  if (scientificProblemMemory) {
    rawState.project.scientificProblemMemory = scientificProblemMemory;
  }

  return rawState.project;
}

export async function getWorkspaceFileHandle(
  rootDirectoryHandle: FileSystemDirectoryHandle,
  relativePath: string
): Promise<FileSystemFileHandle> {
  const parts = relativePath.split("/").filter(Boolean);
  if (parts.length < 2) {
    throw new Error(`无效的工程文件路径：${relativePath}`);
  }

  const fileName = parts[parts.length - 1];
  let directoryHandle = rootDirectoryHandle;
  for (const folderName of parts.slice(0, -1)) {
    directoryHandle = await directoryHandle.getDirectoryHandle(folderName);
  }

  return directoryHandle.getFileHandle(fileName);
}

export async function removeFileFromWorkspace(
  project: PaperProject,
  file: ProjectFile
): Promise<void> {
  const rootHandle = project.workspace?.rootDirectoryHandle;
  const relativePath = file.localPath;
  if (!rootHandle || !relativePath) return;

  const [folderName, fileName] = relativePath.split("/");
  if (!folderName || !fileName) return;

  const permitted = await ensureDirectoryWritePermission(rootHandle);
  if (!permitted) return;

  const folderHandle = await rootHandle.getDirectoryHandle(folderName);
  await folderHandle.removeEntry(fileName).catch(() => undefined);

  if (file.parsedAssetFolder) {
    await folderHandle
      .removeEntry(file.parsedAssetFolder, { recursive: true })
      .catch(() => undefined);
  }
}

function fileExtension(name: string): string {
  const dotIndex = name.lastIndexOf(".");
  return dotIndex > 0 ? name.slice(dotIndex) : "";
}

export function sanitizeWorkspaceFileName(inputName: string, fallbackExtension = ""): string {
  const trimmed = inputName.trim().replace(/\\/g, "/").split("/").filter(Boolean).pop() ?? "";
  const cleaned = trimmed
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "-")
    .replace(/\s+/g, " ")
    .replace(/-+/g, "-")
    .replace(/^\.+/, "")
    .trim();

  if (!cleaned) {
    throw new Error("文件名不能为空。");
  }

  const extension = fileExtension(cleaned);
  return extension ? cleaned : `${cleaned}${fallbackExtension}`;
}

export async function renameFileInWorkspace(
  project: PaperProject,
  file: ProjectFile,
  nextName: string
): Promise<ProjectFile> {
  const rootHandle = project.workspace?.rootDirectoryHandle;
  const relativePath = file.localPath;
  if (!rootHandle || !relativePath) {
    throw new Error("当前文件没有绑定本地工程路径，无法同步重命名。");
  }

  const pathParts = relativePath.split("/").filter(Boolean);
  if (pathParts.length < 2) {
    throw new Error(`无效的工程文件路径：${relativePath}`);
  }

  const currentName = pathParts[pathParts.length - 1];
  const fallbackExtension = fileExtension(currentName);
  const safeName = sanitizeWorkspaceFileName(nextName, fallbackExtension);
  if (safeName === currentName) {
    return file;
  }

  let directoryHandle = rootHandle;
  for (const folderName of pathParts.slice(0, -1)) {
    directoryHandle = await directoryHandle.getDirectoryHandle(folderName);
  }

  const permitted = await ensureDirectoryWritePermission(rootHandle);
  if (!permitted) {
    throw new Error("没有写入工程目录的权限。");
  }

  try {
    await directoryHandle.getFileHandle(safeName);
    throw new Error(`同一目录下已存在文件：${safeName}`);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("同一目录下已存在文件")) {
      throw error;
    }
  }

  const currentHandle = file.localHandle ?? (await getWorkspaceFileHandle(rootHandle, relativePath));
  const currentFile = await currentHandle.getFile();
  const nextHandle = await directoryHandle.getFileHandle(safeName, { create: true });
  const writable = await nextHandle.createWritable();
  await writable.write(currentFile);
  await writable.close();
  await directoryHandle.removeEntry(currentName);

  const nextFile = await nextHandle.getFile();
  return {
    ...file,
    name: safeName,
    localPath: [...pathParts.slice(0, -1), safeName].join("/"),
    localHandle: nextHandle,
    size: nextFile.size,
    mimeType: nextFile.type || file.mimeType,
    diskLastModified: nextFile.lastModified,
    updatedAt: nowIso(),
    lastSyncedAt: nowIso()
  };
}

export function describeWorkspace(project: PaperProject): string {
  return project.workspace?.relativePathLabel ?? "未绑定工程目录";
}
