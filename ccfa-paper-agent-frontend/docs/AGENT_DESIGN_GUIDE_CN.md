# CCFA/SCI 论文写作 Agent 前端说明文档

这份文档用于帮助后续设计真实 Agent、后端接口和 Agent 工具调用协议。当前前端是一个本地优先的 MVP：没有服务器，所有工程、文件、线程和可编辑信息都保存在浏览器 IndexedDB 中。

## 1. 应用核心概念

本应用不是普通聊天界面，而是基于两个核心对象组织：

- `Project`：一个论文工程，包含论文元信息、文件夹、上传文件、图片、段落状态和聊天线程。
- `Thread`：一个工程内的聊天线程，每个线程有独立消息历史。

用户必须先创建或进入一个论文工程，才能与 Agent 聊天。Agent 未来应该始终基于当前 `Project + activeThread` 工作。

## 2. 重要文件入口

| 目的 | 文件 |
| --- | --- |
| 应用入口 | `src/App.tsx` |
| 全局状态和可编辑数据写入 | `src/store/projectStore.ts` |
| Project 类型 | `src/types/project.ts` |
| 文件、参考论文、段落类型 | `src/types/file.ts` |
| 聊天类型 | `src/types/chat.ts` |
| Agent 上下文类型 | `src/types/agent.ts` |
| Agent adapter | `src/agent/agentAdapter.ts` |
| mock Agent 回复 | `src/agent/mockAgent.ts` |
| IndexedDB 封装 | `src/storage/indexedDb.ts` |
| Markdown 段落解析 | `src/utils/markdownParser.ts` |
| 上传文件读取 | `src/utils/fileReader.ts` |

## 3. 本地存储位置

当前所有数据保存在浏览器 IndexedDB：

- 数据库名：`ccfa-paper-agent-db`
- object store：`app-state`
- key：`workspace`
- 存储内容：

```ts
{
  projects: PaperProject[];
  activeProjectId?: string;
}
```

实现位置：`src/storage/indexedDb.ts`

状态变更后由 `src/store/projectStore.ts` 中的 `setAndPersist` 自动保存。

## 4. Project 数据结构

核心类型在 `src/types/project.ts`：

```ts
type PaperProject = {
  id: string;
  paperTitle: string;
  targetVenue: string;
  writingStatus: "writing" | "finalized";
  writingProgress: string;
  createdAt: string;
  updatedAt: string;
  folders: ProjectFolders;
  threads: ChatThread[];
  activeThreadId?: string;
};
```

其中最重要的可编辑论文元信息是：

| 字段 | 含义 | 编辑入口 | store action |
| --- | --- | --- | --- |
| `paperTitle` | 论文名称 | 创建工程弹窗、顶部“编辑工程信息” | `createProject` / `updateProjectMeta` |
| `targetVenue` | 投稿会议或期刊 | 创建工程弹窗、顶部“编辑工程信息” | `createProject` / `updateProjectMeta` |
| `writingStatus` | 写作状态：在写/定稿 | 创建工程弹窗、顶部“编辑工程信息” | `createProject` / `updateProjectMeta` |
| `writingProgress` | 自由文本写作进度 | 创建工程弹窗、顶部“编辑工程信息” | `createProject` / `updateProjectMeta` |

相关组件：

- `src/components/project/ProjectCreateModal.tsx`
- `src/components/layout/WorkspaceHeader.tsx`
- `src/components/project/ProjectMetaPanel.tsx`

## 5. 文件夹结构

每个工程有四个文件夹，定义在 `src/types/file.ts`：

```ts
type FolderType =
  | "draftManuscripts"
  | "coreReferences"
  | "optionalReferences"
  | "draftImages";
```

| folderType | 中文含义 | 支持文件 | 主要用途 |
| --- | --- | --- | --- |
| `draftManuscripts` | 初稿文稿 | `.md` | 论文初稿、章节、段落状态管理 |
| `coreReferences` | 核心参考论文 | `.md` / `.pdf` | 必须重点参考的论文 |
| `optionalReferences` | 可参考论文 | `.md` / `.pdf` | 可选择参考的论文 |
| `draftImages` | 初稿图片 | `.png` / `.jpg` / `.jpeg` / `.webp` | 论文图、实验图、示意图 |

相关组件：

- `src/components/files/FileFolderPanel.tsx`
- `src/components/files/FileUploadBox.tsx`
- `src/components/files/FileList.tsx`
- `src/components/files/ImageAssetPanel.tsx`

## 6. ProjectFile 数据结构

上传后的文件统一保存为 `ProjectFile`：

```ts
type ProjectFile = {
  id: string;
  name: string;
  folderType: FolderType;
  mimeType: string;
  size: number;
  uploadedAt: string;
  updatedAt: string;
  contentText?: string;
  dataUrl?: string;
  parseStatus?: "none" | "waiting_parse" | "parsed" | "failed";
  referenceMeta?: ReferencePaperMeta;
  imageCaption?: string;
  draftParagraphs?: DraftParagraph[];
};
```

不同文件类型的保存方式：

| 文件类型 | 保存内容 | 字段 |
| --- | --- | --- |
| Markdown | 读取全文文本 | `contentText` |
| PDF | 暂不解析正文，只保存文件信息 | `parseStatus: "waiting_parse"` |
| 图片 | 保存 base64 data URL | `dataUrl` |
| 初稿 Markdown | 除 `contentText` 外，还解析段落 | `draftParagraphs` |

文件上传读取逻辑：`src/utils/fileReader.ts`

文件删除逻辑：`projectStore.deleteFile(projectId, folderType, fileId)`

## 7. 可编辑信息总表

这是后续设计 Agent 最需要关注的部分。

| 信息类别 | 数据路径 | 当前编辑入口 | store action | 是否进入 AgentContext |
| --- | --- | --- | --- | --- |
| 论文标题 | `project.paperTitle` | 创建/编辑工程弹窗 | `updateProjectMeta` | 是，`projectMeta.paperTitle` |
| 投稿目标 | `project.targetVenue` | 创建/编辑工程弹窗 | `updateProjectMeta` | 是，`projectMeta.targetVenue` |
| 写作状态 | `project.writingStatus` | 创建/编辑工程弹窗 | `updateProjectMeta` | 是，`projectMeta.writingStatus` |
| 写作进度 | `project.writingProgress` | 创建/编辑工程弹窗 | `updateProjectMeta` | 是，`projectMeta.writingProgress` |
| 上传文件列表 | `project.folders[folderType]` | 左侧文件夹上传/删除 | `uploadFileToFolder` / `deleteFile` | 是，`files` 和 `folderSummary` |
| Markdown 全文 | `file.contentText` | 上传 `.md` 后自动保存 | `uploadFileToFolder` | 当前不直接进入全文，只进入文件摘要；初稿段落会进入 |
| PDF 解析状态 | `file.parseStatus` | 上传 `.pdf` 后自动设置 | `uploadFileToFolder` | 是，`files[].parseStatus` |
| 参考论文年份 | `file.referenceMeta.paperYear` | “编辑信息”弹窗 | `updateReferenceMeta` | 是，`referencePaperMetas` |
| 参考论文质量/会议/期刊 | `file.referenceMeta.paperVenueOrQuality` | “编辑信息”弹窗 | `updateReferenceMeta` | 是 |
| 参考简介 | `file.referenceMeta.referenceSummary` | “编辑信息”弹窗 | `updateReferenceMeta` | 是 |
| 具体参考段落 | `file.referenceMeta.referenceSections` | “编辑信息”弹窗 | `updateReferenceMeta` | 是 |
| 图片 caption | `file.imageCaption` | 图片卡片输入框 | `updateImageCaption` | 是，`imageAssets.caption` |
| 图片 Markdown 引用 | 由 `file.id` 和 caption 生成 | 图片卡片“复制 Markdown 引用” | 无需保存，动态生成 | 是，`imageAssets.markdownReference` |
| 初稿段落内容 | `file.draftParagraphs[].content` | 上传初稿 md 后自动解析 | `uploadFileToFolder` | 是，`draftParagraphStatuses` |
| 初稿段落所属标题 | `file.draftParagraphs[].headingPath` | 自动从 Markdown 标题解析 | `parseMarkdownParagraphs` | 是 |
| 用户修正段落标题 | `file.draftParagraphs[].userAssignedHeading` | 段落管理输入框 | `updateDraftParagraphStatus` | 是 |
| 段落写作状态 | `file.draftParagraphs[].writingStatus` | 段落管理下拉框 | `updateDraftParagraphStatus` | 是 |
| 聊天线程 | `project.threads` | 左侧线程区 | `createThread` / `deleteThread` / `switchThread` | 当前活跃线程消息进入 |
| 聊天消息 | `thread.messages` | 聊天区输入与 Agent 回复 | `appendMessage` | 是，`currentThreadMessages` |
| 当前活跃线程 | `project.activeThreadId` | 点击线程 | `switchThread` | 影响 `currentThreadMessages` |

## 8. 参考论文人工信息

参考论文的人工信息类型在 `src/types/file.ts`：

```ts
type ReferencePaperMeta = {
  paperYear: string;
  paperVenueOrQuality: string;
  referenceSummary: string;
  referenceSections: string;
};
```

它只用于：

- `coreReferences`
- `optionalReferences`

编辑入口：

- `src/components/files/ReferencePaperMetaForm.tsx`
- 文件列表里的“编辑信息”按钮

保存入口：

- `projectStore.updateReferenceMeta(projectId, folderType, fileId, meta)`

Agent 上下文位置：

```ts
agentContext.referencePaperMetas[]
```

## 9. 初稿段落管理

初稿 Markdown 上传到 `draftManuscripts` 后，会用 `src/utils/markdownParser.ts` 解析成段落。

段落类型：

```ts
type DraftParagraph = {
  id: string;
  content: string;
  contentHash: string;
  headingPath: string[];
  userAssignedHeading?: string;
  writingStatus: "todo" | "draft" | "final";
  updatedAt: string;
};
```

解析规则概念：

- `#` / `##` / `###` 等标题会形成 `headingPath`
- 每个自然段保存为一个 `DraftParagraph`
- 使用 `contentHash` 做弱匹配，便于未来 Markdown 内容更新后尽量保留旧段落状态

当前可编辑字段：

| 字段 | 含义 | UI |
| --- | --- | --- |
| `userAssignedHeading` | 用户手动修正段落所属标题 | 段落管理输入框 |
| `writingStatus` | 未完成/初稿/定稿 | 段落管理状态选择器 |

相关组件：

- `src/components/files/MarkdownPreviewModal.tsx`
- `src/components/files/DraftParagraphManager.tsx`

保存入口：

```ts
projectStore.updateDraftParagraphStatus(projectId, fileId, paragraphId, patch)
```

Agent 上下文位置：

```ts
agentContext.draftParagraphStatuses[]
```

## 10. 图片资产和引用

图片上传到 `draftImages` 后：

- 图片内容保存到 `file.dataUrl`
- caption 保存到 `file.imageCaption`
- Markdown 引用动态生成：

```md
![Figure caption](local-image://image-id)
```

如果有 caption，则为：

```md
![用户填写的 caption](local-image://image-id)
```

相关组件：

- `src/components/files/ImageAssetPanel.tsx`

保存入口：

```ts
projectStore.updateImageCaption(projectId, fileId, caption)
```

Agent 上下文位置：

```ts
agentContext.imageAssets[]
```

## 11. 聊天线程和消息

类型在 `src/types/chat.ts`：

```ts
type ChatThread = {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
};
```

重要行为：

- 每个 Project 可以有多个 Thread。
- 只有当前 `activeThreadId` 对应的线程消息会进入 `AgentContext.currentThreadMessages`。
- 新线程默认空消息，第一条 user message 会自动截取为线程标题。
- 删除当前线程后会切换到剩余第一个线程；如果没有线程，`ChatPanel` 会自动创建默认线程。

相关组件：

- `src/components/chat/ThreadList.tsx`
- `src/components/chat/ChatPanel.tsx`
- `src/components/chat/ChatComposer.tsx`
- `src/components/chat/ChatMessage.tsx`

相关 store action：

```ts
createThread(projectId, title?)
deleteThread(projectId, threadId)
switchThread(projectId, threadId)
appendMessage(projectId, threadId, message)
```

## 12. AgentContext

Agent 上下文类型在 `src/types/agent.ts`，构建函数在 `src/agent/agentAdapter.ts`：

```ts
buildAgentContext(project: PaperProject): AgentContext
```

当前 `AgentContext` 包含：

| 字段 | 内容 |
| --- | --- |
| `projectMeta` | 论文标题、投稿目标、写作状态、写作进度 |
| `folderSummary` | 四个文件夹分别有多少文件 |
| `files` | 所有文件的摘要信息 |
| `referencePaperMetas` | 核心/可参考论文的人工信息 |
| `draftParagraphStatuses` | 初稿段落内容、标题路径、状态 |
| `imageAssets` | 图片 id、名称、caption、Markdown 引用 |
| `currentThreadMessages` | 当前线程消息 |

注意：当前 `files` 里只放文件摘要，不直接放全部 Markdown 原文：

```ts
{
  hasMarkdownContent: boolean;
  hasImageData: boolean;
}
```

如果未来真实 Agent 需要读取完整 Markdown 文本，可以扩展 `AgentContext`，例如增加：

```ts
markdownFiles: Array<{
  fileId: string;
  fileName: string;
  folderType: FolderType;
  contentText: string;
}>
```

或者由后端/Agent 工具按 `fileId` 拉取全文，避免一次上下文过大。

## 13. Agent 调用入口

当前聊天发送流程在 `src/components/chat/ChatPanel.tsx`：

1. 用户输入内容。
2. 前端调用 `appendMessage` 追加 user message。
3. 调用 `sendMessageToAgent(project, thread, userMessage)`。
4. 当前实现走 `mockAgentReply`。
5. 返回后追加 assistant message。

真实 Agent 接入时，主要替换：

```ts
src/agent/agentAdapter.ts
```

当前函数：

```ts
export async function sendMessageToAgent(
  project: PaperProject,
  thread: ChatThread,
  userMessage: string
): Promise<string>
```

未来可以改成：

- 请求自己的后端 Agent 服务
- 请求 OpenAI SDK
- 把 `buildAgentContext(project)` 作为上下文传入
- 把用户消息、当前线程 id、工程 id 一并传入

## 14. Agent 修改前端状态

当前已预留 `AgentPatch`，类型在 `src/types/agent.ts`：

```ts
type AgentPatch =
  | {
      type: "updateProjectMeta";
      payload: Partial<{
        paperTitle: string;
        targetVenue: string;
        writingStatus: WritingStatus;
        writingProgress: string;
      }>;
    }
  | {
      type: "appendSystemMessage";
      threadId: string;
      content: string;
    };
```

应用入口：

```ts
projectStore.applyAgentPatch(projectId, patch)
```

当前只支持：

- 更新 Project 元信息
- 追加 system message

未来建议扩展的 patch 类型：

```ts
type AgentPatch =
  | { type: "updateProjectMeta"; payload: Partial<ProjectMetaInput> }
  | { type: "updateReferenceMeta"; folderType: FolderType; fileId: string; meta: ReferencePaperMeta }
  | { type: "updateImageCaption"; fileId: string; caption: string }
  | { type: "updateDraftParagraphStatus"; fileId: string; paragraphId: string; writingStatus?: ParagraphWritingStatus; userAssignedHeading?: string }
  | { type: "appendAssistantMessage"; threadId: string; content: string }
  | { type: "appendSystemMessage"; threadId: string; content: string };
```

这样真实 Agent 就可以安全、结构化地修改前端状态，而不是直接改 IndexedDB。

## 15. Agent Context Drawer

前端提供了一个调试工具：

- 组件：`src/components/chat/AgentContextDrawer.tsx`
- 按钮：聊天区右上角“查看 Agent 上下文”
- 功能：展示当前 `buildAgentContext(project)` 生成的 JSON，并支持复制

后续调试真实 Agent 时，应优先看这里确认：

- Agent 是否能看到当前工程元信息
- 当前线程消息是否正确
- 参考论文人工信息是否进入上下文
- 段落状态是否进入上下文
- 图片 caption 和引用是否进入上下文

## 16. 未来接后端/真实 Agent 的建议

### 16.1 不建议 Agent 直接读 IndexedDB

IndexedDB 是浏览器本地实现细节。真实 Agent 最好通过前端整理好的 `AgentContext` 或后端 API 获取数据。

推荐模式：

1. 前端调用 `buildAgentContext(project)`。
2. 前端把 `AgentContext + userMessage + projectId + threadId` 发给后端。
3. 后端 Agent 返回：
   - assistant message
   - 可选 patches
4. 前端用 `appendMessage` 和 `applyAgentPatch` 更新本地状态。

### 16.2 大文档建议用工具读取

论文全文、参考论文全文、PDF 解析文本可能很大。建议不要全部塞进每次聊天上下文。

更好的方式：

- `AgentContext.files` 只提供文件列表和摘要
- Agent 需要时调用工具：`readMarkdownFile(fileId)`
- 读取初稿段落时调用：`listDraftParagraphs(fileId)`
- 读取参考论文信息时调用：`listReferenceMetas(projectId)`

### 16.3 PDF 解析预留

当前 PDF 上传后只保存：

```ts
parseStatus: "waiting_parse"
```

未来 PDF 解析完成后，可以扩展 `ProjectFile`：

```ts
parsedMarkdownContent?: string;
parsedAt?: string;
parseError?: string;
```

然后在 `buildAgentContext` 或文件读取工具中暴露解析后的 Markdown。

## 17. 当前 UI 到数据的映射

| UI 位置 | 组件 | 主要读写数据 |
| --- | --- | --- |
| 工程列表页 | `ProjectList` | `projects` |
| 创建工程弹窗 | `ProjectCreateModal` | `paperTitle`, `targetVenue`, `writingStatus`, `writingProgress` |
| 顶部 Header | `WorkspaceHeader`, `ProjectMetaPanel` | 当前工程元信息 |
| 左侧文件夹 | `FileFolderPanel` | `project.folders` |
| 上传按钮 | `FileUploadBox` | 新增 `ProjectFile` |
| 文件列表 | `FileList` | 打开预览、编辑参考信息、删除文件 |
| Markdown 预览 | `MarkdownPreviewModal` | `file.contentText`, `file.draftParagraphs` |
| 段落管理 | `DraftParagraphManager` | `DraftParagraph.userAssignedHeading`, `DraftParagraph.writingStatus` |
| 参考论文信息弹窗 | `ReferencePaperMetaForm` | `file.referenceMeta` |
| 图片卡片 | `ImageAssetPanel` | `file.imageCaption`, Markdown 图片引用 |
| 线程列表 | `ThreadList` | `project.threads`, `activeThreadId` |
| 聊天主面板 | `ChatPanel` | 当前线程消息、Agent 调用 |
| Agent 上下文抽屉 | `AgentContextDrawer` | `buildAgentContext(project)` |

## 18. 快速定位：我要改某类信息该看哪里

| 需求 | 优先看 |
| --- | --- |
| 新增一种工程元信息 | `src/types/project.ts`, `ProjectCreateModal`, `WorkspaceHeader`, `projectStore.updateProjectMeta`, `buildAgentContext` |
| 新增一种文件夹 | `src/types/file.ts`, `emptyFolders`, `folderOrder`, `fileReader`, `buildAgentContext` |
| 让 Agent 能读 Markdown 全文 | `src/types/agent.ts`, `buildAgentContext`, 或新增按 `fileId` 读取工具 |
| 让 Agent 能改参考论文信息 | 扩展 `AgentPatch`, `projectStore.applyAgentPatch`, 复用 `updateReferenceMeta` |
| 让 Agent 能改段落状态 | 扩展 `AgentPatch`, 复用 `updateDraftParagraphStatus` |
| 让 Agent 能生成/修改图片 caption | 扩展 `AgentPatch`, 复用 `updateImageCaption` |
| 接入真实 Agent 服务 | 替换 `src/agent/agentAdapter.ts` 的 `sendMessageToAgent` |
| 修改本地持久化方案 | `src/storage/indexedDb.ts`, `projectStore.setAndPersist` |

