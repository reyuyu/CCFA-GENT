# 十、检索AGENT的精细需求管理

## 1. 背景

最初的 `SemanticScholarRetrievalAgent` 主要负责“找到候选论文”。它可以返回标题、摘要、年份、venue、Semantic Scholar ID、引用量、URL、`openAccessPdf` 等元信息，但它不会自动读取论文全文，也不会自动把检索结果加入本地参考论文库。

这个边界是正确的，因为参考库属于用户论文工程的一部分，不能由 Agent 擅自写入。但是在真实写作工作流里，用户常常会说：

```text
请把 SmartCLIP 这篇 CVPR 论文添加到我的参考论文中
```

如果 Agent 只回答“我没有添加权限”，体验会断掉。更合理的策略是：Agent 不直接添加，但可以生成一个用户确认的“精读请求卡片”。用户点击确认后，系统再下载 PDF、调用 MinerU 解析，并把 Markdown 结果加入 `coreReferences` 或 `optionalReferences`。

## 2. 设计目标

这次更新的目标是建立一个检索后的精细需求管理流程：

1. 检索 Agent 继续保持轻量，只负责发现、筛选和推荐。
2. 对高价值且有可访问 PDF 的论文，Agent 可以排队生成“参考论文精读请求”。
3. 请求不会阻塞当前回答，Agent 仍然正常完成当前调研或写作建议。
4. 用户必须在前端点击确认，系统才会下载 PDF、调用 MinerU、写入参考库。
5. Agent 在 PDF 被解析成 Markdown 之前，不能声称已经阅读全文。

## 3. 后端设计

新增运行上下文字段：

```python
reference_requests: list[dict[str, Any]]
```

它和 `patches` 类似，都是 Agent 运行过程中由工具写入、最终由 backend 自动附加到 `AgentResponse` 的结构化结果。

新增工具：

```text
request_reference_paper_reading
```

该工具会写入一个 `referenceRequests` 项，包括：

- title
- semanticScholarPaperId
- year
- venue
- authors
- citationCount
- paperUrl
- pdfUrl
- relevanceReason
- whyUsefulForThisProject
- suggestedReferenceScope
- usefulForSections
- status

该工具现在加入了 `PaperManagerAgent`、`PaperWritingAgent`、`PaperCheckAgent` 和 `SemanticScholarRetrievalAgent` 的工具集合。这样无论请求由主控 Agent、写作 Agent、检查 Agent 还是检索 Agent 接住，都可以生成同一种确认卡片。

## 4. PDF URL 解析接口

新增接口：

```text
POST /api/mineru/parse-pdf-url
```

它负责：

1. 接收 `pdfUrl` 和可选 `fileName`。
2. 后端下载 PDF，避免前端 CORS 和重定向问题。
3. 校验 URL scheme、HTTP 状态、content type、文件大小和 PDF 文件头。
4. 复用现有 `parse_pdf_with_mineru` 流程。
5. 返回 Markdown、图片资产、章节列表和统计信息。

这个接口不直接写入工程文件。写入动作仍由前端在用户确认后完成。

## 5. 前端交互

`AgentResponse` 新增：

```ts
referenceRequests?: AgentReferenceRequest[];
```

聊天消息 `ChatMessage` 也保存同样的请求列表，使卡片能跟随某次 Agent 回复持久显示。

前端展示为 `Reference Reading Requests` 卡片。用户可以：

- `Add`：按 Agent 建议加入核心或可选参考论文。
- `Add as core`：强制加入核心参考论文。
- `Ignore`：忽略该请求。

点击添加后，前端会：

1. 调用 `/api/mineru/parse-pdf-url`。
2. 将 MinerU Markdown 写入对应参考论文目录。
3. 保存解析出的图片资产。
4. 填充参考论文元信息。
5. 将请求状态更新为 `added` 或 `failed`。

## 6. Prompt 约束

检索 Agent 新增了“Reference reading requests”规则：

- 只有高相关且有 `openAccessPdf.url` 的论文才生成请求。
- 每次最多排队 1-3 篇。
- 不自动加入参考库。
- 不阻塞当前回答。
- 不声称已阅读全文。
- `coreReferences` 只用于基础性、中心性、项目会反复使用的论文，否则使用 `optionalReferences`。

主控 Agent 也新增规则：

当用户明确要求“添加、保存、导入、加入参考库”某篇论文时，不再回答“没有权限”。如果 PDF URL 已知，则调用 `request_reference_paper_reading`；如果 PDF URL 未知，则先调用 `retrieve_academic_papers`，再在找到可访问 PDF 后生成请求卡片。

## 7. SmartCLIP 触发案例

用户请求：

```text
你能不能找到 SmartCLIP 这个论文，发表在 CVPR 的，可以添加到我的参考论文中吗
```

正确行为应为：

1. 找到 `SmartCLIP: Modular Vision-language Alignment with Identification Guarantees`。
2. 确认 CVPR 2025 和 open access PDF。
3. 正常解释论文元信息和推荐理由。
4. 同时生成一个参考论文精读请求卡片。
5. 用户点击 `Add` 或 `Add as core` 后，再解析并加入本地参考库。

## 8. 关键原则

这个设计把“发现论文”和“纳入工程证据”分开：

- 检索结果只是候选信息。
- 精读请求只是待确认动作。
- MinerU 解析后的 Markdown 才能成为本地参考材料。
- 写作和检查 Agent 只能把已解析的本地参考论文当作可读证据。

这样可以让 Agent 更主动，但仍然保持论文工程的可控性和证据边界。
