# 本地文件型 Agent 工作流

当前前端已从“上传文件副本”升级为更适合 Agent 的本地文件工作区模型。

## 核心原则

Agent 不应该直接静默覆盖论文文件。推荐流程是：

1. 前端保存工程状态、段落状态、参考信息和文件句柄。
2. Agent 读取 `AgentContext` 和需要的文件内容。
3. Agent 返回结构化 `AgentPatch`。
4. 前端把文件修改保存为 `file.pendingChange`。
5. 用户在前端查看 diff。
6. 用户确认后，前端才写回本地文件。
7. 写回后重新同步文件内容、hash 和初稿段落状态。

## 打开已有工程

工程列表页提供“打开已有工程”入口。用户选择已有工程根目录后，前端会读取：

```text
.agent/project-state.json
```

然后恢复：

- 工程元信息
- 文件夹和文件元数据
- 聊天线程和前端聊天消息
- 文件 pending change 状态
- 本浏览器中的目录和文件 handle

恢复时会按文件的 `localPath` 重新读取工程目录中的文件内容，因此 Markdown 正文、图片 data URL
和段落解析信息会在当前浏览器中重新同步。工程 ID 和线程 ID 会保持不变，这样后端
`projectId + threadId` 对应的 Agents SDK session 可以继续衔接。

## 本地文件放在哪里

每个文件仍在：

```ts
project.folders[folderType][]
```

文件关键字段：

```ts
{
  sourceType: "localHandle" | "browserCopy",
  localHandle?: FileSystemFileHandle,
  localPath?: string,
  contentText?: string,
  contentHash?: string,
  lastSyncedAt?: string,
  pendingChange?: FileChangeProposal
}
```

- `localHandle`：浏览器 File System Access API 的真实本地文件句柄。
- `browserCopy`：兼容旧上传模式，只是浏览器 IndexedDB 里的副本，不能写回磁盘原文件。
- `contentText`：前端缓存的 Markdown 内容。
- `pendingChange`：Agent 或人工编辑生成的待确认修改。

## Agent 修改文件

Agent 应返回：

```ts
{
  type: "proposeFileChange",
  folderType: "draftManuscripts",
  fileId: "...",
  summary: "修改说明",
  newContent: "完整的新 Markdown 内容"
}
```

store 会把它保存到：

```ts
file.pendingChange
```

用户点击“查看修改”后确认，才会调用：

```ts
applyPendingFileChange(projectId, folderType, fileId)
```

如果文件是 `localHandle`，会写回磁盘；如果是 `browserCopy`，只更新浏览器副本。

## 相关代码

- 类型：`src/types/file.ts`
- 本地文件 API：`src/utils/fileReader.ts`
- store：`src/store/projectStore.ts`
- Agent patch：`src/types/agent.ts`
- Agent adapter：`src/agent/agentAdapter.ts`
- 文件编辑弹窗：`src/components/files/FileEditModal.tsx`
- 修改确认弹窗：`src/components/files/FileChangeReviewModal.tsx`
