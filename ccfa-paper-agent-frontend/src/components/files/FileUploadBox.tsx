import { UploadCloud } from "lucide-react";
import { useRef, useState } from "react";
import { parsePdfWithMinerU } from "../../agent/mineruApi";
import { useProjectStore } from "../../store/projectStore";
import type { FolderType } from "../../types/file";
import {
  createProjectFile,
  createProjectFileInWorkspace,
  getAllowedExtensions,
  validateFileForFolder
} from "../../utils/fileReader";
import { convertLatexToMarkdown } from "../../utils/latexToMarkdown";
import {
  sanitizeFolderName,
  sanitizeRelativeAssetPath,
  saveAssetsIntoWorkspace
} from "../../utils/workspaceFs";

const escapeMarkdownLinkTarget = (target: string) =>
  /[\s()]/.test(target) ? `<${target.replace(/[<>]/g, "-")}>` : target;

const markdownImagePattern =
  /!\[(?<alt>[^\]]*)\]\((?<target><[^>]+>|[^\n]*?\.(?:png|jpe?g|gif|webp|bmp|svg))(?:\s+(?<title>"[^"]*"|'[^']*'|\([^)]*\)))?\)/gi;

export function FileUploadBox({
  projectId,
  folderType
}: {
  projectId: string;
  folderType: FolderType;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const project = useProjectStore((state) =>
    state.projects.find((candidate) => candidate.id === projectId)
  );
  const uploadFileToFolder = useProjectStore((state) => state.uploadFileToFolder);
  const deleteFile = useProjectStore((state) => state.deleteFile);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [statusText, setStatusText] = useState("");

  const extensions = getAllowedExtensions(folderType);

  const createParsedMarkdownFile = (sourceName: string, markdown: string) => {
    const suffix = folderType === "draftManuscripts" ? ".md" : ".mineru.md";
    const markdownName = sourceName.replace(/\.pdf$/i, "") + suffix;
    return new File([markdown], markdownName, { type: "text/markdown" });
  };

  const createLatexMarkdownFile = async (file: File) => {
    const { markdown, stats } = convertLatexToMarkdown(await file.text(), file.name);
    const markdownName = file.name.replace(/\.tex$/i, "") + ".md";
    return {
      markdownFile: new File([markdown], markdownName, { type: "text/markdown" }),
      stats
    };
  };

  const createAssetFolderName = (sourceName: string) => {
    const safeBaseName = sanitizeFolderName(sourceName.replace(/\.pdf$/i, ""))
      .replace(/[()（）]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 72);
    return `${safeBaseName || "paper"}.mineru.assets`;
  };

  const rewriteAssetLinks = (markdown: string, assetFolderName: string) => {
    const normalizeTarget = (target: string) => {
      const trimmed = target.trim();
      const bare =
        trimmed.startsWith("<") && trimmed.endsWith(">") ? trimmed.slice(1, -1) : trimmed;
      if (/^(?:[a-z][a-z0-9+.-]*:|#|\/)/i.test(bare)) {
        return bare;
      }

      const hashIndex = bare.indexOf("#");
      const beforeHash = hashIndex >= 0 ? bare.slice(0, hashIndex) : bare;
      const hashSuffix = hashIndex >= 0 ? bare.slice(hashIndex) : "";
      const queryIndex = beforeHash.indexOf("?");
      const path = queryIndex >= 0 ? beforeHash.slice(0, queryIndex) : beforeHash;
      const querySuffix = queryIndex >= 0 ? beforeHash.slice(queryIndex) : "";
      const safePath = sanitizeRelativeAssetPath(path);
      return escapeMarkdownLinkTarget(`${assetFolderName}/${safePath}${querySuffix}${hashSuffix}`);
    };

    const withMarkdownImages = markdown.replace(
      markdownImagePattern,
      (...args) => {
        const groups = args[args.length - 1] as { alt: string; target: string; title?: string };
        return `![${groups.alt}](${normalizeTarget(groups.target)}${groups.title ? ` ${groups.title}` : ""})`;
      }
    );

    return withMarkdownImages.replace(
      /(?<before><img\b[^>]*\bsrc=["'])(?<url>[^"']+)(?<after>["'][^>]*>)/gi,
      (...args) => {
        const groups = args[args.length - 1] as { before: string; url: string; after: string };
        return `${groups.before}${normalizeTarget(groups.url)}${groups.after}`;
      }
    );
  };

  const stripDraftImageLinks = (markdown: string) =>
    markdown
      .replace(markdownImagePattern, "")
      .replace(/<img\b[^>]*>\s*/gi, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

  const clearExistingDraftFiles = () => {
    if (folderType === "draftManuscripts") {
      project?.folders.draftManuscripts.forEach((existingFile) => {
        deleteFile(projectId, "draftManuscripts", existingFile.id);
      });
    }
  };

  const uploadProjectFile = (projectFile: Parameters<typeof uploadFileToFolder>[2]) => {
    uploadFileToFolder(projectId, folderType, projectFile);
  };

  return (
    <div>
      <button
        type="button"
        className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-morandi-clay bg-morandi-mist/70 px-3 py-2.5 text-sm text-morandi-muted transition hover:border-sage-600 hover:bg-morandi-green hover:text-sage-700 disabled:cursor-not-allowed disabled:opacity-70"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
      >
        <UploadCloud className="h-4 w-4" />
        {busy ? statusText || "正在处理文件..." : `添加文件 ${extensions.join(" / ")}`}
      </button>
      <input
        ref={inputRef}
        type="file"
        multiple={folderType !== "draftManuscripts"}
        className="hidden"
        accept={extensions.join(",")}
        onChange={async (event) => {
          const files = Array.from(event.target.files ?? []);
          event.currentTarget.value = "";
          if (files.length === 0) return;

          setError("");
          setBusy(true);
          setStatusText("");
          try {
            if (folderType === "draftManuscripts" && files.length > 1) {
              throw new Error("初稿文档只能保留一个 md 文件，请一次只上传一个 PDF、md 或 tex 文件。");
            }

            for (const file of files) {
              const validationError = validateFileForFolder(file, folderType);
              if (validationError) {
                throw new Error(validationError);
              }

              const shouldParsePdf =
                file.name.toLowerCase().endsWith(".pdf") &&
                (folderType === "draftManuscripts" ||
                  folderType === "coreReferences" ||
                  folderType === "optionalReferences");
              const shouldConvertLatex =
                file.name.toLowerCase().endsWith(".tex") && folderType === "draftManuscripts";

              if (shouldParsePdf) {
                setStatusText("正在调用 MinerU 解析 PDF...");
                const parsed = await parsePdfWithMinerU(file);
                const assetFolderName = createAssetFolderName(file.name);
                const isDraftPdf = folderType === "draftManuscripts";
                const markdown = isDraftPdf
                  ? stripDraftImageLinks(parsed.markdown)
                  : rewriteAssetLinks(parsed.markdown, assetFolderName);

                if (!isDraftPdf) {
                  setStatusText("正在保存图片资源...");
                }
                if (!isDraftPdf && project?.workspace?.rootDirectoryHandle && parsed.assets.length > 0) {
                  await saveAssetsIntoWorkspace(
                    project.workspace.rootDirectoryHandle,
                    folderType,
                    assetFolderName,
                    parsed.assets
                  );
                }

                setStatusText("正在保存 Markdown 文件...");
                const markdownFile = createParsedMarkdownFile(file.name, markdown);
                clearExistingDraftFiles();
                const projectFile =
                  project?.workspace?.rootDirectoryHandle
                    ? await createProjectFileInWorkspace(project, markdownFile, folderType)
                    : await createProjectFile(markdownFile, folderType);

                uploadProjectFile({
                  ...projectFile,
                  parsedMarkdownUrl: parsed.markdownUrl,
                  mineruTaskId: parsed.taskId,
                  parsedSections: parsed.sections,
                  parsedStats: parsed.stats,
                  parsedImageAssets: isDraftPdf ? undefined : parsed.assets,
                  parsedAssetFolder: isDraftPdf ? undefined : assetFolderName
                });
                continue;
              }

              if (shouldConvertLatex) {
                setStatusText("正在转换 LaTeX 为 Markdown...");
                const { markdownFile, stats } = await createLatexMarkdownFile(file);

                setStatusText("正在写入工程目录...");
                clearExistingDraftFiles();
                const projectFile =
                  project?.workspace?.rootDirectoryHandle
                    ? await createProjectFileInWorkspace(project, markdownFile, folderType)
                    : await createProjectFile(markdownFile, folderType);

                uploadProjectFile({
                  ...projectFile,
                  parsedStats: {
                    sectionCount: stats.headingCount,
                    imageCount: 0,
                    tableCount: 0,
                    formulaCount: stats.formulaCount
                  }
                });
                continue;
              }

              setStatusText("正在写入工程目录...");
              clearExistingDraftFiles();
              const projectFile =
                project?.workspace?.rootDirectoryHandle
                  ? await createProjectFileInWorkspace(project, file, folderType)
                  : await createProjectFile(file, folderType);
              uploadProjectFile(projectFile);
            }
          } catch (errorValue) {
            setError(errorValue instanceof Error ? errorValue.message : "文件处理失败。");
          } finally {
            setBusy(false);
            setStatusText("");
          }
        }}
      />
      {error ? <p className="mt-2 whitespace-pre-line text-xs leading-5 text-red-600">{error}</p> : null}
      {!project?.workspace?.rootDirectoryHandle ? (
        <p className="mt-2 text-xs text-[#8a6d3b]">
          当前工程缺少目录权限，文件会暂存为浏览器副本。
        </p>
      ) : null}
    </div>
  );
}
