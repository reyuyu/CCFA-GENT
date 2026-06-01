# 六、agent as tool：检索 AGENT 的设计

## 1. 设计目标

本次设计的目标，是在当前 CCFA Paper Agent 工程中加入 Semantic Scholar 学术检索能力，同时保持现有工程结构稳定，不做大规模重构。

新增的检索能力不是为了自动把论文加入参考库，而是为了：

1. 当本地参考论文不足时，帮助用户发现候选论文。
2. 当已有参考论文有 Semantic Scholar Paper ID 时，基于它做被引扩展或参考文献扩展。
3. 为 Introduction、Related Work、Method framing 等写作任务提供潜在语料来源。
4. 将检索结果返回给用户确认，而不是自动写入项目文件。

最终形成三个 Agent 角色：

```text
PaperManagerAgent                主控 Agent
PaperWritingAgent                写作 Agent，可 handoff
SemanticScholarRetrievalAgent    检索 Agent，被封装成 tool 调用
```

## 2. 为什么使用 agent as tool

Semantic Scholar 检索不是简单的一次 API 请求。

它需要判断：

- 用户到底想找什么类型的论文；
- 本地是否已有可扩展的相关论文；
- 应该开放式检索，还是做 citation expansion；
- 应该找后续工作，还是找基础参考；
- 返回结果中哪些最适合当前项目。

这些判断本身有一定 Agent 行为，因此采用：

```python
retrieval_agent.as_tool(...)
```

把 `SemanticScholarRetrievalAgent` 封装成：

```text
retrieve_academic_papers
```

这样 `PaperManagerAgent` 和 `PaperWritingAgent` 都可以像调用普通工具一样调用检索 Agent。

## 3. Agent 关系

当前 Agent 关系如下：

```text
PaperManagerAgent
  tools:
    - draft tools
    - reference tools
    - skill tools
    - edit tools
    - retrieve_academic_papers

  handoff:
    - PaperWritingAgent

PaperWritingAgent
  tools:
    - draft tools
    - reference tools
    - skill tools
    - edit tools
    - retrieve_academic_papers

SemanticScholarRetrievalAgent
  tools:
    - list_reference_papers
    - semantic_paper_search
    - semantic_paper_citation_search
    - semantic_paper_reference_search
```

也就是说：

- 主控 Agent 可以直接检索。
- 写作 Agent 在发现语料不足时也可以检索。
- 检索 Agent 自己可以读取本地参考论文元信息，并调用 Semantic Scholar API。

## 4. 后端配置

新增 Semantic Scholar 配置：

```text
SEMANTIC_SCHOLAR_API_KEY=
SEMANTIC_SCHOLAR_BASE_URL=https://api.semanticscholar.org/graph/v1
SEMANTIC_SCHOLAR_REQUEST_TIMEOUT_SECONDS=30
```

这些配置进入 `Settings`：

```python
semantic_scholar_api_key
semantic_scholar_base_url
semantic_scholar_request_timeout_seconds
```

请求规则：

1. 如果配置了 API key，则请求头加入：

```text
x-api-key: ...
```

2. 如果没有 API key，也允许匿名请求。
3. 对 429、超时、连接失败、HTTP 错误都返回清晰错误信息。

尤其是 429：

```text
Semantic Scholar rate limit hit (HTTP 429).
Please wait and try again, or configure SEMANTIC_SCHOLAR_API_KEY.
```

## 5. Semantic Scholar 服务层

新增文件：

```text
app/services/semantic_scholar.py
```

服务层提供三个异步函数：

```python
async def search_papers(query: str, limit: int = 10, settings: Settings) -> dict
async def get_paper_citations(paper_id: str, limit: int = 20, settings: Settings) -> dict
async def get_paper_references(paper_id: str, limit: int = 20, settings: Settings) -> dict
```

### 5.1 开放式检索

调用：

```text
GET /paper/search
```

用途：

```text
用户给出研究方向，但本地没有明显可扩展论文
```

返回策略标记：

```json
{
  "strategy": "open_search"
}
```

### 5.2 被引扩展

调用：

```text
GET /paper/{paper_id}/citations
```

用途：

```text
已有一篇相关论文，想找后续引用它的新工作
```

返回策略标记：

```json
{
  "strategy": "citation_expansion"
}
```

### 5.3 参考文献扩展

调用：

```text
GET /paper/{paper_id}/references
```

用途：

```text
已有一篇相关论文，想找它引用过的基础论文
```

返回策略标记：

```json
{
  "strategy": "reference_expansion"
}
```

## 6. 统一论文结构

无论来自 search、citations 还是 references，每篇论文都会被规范化为统一结构：

```json
{
  "paperId": "...",
  "title": "...",
  "abstract": "...",
  "authors": ["..."],
  "year": 2024,
  "venue": "...",
  "citationCount": 0,
  "url": "...",
  "externalIds": {},
  "openAccessPdf": {}
}
```

摘要最多保留约 800 字符，避免一次检索把上下文塞得过长。

## 7. Semantic Scholar Tools

新增文件：

```text
app/tools/semantic_scholar_tools.py
```

包含三个 `@function_tool`：

```text
semantic_paper_search
semantic_paper_citation_search
semantic_paper_reference_search
```

### 7.1 `semantic_paper_search`

根据 query 检索相关论文。

典型使用场景：

```text
帮我找肺癌 CT concept-based diagnosis 的相关论文
```

### 7.2 `semantic_paper_citation_search`

根据本地已有论文的 `semanticScholarPaperId`，寻找引用它的后续论文。

典型使用场景：

```text
已有 MICA 这类核心论文，找后续引用它的工作
```

### 7.3 `semantic_paper_reference_search`

根据本地已有论文的 `semanticScholarPaperId`，寻找它引用过的基础论文。

典型使用场景：

```text
从一篇综述或核心方法论文向前追溯基础文献
```

## 8. Retrieval Agent prompt

`SemanticScholarRetrievalAgent` 的提示词强调三种策略：

```text
open_search
citation_expansion
reference_expansion
```

检索后需要筛选 5-10 篇候选论文，并说明：

- title
- semanticScholarPaperId
- year
- venue
- authors
- citationCount
- url
- openAccessPdf url
- relevanceReason
- whyUsefulForThisProject
- 本次使用的策略

同时要求：

```text
不要自动加入参考库，最终由用户确认。
```

这点非常重要，因为检索结果只是候选材料，不是项目事实。

## 9. 本地参考论文元信息扩展

为了让 Retrieval Agent 能基于本地参考论文做扩展，前端参考论文元信息新增字段：

```ts
semanticScholarPaperId?: string
```

它属于：

```ts
ReferencePaperMeta
```

核心参考论文和可选参考论文都支持这个字段。

前端参考论文信息表单新增：

```text
Semantic Scholar Paper ID
```

保存后会进入 project state，并随 agent context 传给后端。

## 10. 与 Introduction Skill 的关系

Introduction skill 中新增了“语料充足原则”：

```text
如果没有充分语料，不允许硬写。
```

当本地草稿、参考论文、项目上下文不足以支撑某段 Introduction 时，WritingAgent 可以调用：

```text
retrieve_academic_papers
```

去寻找潜在语料。

但检索结果必须返回给用户确认。Agent 需要明确告诉用户：

- 哪些语料不足；
- 为什么现在不能可靠写作；
- 检索到了哪些候选论文；
- 哪些论文可能补足当前缺口。

因此检索 Agent 是写作 Agent 的“语料补给机制”，不是自动写作捷径。

## 11. 流式进度提示

为了让用户看到检索过程，streaming progress messages 新增：

```text
semantic_paper_search:
正在检索 Semantic Scholar 相关论文...

semantic_paper_citation_search:
正在检索该论文的后续被引工作...

semantic_paper_reference_search:
正在检索该论文的参考文献...

retrieve_academic_papers:
正在调用学术检索 Agent...
```

这样当前端进入流式对话时，用户能看到 Agent 正在检索，而不是卡住。

## 12. 不自动入库原则

检索结果不自动写入：

```text
core-references/
optional-references/
```

也不会自动创建参考论文文件。

原因：

1. Semantic Scholar 检索结果只是候选。
2. 用户需要判断论文是否真的适合当前项目。
3. 参考论文最好仍由用户确认、下载、解析、补充元信息。
4. 自动加入会污染本地参考库。

所以检索结果只进入聊天回答，由用户确认后再手动加入参考库。

## 13. 当前验证结果

后端装配检查结果：

```text
PaperManagerAgent 20 True ['retrieve_academic_papers']
PaperWritingAgent 20 True ['retrieve_academic_papers']
SemanticScholarRetrievalAgent 4 False ['semantic_paper_search', 'semantic_paper_citation_search', 'semantic_paper_reference_search']
```

含义：

- `PaperManagerAgent` 已经能调用 `retrieve_academic_papers`。
- `PaperWritingAgent` 已经能调用 `retrieve_academic_papers`。
- `SemanticScholarRetrievalAgent` 自己拥有三个底层 Semantic Scholar 检索工具。

前端构建也通过：

```text
npm.cmd run build
```

## 14. 后续可扩展方向

后续可以继续扩展：

1. 在前端显示“候选论文卡片”，让用户一键加入参考库。
2. 支持 DOI / arXiv ID / Corpus ID 自动识别。
3. 给检索结果增加去重逻辑。
4. 根据 target venue 过滤高质量论文。
5. 将用户确认后的候选论文自动创建为 reference meta 草稿。
6. 对 openAccessPdf 自动下载并进入 MinerU 解析流程。

当前版本先保持保守：

```text
只推荐，不入库。
```

这符合当前系统“用户确认优先”的整体设计。
