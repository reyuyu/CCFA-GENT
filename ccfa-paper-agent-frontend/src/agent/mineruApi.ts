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

async function readErrorMessage(response: Response): Promise<string> {
  const bodyMessage = await response
    .clone()
    .json()
    .then((body) => {
      if (typeof body?.detail === "string") return body.detail;
      return JSON.stringify(body);
    })
    .catch(async () => response.text().catch(() => ""));

  if (response.status === 413) {
    return bodyMessage || "PDF 文件超过后端允许的上传大小。";
  }
  if (response.status === 502) {
    return bodyMessage
      ? `MinerU 服务调用失败：${bodyMessage}`
      : "MinerU 服务调用失败，请查看后端日志。";
  }
  return bodyMessage || `MinerU parse request failed with HTTP ${response.status}`;
}

async function diagnoseBackendReachability(apiUrl: string): Promise<string> {
  try {
    const healthResponse = await fetch(`${apiUrl}/health`, {
      method: "GET",
      cache: "no-store"
    });
    if (healthResponse.ok) {
      return (
        "后端 /health 可以访问，但 PDF 上传请求被中断。常见原因包括：PDF 过大、浏览器取消上传、" +
        "本机代理/防火墙拦截上传请求，或后端在处理上传时崩溃。请查看 `.agent/logs/backend.log`。"
      );
    }
    return `后端 /health 返回 HTTP ${healthResponse.status}，请先检查后端服务日志。`;
  } catch {
    return `无法连接本地后端。请确认后端已启动，并能打开 ${apiUrl}/health。Mac 用户建议使用 Chrome / Edge，并确认防火墙允许 Python/Node 本地服务。`;
  }
}

export async function parsePdfWithMinerU(file: File): Promise<MinerUParseResult> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("language", "en");
  formData.append("enable_table", "true");
  formData.append("enable_formula", "true");
  formData.append("is_ocr", "false");

  const apiUrl = getAgentApiUrl();
  let response: Response;
  try {
    response = await fetch(`${apiUrl}/api/mineru/parse-pdf`, {
      method: "POST",
      body: formData
    });
  } catch (error) {
    const diagnosis = await diagnoseBackendReachability(apiUrl);
    const browserMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`PDF 解析请求没有成功发送或响应中断：${browserMessage}\n\n${diagnosis}`);
  }

  if (!response.ok) {
    const message = await readErrorMessage(response);
    throw new Error(`PDF 解析失败（HTTP ${response.status}）：${message}`);
  }

  return (await response.json()) as MinerUParseResult;
}
