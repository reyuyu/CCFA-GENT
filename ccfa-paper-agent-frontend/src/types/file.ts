export type FolderType =
  | "draftManuscripts"
  | "coreReferences"
  | "optionalReferences"
  | "draftImages";

export type ParseStatus = "none" | "waiting_parse" | "parsing" | "parsed" | "failed";

export type FileSourceType = "localHandle" | "browserCopy";

export type ReferencePaperMeta = {
  paperYear: string;
  paperVenueOrQuality: string;
  semanticScholarPaperId?: string;
  referenceSummary: string;
  referenceSections: string;
};

export type ParagraphWritingStatus = "todo" | "draft" | "final";

export type DraftParagraph = {
  id: string;
  content: string;
  contentHash: string;
  headingPath: string[];
  userAssignedHeading?: string;
  writingStatus: ParagraphWritingStatus;
  updatedAt: string;
};

export type ParsedReferenceSection = {
  title: string;
  level: number;
  lineNumber: number;
};

export type ParsedReferenceStats = {
  sectionCount: number;
  imageCount: number;
  tableCount: number;
  formulaCount: number;
};

export type ParsedImageAsset = {
  path: string;
  mimeType: string;
  dataUrl: string;
};

export type FileChangeProposal = {
  id: string;
  fileId: string;
  folderType: FolderType;
  summary: string;
  oldContent: string;
  newContent: string;
  baseContentHash: string;
  status: "pending" | "applied" | "rejected";
  createdAt: string;
  updatedAt: string;
  source: "agent" | "manual";
};

export type ProjectFile = {
  id: string;
  name: string;
  folderType: FolderType;
  sourceType: FileSourceType;
  localPath?: string;
  localHandle?: FileSystemFileHandle;
  mimeType: string;
  size: number;
  uploadedAt: string;
  updatedAt: string;
  lastSyncedAt?: string;
  diskLastModified?: number;
  contentHash?: string;
  contentText?: string;
  parsedMarkdownUrl?: string;
  mineruTaskId?: string;
  parseError?: string;
  parsedSections?: ParsedReferenceSection[];
  parsedStats?: ParsedReferenceStats;
  parsedImageAssets?: ParsedImageAsset[];
  parsedAssetFolder?: string;
  dataUrl?: string;
  parseStatus?: ParseStatus;
  referenceMeta?: ReferencePaperMeta;
  imageCaption?: string;
  draftParagraphs?: DraftParagraph[];
  pendingChange?: FileChangeProposal;
};

export type ProjectFolders = Record<FolderType, ProjectFile[]>;

export const folderLabels: Record<FolderType, string> = {
  draftManuscripts: "初稿文稿",
  coreReferences: "核心参考论文",
  optionalReferences: "可参考论文",
  draftImages: "初稿图片"
};
