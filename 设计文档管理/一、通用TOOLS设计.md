下面这版可以直接作为你的第一个 agent 笔记：**基础 Tools 设计**。

## 1、设计目标

基础 tools 的目标不是完成某个具体论文任务，而是为所有后续 agent 提供统一的工程读写能力。

它解决三件事：

1. agent 能查看初稿、段落、参考论文、工程状态。
2. agent 能提出修改，但不能静默覆盖文件。
3. 所有修改都必须回到前端，以 diff 形式确认后再写入本地工程文件。

因此，基础 tools 是整个论文 agent 系统的底座。

## 2. 核心原则

**第一，前端仍然是用户交互和确认修改的中心。**

agent 不直接把论文写坏。即使后端 tools 能读本地文件，也只生成修改 proposal，真正写入由前端确认。

**第二，后端 tools 优先基于本地工程文件夹读取内容。**

每个工程绑定一个本地目录，例如：

```text
project-root/
  draft-manuscripts/
  core-references/
  optional-references/
  draft-images/
  .agent/
    project-state.json
```

前端会把 `backendWorkspacePath` 和每个文件的 `localPath` 发给后端。后端 tools 读取时优先读：

```text
backendWorkspacePath/localPath
```

如果没有配置本地路径，则回退读取前端传来的 `contentText`。

**第三，写操作走 patch，不直接落盘。**

比如 agent 修改初稿时，后端返回：

```json
{
  "type": "proposeFileChange",
  "folderType": "draftManuscripts",
  "fileId": "...",
  "summary": "...",
  "newContent": "..."
}
```

前端收到后生成待确认变更，展示 diff，用户确认后才写入本地文件。

## 3. 工程上下文设计

agent context 分为两层。

轻量上下文用于普通对话：

- `projectMeta`：论文标题、目标 venue、写作状态、进度、后端工程路径
- `folderSummary`：各文件夹数量
- `files`：文件索引、id、名称、相对路径、解析状态、是否有待确认修改
- `referencePaperMetas`：参考论文人工元数据
- `imageAssets`：图片信息

工具上下文用于按需读取：

- `draftManuscripts`：初稿文件 id、名称、localPath、段落信息
- `referencePapers`：参考论文 id、名称、localPath、元数据

这样普通 prompt 不需要塞全文，agent 需要具体章节或段落时再调用 tools。

## 4. 基础 Tools 分类

目前基础 tools 分成四类。

### 4.1  **初稿读取 tools**

`list_draft_sections`

查看所有初稿的章节列表。它解析 Markdown 标题，返回章节层级、标题路径和行号。

`get_draft_section_content`

读取某篇初稿中某个章节的完整内容。

适合任务：

- 修改 Introduction
- 检查 Method 结构
- 总结 Results
- 判断某章是否完整

### 4.2 **段落读取 tools**

`list_draft_paragraphs`

列出某篇初稿的段落 id、所属标题、状态和内容预览。

`get_draft_paragraph_content`

读取某个具体段落的完整内容。

`get_draft_paragraph_status`

查看某个段落的写作状态。

段落状态包括：

```text
todo
draft
final
```

### 4.3 **参考论文读取 tools**

`list_reference_papers`

列出核心参考论文和普通参考论文，包括人工填写的元数据。

`list_reference_sections`

查看某篇参考论文的章节结构。

`get_reference_section_content`

读取某篇参考论文的某个章节内容。

适合任务：

- 写 related work
- 对比方法
- 提取实验设置
- 查看参考论文 contribution

### 4.5 **编辑 tools**

`edit_draft`

替换整篇初稿。

`edit_draft_section`

替换某个完整章节。后端会基于当前本地文件内容生成新的整篇 Markdown，再返回 patch。

`edit_draft_paragraph_content`

替换某个段落内容。

`edit_draft_paragraph_status`

修改段落写作状态或人工归属标题。

`edit_project_status`

修改工程写作状态和进度说明。

## **5. 本地文件读写策略**

后端 tools 读取文件时遵守这个顺序：

1. 如果设置了 `backendWorkspacePath`，并且文件有 `localPath`，则从本地磁盘读取最新文件。
2. 如果没有后端路径，则读取前端 context 中的 `contentText`。
3. 如果两者都没有，则返回缺少可读内容。

后端读本地文件时有路径安全限制：

- 只能读工程根目录内部文件。
- `localPath` 不能逃逸到工程目录外。
- 不直接覆盖本地文件。

## **6. 修改确认流程**

agent 修改论文时流程如下：

```text
用户提出修改请求
    ↓
agent 调用读取 tool 定位章节/段落
    ↓
agent 调用编辑 tool
    ↓
后端生成 proposeFileChange patch
    ↓
前端接收 patch
    ↓
文件卡片出现“查看修改/确认应用”
    ↓
用户查看 diff
    ↓
用户确认后写入本地文件
    ↓
前端重新解析段落和状态
```

这个流程保证 agent 可以编辑论文，但不会静默破坏论文。

## **7. 防止 agent 假装修改**

一个重要问题是：模型可能会口头说“我已经修改了”，但实际上没有返回 patch。

因此系统做了保护：

- 真正修改的唯一标准是返回 `proposeFileChange`。
- 如果没有 patch，前端不会显示“查看修改/确认应用”。
- 如果 agent 声称已修改但没有 patch，系统会拦截并提示没有实际生成修改。

## **8. 工具调用策略**

能力问答不强制调用工具。

例如：

```text
你有哪些工具？
你可以修改初稿吗？
```

这些问题只需要中文说明能力。

真正编辑命令才触发工s具调用，例如：

```text
请修改初稿的 Introduction 章节
帮我润色第 3 段
请重写 Method 的最后一段
```

对普通 DeepSeek chat 模型，可以使用 `tool_choice="required"` 强制工具调用。  
但 thinking / reasoner 模式不支持这个参数，所以当前使用普通模型：

```text
DEEPSEEK_MODEL=deepseek-chat
```
