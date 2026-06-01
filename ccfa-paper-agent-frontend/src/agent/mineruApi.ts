import type { ParsedImageAsset, ParsedReferenceSection, ParsedReferenceStats } from "../types/file";
import { getAgentApiUrl } from "./agentApi";

export type MinerUParseResult = {
  taskId: string;
  markdownUrl: string;
  markdown: string;
  assets: ParsedImageAsset[];
  sections: ParsedReferenceSection[];
  stats: ParsedReferenceStats;
};

export async function parsePdfWithMinerU(file: File): Promise<MinerUParseResult> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("language", "en");
  formData.append("enable_table", "true");
  formData.append("enable_formula", "true");
  formData.append("is_ocr", "false");

  const response = await fetch(`${getAgentApiUrl()}/api/mineru/parse-pdf`, {
    method: "POST",
    body: formData
  });

  if (!response.ok) {
    const message = await response
      .clone()
      .json()
      .then((body) => body.detail ?? JSON.stringify(body))
      .catch(async () => response.text().catch(() => ""));
    throw new Error(message || `MinerU parse request failed with ${response.status}`);
  }

  return (await response.json()) as MinerUParseResult;
}
