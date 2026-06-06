import type { FileChangeProposal, FolderType, ProjectFile } from "../types/file";
import type { PaperProject } from "../types/project";
import { parseMarkdownParagraphs, hashText } from "./markdownParser";
import { createId, nowIso } from "./id";
import { copyFileIntoWorkspace } from "./workspaceFs";

const allowedExtensions: Record<FolderType, string[]> = {
  draftManuscripts: [".md", ".tex"],
  coreReferences: [".md", ".pdf"],
  optionalReferences: [".md", ".pdf"],
  draftImages: [".png", ".jpg", ".jpeg", ".webp"]
};

export function getAllowedExtensions(folderType: FolderType): string[] {
  return allowedExtensions[folderType];
}

export function validateFileForFolder(file: File, folderType: FolderType): string | null {
  const lowerName = file.name.toLowerCase();
  const allowed = allowedExtensions[folderType];
  if (!allowed.some((extension) => lowerName.endsWith(extension))) {
    return `该文件夹仅支持 ${allowed.join(", ")} 文件`;
  }
  return null;
}

function readDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function referenceMetaFor(folderType: FolderType) {
  if (folderType !== "coreReferences" && folderType !== "optionalReferences") {
    return undefined;
  }

  return {
    paperYear: "",
    paperVenueOrQuality: "",
    semanticScholarPaperId: "",
    referenceSummary: "",
    referenceSections: ""
  };
}

async function createProjectFileBase(
  file: File,
  folderType: FolderType,
  sourceType: ProjectFile["sourceType"],
  localHandle?: FileSystemFileHandle,
  localPath?: string
): Promise<ProjectFile> {
  const timestamp = nowIso();
  const isMarkdown = file.name.toLowerCase().endsWith(".md");
  const isPdf = file.name.toLowerCase().endsWith(".pdf");
  const isImage = folderType === "draftImages";
  const base: ProjectFile = {
    id: createId("file"),
    name: file.name,
    folderType,
    sourceType,
    localPath: localPath ?? localHandle?.name,
    localHandle,
    mimeType: file.type || "application/octet-stream",
    size: file.size,
    uploadedAt: timestamp,
    updatedAt: timestamp,
    lastSyncedAt: timestamp,
    diskLastModified: file.lastModified,
    parseStatus: "none",
    referenceMeta: referenceMetaFor(folderType)
  };

  if (isMarkdown) {
    const contentText = await file.text();
    return {
      ...base,
      mimeType: file.type || "text/markdown",
      contentText,
      contentHash: hashText(contentText),
      parseStatus: "parsed",
      draftParagraphs:
        folderType === "draftManuscripts" ? parseMarkdownParagraphs(contentText) : undefined
    };
  }

  if (isPdf) {
    return {
      ...base,
      mimeType: file.type || "application/pdf",
      parseStatus: "waiting_parse"
    };
  }

  if (isImage) {
    return {
      ...base,
      dataUrl: await readDataUrl(file),
      imageCaption: ""
    };
  }

  return base;
}

export async function createProjectFile(file: File, folderType: FolderType): Promise<ProjectFile> {
  return createProjectFileBase(file, folderType, "browserCopy");
}

export async function createProjectFileInWorkspace(
  project: PaperProject,
  file: File,
  folderType: FolderType
): Promise<ProjectFile> {
  const rootHandle = project.workspace?.rootDirectoryHandle;
  if (!rootHandle) {
    throw new Error("当前工程没有绑定本地工程目录，无法写入文件。");
  }

  const validationError = validateFileForFolder(file, folderType);
  if (validationError) {
    throw new Error(validationError);
  }

  const copied = await copyFileIntoWorkspace(rootHandle, folderType, file);
  const workspaceFile = await copied.handle.getFile();
  return createProjectFileBase(
    workspaceFile,
    folderType,
    "localHandle",
    copied.handle,
    copied.relativePath
  );
}

export async function ensureWritePermission(handle: FileSystemFileHandle): Promise<boolean> {
  if (!handle.queryPermission || !handle.requestPermission) {
    return true;
  }

  const descriptor = { mode: "readwrite" as const };
  if ((await handle.queryPermission(descriptor)) === "granted") {
    return true;
  }

  return (await handle.requestPermission(descriptor)) === "granted";
}

export async function refreshProjectFileFromDisk(file: ProjectFile): Promise<ProjectFile> {
  if (!file.localHandle) {
    return file;
  }

  const diskFile = await file.localHandle.getFile();
  const timestamp = nowIso();
  const refreshed: ProjectFile = {
    ...file,
    name: diskFile.name,
    mimeType: diskFile.type || file.mimeType,
    size: diskFile.size,
    diskLastModified: diskFile.lastModified,
    lastSyncedAt: timestamp,
    updatedAt: timestamp
  };

  if (diskFile.name.toLowerCase().endsWith(".md")) {
    const contentText = await diskFile.text();
    return {
      ...refreshed,
      contentText,
      contentHash: hashText(contentText),
      draftParagraphs:
        file.folderType === "draftManuscripts"
          ? parseMarkdownParagraphs(contentText, file.draftParagraphs)
          : file.draftParagraphs,
      parseStatus: "parsed"
    };
  }

  if (file.folderType === "draftImages") {
    return {
      ...refreshed,
      dataUrl: await readDataUrl(diskFile)
    };
  }

  return refreshed;
}

export async function writeTextToLocalFile(
  file: ProjectFile,
  nextContent: string
): Promise<ProjectFile> {
  if (!file.localHandle) {
    throw new Error("该文件不是工程目录中的本地文件，无法写回磁盘。");
  }

  const permitted = await ensureWritePermission(file.localHandle);
  if (!permitted) {
    throw new Error("没有写入该本地文件的权限。");
  }

  const writable = await file.localHandle.createWritable();
  await writable.write(nextContent);
  await writable.close();

  return refreshProjectFileFromDisk({
    ...file,
    contentText: nextContent,
    contentHash: hashText(nextContent)
  });
}

export function createFileChangeProposal(
  file: ProjectFile,
  newContent: string,
  summary: string,
  source: FileChangeProposal["source"]
): FileChangeProposal {
  const timestamp = nowIso();
  return {
    id: createId("change"),
    fileId: file.id,
    folderType: file.folderType,
    summary,
    oldContent: file.contentText ?? "",
    newContent,
    baseContentHash: file.contentHash ?? hashText(file.contentText ?? ""),
    status: "pending",
    createdAt: timestamp,
    updatedAt: timestamp,
    source
  };
}
