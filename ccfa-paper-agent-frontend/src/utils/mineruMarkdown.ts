import type { FolderType } from "../types/file";
import { sanitizeFolderName, sanitizeRelativeAssetPath } from "./workspaceFs";

const escapeMarkdownLinkTarget = (target: string) =>
  /[\s()]/.test(target) ? `<${target.replace(/[<>]/g, "-")}>` : target;

const markdownImagePattern =
  /!\[(?<alt>[^\]]*)\]\((?<target><[^>]+>|[^\n]*?\.(?:png|jpe?g|gif|webp|bmp|svg))(?:\s+(?<title>"[^"]*"|'[^']*'|\([^)]*\)))?\)/gi;

export function createParsedMarkdownFile(sourceName: string, markdown: string, folderType: FolderType) {
  const suffix = folderType === "draftManuscripts" ? ".md" : ".mineru.md";
  const markdownName = sourceName.replace(/\.pdf$/i, "") + suffix;
  return new File([markdown], markdownName, { type: "text/markdown" });
}

export function createMineruAssetFolderName(sourceName: string) {
  const safeBaseName = sanitizeFolderName(sourceName.replace(/\.pdf$/i, ""))
    .replace(/[()锛堬級]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 72);
  return `${safeBaseName || "paper"}.mineru.assets`;
}

export function rewriteMineruAssetLinks(markdown: string, assetFolderName: string) {
  const normalizeTarget = (target: string) => {
    const trimmed = target.trim();
    const bare = trimmed.startsWith("<") && trimmed.endsWith(">") ? trimmed.slice(1, -1) : trimmed;
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

  const withMarkdownImages = markdown.replace(markdownImagePattern, (...args) => {
    const groups = args[args.length - 1] as { alt: string; target: string; title?: string };
    return `![${groups.alt}](${normalizeTarget(groups.target)}${groups.title ? ` ${groups.title}` : ""})`;
  });

  return withMarkdownImages.replace(
    /(?<before><img\b[^>]*\bsrc=["'])(?<url>[^"']+)(?<after>["'][^>]*>)/gi,
    (...args) => {
      const groups = args[args.length - 1] as { before: string; url: string; after: string };
      return `${groups.before}${normalizeTarget(groups.url)}${groups.after}`;
    }
  );
}

export function stripDraftImageLinks(markdown: string) {
  return markdown
    .replace(markdownImagePattern, "")
    .replace(/<img\b[^>]*>\s*/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
