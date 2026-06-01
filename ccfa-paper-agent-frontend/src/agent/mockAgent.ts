import type { AgentContext } from "../types/agent";

export async function mockAgentReply(context: AgentContext, userMessage: string): Promise<string> {
  await new Promise((resolve) => window.setTimeout(resolve, 650));

  const referenceCount = context.referencePaperMetas.length;

  return [
    `我已收到你的请求：“${userMessage}”。`,
    "",
    `当前工程为 **${context.projectMeta.paperTitle}**，目标 venue 是 **${context.projectMeta.targetVenue || "尚未填写"}**。`,
    "",
    `我可以读取工程元信息、${context.files.length} 个文件摘要、${referenceCount} 条参考论文人工信息和图片元数据。段落级内容暂时不会进入 Agent 上下文。`
  ].join("\n");
}
