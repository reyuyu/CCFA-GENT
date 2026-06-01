下面这版可以作为第四篇 agent 笔记：**PDF 文档自动解析设计**。

这篇记录的是当前工程里“上传参考论文 PDF，自动解析成可编辑 Markdown，并保留图片、表格、公式、caption 和章节结构”的技术设计。

## 1、设计目标

PDF 自动解析的目标不是简单把 PDF 变成一段纯文本，而是把参考论文变成 agent 和用户都能继续使用的工程文件。

它要解决四件事：

1. 用户上传核心参考论文或可参考论文的 PDF 后，系统自动解析为 Markdown。
2. Markdown 中要尽量保留论文正文、标题层级、图片、图片 caption、表格、公式和参考文献。
3. 解析结果只保留一个主 Markdown 文件，方便用户预览、编辑、整理章节和让 agent 读取。
4. 图片等二进制资源不塞进 Markdown，而是放到每篇论文自己的资源文件夹中，Markdown 用相对路径引用。

最终目标是让 PDF 变成项目中的普通参考论文 `.md`，后续 agent tools 可以像读取普通 Markdown 一样读取它。

## 2、核心原则

**第一，PDF 只是输入，不作为最终工程文件。**

用户上传 PDF 后，前端不会把原始 PDF 文件卡片长期保留在参考论文列表里。

当前流程是：

```text
上传 PDF
  -> 后端调用 MinerU 精准解析
  -> 前端生成 paper-name.mineru.md
  -> 前端生成 paper-name.mineru.assets/
  -> 参考论文列表中只保留 .mineru.md
```

这样可以避免同一篇论文同时出现 PDF 和 Markdown 两个入口，减少后续 agent 读取时的歧义。

**第二，图片资源必须独立存放，不内嵌到 Markdown。**

早期尝试过把图片转成：

```text
data:image/png;base64,...
```

直接塞进 Markdown。这个方案有几个问题：

- Markdown 文件会变得极长。
- 编辑器和 diff 弹窗会卡顿。
- React Markdown / rehype 生态对超长 data URL 不稳定。
- 人工微调时很难阅读。

因此当前采用资源文件夹设计：

```text
core-references/
  paper-name.mineru.md
  paper-name.mineru.assets/
    images/
      xxx.png
      yyy.jpg
```

Markdown 中使用相对路径：

```md
![Figure 2](paper-name.mineru.assets/images/xxx.png)
```

**第三，解析结果必须可人工修正。**

MinerU 的解析结果不一定完美，尤其是标题层级、图表归属、公式排版、参考文献结构。

所以解析后的 `.mineru.md` 仍然走普通文件流程：

- 可以预览 Markdown。
- 可以手动编辑。
- 可以使用“章节整理”规范标题结构。
- agent 修改时仍然生成 pending change，由用户确认后应用。

**第四，agent 读取参考论文时仍以 Markdown 文本为主。**

当前 reference tools 读取的是 Markdown 标题和章节内容，不直接做视觉理解。

图片路径和 caption 会保留在 Markdown 中，agent 可以知道某个位置有图以及图注是什么。

如果未来需要让 agent 理解图片内容，再新增读取图片资源的 tool，而不是把图片逻辑塞进现有文本 tools。

## 3、当前文件位置

后端 MinerU 解析入口：

```text
ccfa-paper-agent-backend/app/main.py
```

相关接口：

```text
POST /api/mineru/parse-pdf
```

后端 MinerU 解析服务：

```text
ccfa-paper-agent-backend/app/services/mineru_parser.py
```

作用：

- 调用 MinerU 精准解析 API。
- 申请上传 URL。
- 上传 PDF。
- 轮询解析结果。
- 下载 full zip。
- 从 zip 中读取 Markdown 和图片资源。
- 返回 Markdown、图片资源、章节统计。

后端 schema：

```text
ccfa-paper-agent-backend/app/schemas/mineru.py
```

核心返回结构：

```text
taskId
markdownUrl
markdown
assets
sections
stats
```

前端 MinerU API client：

```text
ccfa-paper-agent-frontend/src/agent/mineruApi.ts
```

前端上传入口：

```text
ccfa-paper-agent-frontend/src/components/files/FileUploadBox.tsx
```

作用：

- 判断上传文件是否为参考论文 PDF。
- 调用后端 MinerU 解析接口。
- 生成 `.mineru.md`。
- 创建 `.mineru.assets/` 资源目录。
- 改写 Markdown 图片链接。
- 把 Markdown 文件加入参考论文列表。

前端文件类型：

```text
ccfa-paper-agent-frontend/src/types/file.ts
```

新增字段包括：

```ts
parsedMarkdownUrl?: string;
mineruTaskId?: string;
parsedSections?: ParsedReferenceSection[];
parsedStats?: ParsedReferenceStats;
parsedImageAssets?: ParsedImageAsset[];
parsedAssetFolder?: string;
```

前端本地工程文件工具：

```text
ccfa-paper-agent-frontend/src/utils/workspaceFs.ts
```

作用：

- 复制 Markdown 到工程目录。
- 创建资源文件夹。
- 写入图片资源。
- 保存项目状态时去掉不适合持久化的浏览器内存资源。

Markdown 预览：

```text
ccfa-paper-agent-frontend/src/components/files/MarkdownPreviewModal.tsx
```

作用：

- 渲染 Markdown。
- 支持 GFM 表格。
- 支持 LaTeX / KaTeX 公式。
- 支持 HTML 图片标签。
- 将 Markdown 相对图片路径映射到浏览器内存中的图片 dataUrl 进行预览。

## 4、解析流程

完整流程如下：

```text
用户上传 PDF
  -> FileUploadBox 判断文件属于 coreReferences / optionalReferences
  -> parsePdfWithMinerU(file)
  -> POST /api/mineru/parse-pdf
  -> 后端读取 UploadFile bytes
  -> MinerU 精准解析申请 batch 上传 URL
  -> PUT 上传 PDF 到 MinerU 返回的签名 URL
  -> 轮询 batch 解析结果
  -> 获取 full_zip_url
  -> 下载 zip
  -> 读取 zip 中的 Markdown
  -> 读取 zip 中的图片资源
  -> 返回 markdown + assets + stats
  -> 前端创建 paper-name.mineru.assets/
  -> 前端写入图片资源
  -> 前端改写 Markdown 图片路径
  -> 前端创建 paper-name.mineru.md
  -> uploadFileToFolder 加入项目状态
```

其中前端最终生成的文件结构大致是：

```text
core-references/
  A-Survey-of-LLM-Agents.mineru.md
  A-Survey-of-LLM-Agents.mineru.assets/
    images/
      0.jpg
      1.png
```

`.mineru.md` 中的图片引用是：

```md
![Figure 1](A-Survey-of-LLM-Agents.mineru.assets/images/0.jpg)
```

## 5、为什么使用 MinerU 精准解析

一开始接入的是 MinerU lightweight agent 接口。

轻量接口流程更简单：

```text
POST /api/v1/agent/parse/file
  -> 获得 file_url 和 task_id
  -> PUT PDF
  -> GET /api/v1/agent/parse/{task_id}
  -> 获得 markdown_url
```

但是它有几个问题：

- 图片资源不稳定。
- 只能拿到 Markdown URL，不方便拿完整资源包。
- 对复杂论文版面、公式、表格、caption 的保留不足。
- 不适合把论文完整变成工程文件。

因此改为 MinerU v4 精准解析：

```text
POST /api/v4/file-urls/batch
PUT signed upload url
GET /api/v4/extract-results/batch/{batch_id}
download full_zip_url
```

精准解析需要 Token：

```env
MINERU_PARSE_MODE=precision
MINERU_API_TOKEN=...
MINERU_PRECISION_MODEL=pipeline
MINERU_MAX_UPLOAD_MB=200
```

默认模型使用：

```text
pipeline
```

原因是 `vlm` 更偏视觉理解，长论文可能出现只解析到中途的问题；`pipeline` 更适合完整论文结构抽取。

## 6、完整性问题与处理策略

PDF 解析不完整是当前必须重点防范的问题。

已经遇到过的问题：

```text
一篇 PDF 只解析到 4.2 节，后面的 Conclusion / References 全部缺失。
```

当前做了三层处理：

**第一，默认使用 pipeline 模型。**

配置位置：

```text
ccfa-paper-agent-backend/app/core/config.py
```

默认值：

```python
mineru_precision_model: str = "pipeline"
```

**第二，zip 中选择更完整的 Markdown。**

MinerU zip 中可能存在多个 `.md` 文件。

如果盲目读取第一个 `full.md`，可能拿到较短版本。

当前策略是：

1. 扫描 zip 内所有 `.md`。
2. 计算每个 md 的正文长度。
3. 如果 `full.md` 的长度接近最长 md，则使用 `full.md`。
4. 如果 `full.md` 明显短，则使用最长 md。

相关函数：

```text
_find_full_markdown
markdown_from_precision_zip
```

**第三，保留解析统计用于人工判断。**

后端返回：

```text
sectionCount
imageCount
tableCount
formulaCount
```

前端文件卡片会显示这些统计。

如果用户发现 sectionCount 或正文明显不完整，需要重新解析或调整 MinerU 配置。

未来可继续增强：

- 记录 PDF 页数和解析页数。
- 读取 MinerU middle_json 判断最后页码。
- 在前端提示“疑似解析不完整”。
- 支持用户选择 pipeline / vlm / MinerU-HTML。

## 7、图片资源设计

图片不进入主 Markdown 的 base64 正文，而是作为结构化资源返回。

后端返回结构：

```ts
type ParsedImageAsset = {
  path: string;
  mimeType: string;
  dataUrl: string;
};
```

其中：

- `path` 是图片在论文资源目录中的相对路径。
- `mimeType` 用于写入 Blob。
- `dataUrl` 只用于前端短期内存和写盘，不写进 Markdown。

前端保存时：

```text
saveAssetsIntoWorkspace(rootHandle, folderType, assetFolderName, assets)
```

如果工程绑定了本地目录：

- 创建 `paper-name.mineru.assets/`。
- 按相对路径写入图片。
- Markdown 文件中使用相对路径引用。

如果工程没有绑定本地目录：

- Markdown 文件作为浏览器副本保存。
- 图片资源保存在 `parsedImageAssets` 内存字段中。
- 预览器通过 `parsedImageAssets` 把相对路径映射成 dataUrl 显示。

保存项目状态时不会把图片 dataUrl 写进 `.agent/project-state.json`，避免状态文件膨胀。

相关代码：

```text
stripHandlesFromFile
```

会移除：

```text
parsedImageAssets
dataUrl
contentText
localHandle
```

## 8、章节整理功能

MinerU 解析出的标题层级不一定清晰。

因此参考论文 Markdown 文件卡片上提供：

```text
章节整理
```

相关前端位置：

```text
ccfa-paper-agent-frontend/src/components/files/FileList.tsx
ccfa-paper-agent-frontend/src/components/layout/ProjectSidebar.tsx
```

相关后端接口：

```text
POST /api/markdown/organize-sections
```

相关后端服务：

```text
ccfa-paper-agent-backend/app/services/markdown_organizer.py
```

当前章节整理的核心原则是：

```text
只改标题，不动正文。
```

整理逻辑：

1. 前端发送当前 Markdown 全文。
2. 后端先删除解析器附带的无效 details 块。
3. 后端把 Markdown 切成 heading unit 和 body unit。
4. 后端只把单元 id、当前标题、正文 preview 发给 DeepSeek。
5. Agent 只返回 JSON 标题计划，不返回正文。
6. 后端根据标题计划替换标题，或在正文块前插入标题。
7. 所有 body unit 使用原始 Markdown 原样拼回。
8. 后端校验整理前后的 body fingerprint 必须完全一致。
9. 前端生成 `proposeFileChange`。
10. 用户在 diff 弹窗中确认后才应用。

目标论文结构包括：

```text
# Paper Title
## Abstract
## Keywords
## 1 Introduction
## 2 Related Work
## 3 Method
## 4 Experiments
## 5 Results and Discussion
## 6 Conclusion
## References
## Appendix
```

并不是每篇论文都强制包含所有章节。

原则是：

- 只创建内容支持的章节。
- 子章节用 `###`。
- 不发明内容。
- 不移动正文块。
- 不改写正文、图片、caption、表格、公式、参考文献、代码块和普通 details。
- 如果 agent 产生的标题计划会导致正文变化，后端直接报错，不生成修改。

关键实现：

```text
_parse_markdown_units
_build_outline_units
_request_heading_plan_batch
_apply_heading_plan
_assert_body_unchanged
```

标题计划示例：

```json
{
  "changes": [
    { "id": 12, "heading": "## 1 Introduction" },
    { "id": 18, "heading": "### 1.1 Contributions" }
  ]
}
```

其中：

- 如果 `id` 指向 heading unit，则替换该标题行。
- 如果 `id` 指向 body unit，则在该正文块前插入标题。
- 正文内容永远不由模型输出。

## 9、解析附带 details 清理规则

MinerU 或视觉模型有时会给图片额外生成非论文正文内容，例如：

````md
<details>
<summary>flowchart</summary>

```mermaid
graph TD
    A --> B
```
</details>
````

或者：

```md
<details>
<summary>text_image</summary>

image 1
image 2
image 3
image 4
image 5
</details>
```

这些内容不是论文原文，而是解析器对图像的额外解读或图片文本索引。

当前章节整理时会在切分 Markdown 之前删除这些 details 块。

清理位置：

```text
ccfa-paper-agent-backend/app/services/markdown_organizer.py
```

相关函数：

```text
_remove_parser_details_artifacts
```

删除规则：

- 删除 `<summary>flowchart</summary>` 或 `<summary>flow chart</summary>` 对应的整个 `<details>...</details>`。
- 删除 `<summary>text_image</summary>` 对应的整个 `<details>...</details>`。
- 其他 `<details>` 块不做修改。

这样可以去掉解析器附带解释，同时避免误删论文正文中的普通折叠内容。

注意：当前实现不再让 agent 删除 flowchart，也不再做大范围 Mermaid 清理；只做上述精确 details 删除。

## 10、和 reference tools 的关系

当前 reference tools 不需要因为图片资源文件夹而大改。

原因是：

```text
reference tools 读取的是 Markdown 文本和章节结构。
```

已有 tools：

```text
list_reference_papers
list_reference_sections
get_reference_section_content
```

它们仍然从 `.mineru.md` 中读取标题和章节内容。

图片在 Markdown 中表现为：

```md
![...](paper-name.mineru.assets/images/xxx.png)
```

因此 agent 仍然能知道：

- 这一节出现了图片。
- 图片的 alt 文本是什么。
- 图片 caption 在附近是什么。
- 图片文件路径是什么。

如果未来要让 agent 真正读取图片内容，需要新增 image tool，例如：

```text
get_reference_image_asset(reference_file_id, image_path)
```

但这属于视觉理解扩展，不是当前 PDF 解析主链路的一部分。
