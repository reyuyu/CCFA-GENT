import type { DraftParagraph } from "../types/file";
import { createId, nowIso } from "./id";

export function hashText(text: string): string {
  let hash = 5381;
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 33) ^ text.charCodeAt(index);
  }
  return (hash >>> 0).toString(16);
}

export function parseMarkdownParagraphs(
  markdown: string,
  existing: DraftParagraph[] = []
): DraftParagraph[] {
  const existingByHash = new Map(existing.map((paragraph) => [paragraph.contentHash, paragraph]));
  const paragraphs: DraftParagraph[] = [];
  const headingPath: string[] = [];
  const buffer: string[] = [];

  const flushParagraph = () => {
    const content = buffer.join("\n").trim();
    buffer.length = 0;

    if (!content || content.startsWith("```") || content.startsWith("|")) {
      return;
    }

    const contentHash = hashText(content);
    const previous = existingByHash.get(contentHash);
    paragraphs.push({
      id: previous?.id ?? createId("para"),
      content,
      contentHash,
      headingPath: [...headingPath],
      userAssignedHeading: previous?.userAssignedHeading,
      writingStatus: previous?.writingStatus ?? "draft",
      updatedAt: previous?.updatedAt ?? nowIso()
    });
  };

  for (const rawLine of markdown.split(/\r?\n/)) {
    const line = rawLine.trim();
    const headingMatch = /^(#{1,6})\s+(.+)$/.exec(line);

    if (headingMatch) {
      flushParagraph();
      const level = headingMatch[1].length;
      headingPath.length = level - 1;
      headingPath[level - 1] = headingMatch[2].replace(/\s+#*$/, "");
      continue;
    }

    if (!line) {
      flushParagraph();
      continue;
    }

    if (/^[-*+]\s+/.test(line) || /^\d+\.\s+/.test(line)) {
      buffer.push(line);
      continue;
    }

    buffer.push(rawLine);
  }

  flushParagraph();
  return paragraphs;
}
