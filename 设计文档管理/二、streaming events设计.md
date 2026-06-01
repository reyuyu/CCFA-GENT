下面这版可以作为第二个 agent 笔记：**streaming events 设计**。

这篇不只记录技术设计，也记录代码具体放在工程哪里。后面排查问题时，可以按文档里的文件路径直接去找实现。

## 1、设计目标

streaming events 的目标不是让 agent 更聪明，而是让用户看见 agent 正在做什么。

在没有 streaming events 之前，前端只能看到一个等待态：

```text
Paper Agent is reading the project context...
```

用户不知道 agent 是卡住了，还是正在读参考论文，还是正在调用编辑工具。

加入 streaming events 后，前端可以实时显示：

```text
正在读取论文工程信息...
正在分析任务并规划可用工具...
正在查看参考论文清单...（工具：list_reference_papers）
正在阅读参考论文内容...（工具：get_reference_section_content）
正在写入章节修改建议...（工具：edit_draft_section）
正在生成最终回答...
```

它解决三件事：

1. 用户能看到 agent 的运行进度，而不是盲等。
2. 前端能追踪 agent 是否真的调用了工具。
3. 后端可以把底层 SDK events 翻译成用户能理解的状态提示。

因此，streaming events 是 agent 交互体验的一层，而不是替代最终回答的一层。

## 2. 一句话看懂工程位置

当前 streaming events 涉及 5 个核心文件。

后端入口：

```text
ccfa-paper-agent-backend/app/main.py
```

作用：

- 暴露 `POST /api/agent/chat/stream`。
- 把 `run_paper_agent_stream` 产生的事件包装成 SSE。
- 设置 `Content-Type: text/event-stream`。

后端 agent 运行与事件翻译：

```text
ccfa-paper-agent-backend/app/services/agent_runner.py
```

作用：

- 执行 `Runner.run_streamed(...)`。
- 监听 `result.stream_events()`。
- 把 SDK events 转成用户可见的 progress events。
- 最后生成和非流式接口一致的 `AgentResponse`。

前端类型定义：

```text
ccfa-paper-agent-frontend/src/types/agent.ts
```

作用：

- 定义 `AgentProgressEvent`。
- 定义 `AgentStreamEvent`。
- 让前端知道 stream 里会出现 `progress` 和 `final` 两类消息。

前端流式请求与 SSE 解析：

```text
ccfa-paper-agent-frontend/src/agent/agentAdapter.ts
```

作用：

- 调用 `POST /api/agent/chat/stream`。
- 用 `response.body.getReader()` 读取流。
- 解析 SSE 的 `data: {...}`。
- 收到 `progress` 时触发 `onProgress`。
- 收到 `final` 时返回最终 `AgentResponse`。

前端聊天 UI：

```text
ccfa-paper-agent-frontend/src/components/chat/ChatPanel.tsx
```

作用：

- 保存 `progressEvents` 状态。
- 在 agent 运行时展示 `AgentProgressCard`。
- 最终回答到达后，追加 assistant message，并清空 progress。

## 3. 核心原则

**第一，前端展示的是用户可见进度，不是模型推理链。**

可以展示：

```text
正在判断当前材料是否足够支撑回答...
正在整理工具结果...
正在生成最终回答...
```

不展示：

```text
模型逐步推理过程
完整 chain-of-thought
底层 raw response delta
span_id / trace_id / parent_id
```

代码位置：

```text
ccfa-paper-agent-backend/app/services/agent_runner.py
```

相关函数：

```text
_progress_from_stream_event
```

这个函数只把 SDK event 转成阶段性提示，不读取、不展示模型真实推理链。

**第二，后端负责把 SDK 事件翻译成自然语言。**

OpenAI Agents SDK 的事件更偏底层，例如：

```text
agent_updated_stream_event
run_item_stream_event / tool_called
run_item_stream_event / tool_output
run_item_stream_event / message_output_created
```

这些事件不应该原样丢给前端展示。

后端需要转换成：

```text
正在调用工具 xxx...
工具 xxx 执行完成，正在整理结果...
正在生成最终回答...
```

代码位置：

```text
ccfa-paper-agent-backend/app/services/agent_runner.py
```

相关函数和常量：

```text
TOOL_PROGRESS_MESSAGES
WRITING_TOOL_NAMES
_tool_name_from_item
_progress_from_stream_event
```

**第三，streaming events 只负责状态流，最终业务结果仍然走 AgentResponse。**

一次 stream 里有两类主要消息：

```text
progress：运行中的状态事件
final：最终 agent 回复，包括 content 和 patches
```

前端实时显示 `progress`，最后拿 `final.response` 继续走原来的消息追加和 patch 应用逻辑。

代码位置：

```text
ccfa-paper-agent-backend/app/services/agent_runner.py
```

相关函数：

```text
_response_from_final_output
```

它负责把 `result.final_output` 转成 `AgentResponse`，并复用原来的 patch 校验逻辑。

## 4. 事件格式设计

后端统一生成用户可见的 progress event：

```json
{
  "type": "thinking",
  "message": "正在分析任务并规划可用工具...",
  "createdAt": "2026-05-30T10:20:00.000000+00:00",
  "data": {}
}
```

后端创建这个对象的位置：

```text
ccfa-paper-agent-backend/app/services/agent_runner.py
```

相关函数：

```text
_progress_event
_now_iso
```

前端对应的 TypeScript 类型位置：

```text
ccfa-paper-agent-frontend/src/types/agent.ts
```

相关类型：

```text
AgentProgressEvent
AgentStreamEvent
```

目前 progress event 的类型包括：

```text
thinking
tool_start
tool_end
retrieving
writing
done
error
```

含义如下。

`thinking`

agent 正在分析任务、判断材料是否足够、调整处理方式。

`tool_start`

agent 开始调用某个读取类或检索类工具。

`tool_end`

某个工具调用完成，agent 正在整理工具结果。

`writing`

agent 正在生成回答，或者正在调用编辑类工具生成修改 proposal。

`done`

最终回答已经生成。

`error`

运行过程中发生错误，例如 API key 缺失、网络错误、模型服务报错。

## 5. 后端接口设计

原来的接口仍然保留：

```text
POST /api/agent/chat
```

代码位置：

```text
ccfa-paper-agent-backend/app/main.py
```

相关函数：

```text
chat
```

它一次性返回完整结果，适合兼容旧逻辑或非实时场景。

新增流式接口：

```text
POST /api/agent/chat/stream
```

代码位置：

```text
ccfa-paper-agent-backend/app/main.py
```

相关函数：

```text
chat_stream
event_generator
```

核心代码逻辑是：

```python
@app.post("/api/agent/chat/stream")
async def chat_stream(request: AgentRequest) -> StreamingResponse:
    async def event_generator():
        async for event in run_paper_agent_stream(request, settings):
            yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
```

这里有几个重点：

1. `run_paper_agent_stream` 只负责产出 Python dict。
2. `main.py` 负责把 dict 包装成 SSE 文本格式。
3. 每一帧必须是 `data: {...}\n\n`。
4. `ensure_ascii=False` 保证中文状态不被转义成 `\uXXXX`。

这个接口使用 SSE 返回：

```text
Content-Type: text/event-stream
```

因为前端需要把完整 project context 放在 body 里，所以这里使用 `fetch + POST + ReadableStream`，而不是浏览器原生 `EventSource`。

## 6. SSE 消息格式

SSE 每一帧都是：

```text
data: {...}

```

例如 progress 帧：

```json
{
  "type": "progress",
  "event": {
    "type": "tool_start",
    "message": "正在查看参考论文清单...（工具：list_reference_papers）",
    "createdAt": "2026-05-30T10:20:00.000000+00:00",
    "data": {
      "toolName": "list_reference_papers"
    }
  }
}
```

例如 final 帧：

```json
{
  "type": "final",
  "response": {
    "content": "这是 agent 的最终回答",
    "patches": []
  }
}
```

前端解析这两类消息的位置：

```text
ccfa-paper-agent-frontend/src/agent/agentAdapter.ts
```

相关函数：

```text
parseSseMessage
readAgentEventStream
```

`parseSseMessage` 负责从 SSE 文本里取出 `data:` 后面的 JSON。

`readAgentEventStream` 负责持续读取 chunk，并根据 `type` 分发：

```text
type=progress → handlers.onProgress(event)
type=final    → finalResponse = response
type=error    → throw Error
```

## 7. 后端运行流程

流式运行入口是：

```text
ccfa-paper-agent-backend/app/services/agent_runner.py
```

相关函数：

```text
run_paper_agent_stream
```

它的基本流程如下：

```text
收到前端请求
    ↓
发送 progress：正在读取论文工程信息
    ↓
检查 DeepSeek API key
    ↓
构造 agent、session、run_context
    ↓
发送 progress：正在分析任务并规划可用工具
    ↓
Runner.run_streamed(...)
    ↓
async for event in result.stream_events()
    ↓
把 SDK event 映射成用户可见 progress event
    ↓
agent 完成运行
    ↓
复用原有 final_output 解析逻辑生成 AgentResponse
    ↓
发送 progress：回答已生成
    ↓
发送 final response
```

对应代码里的关键调用：

```python
result = Runner.run_streamed(
    agent,
    input=build_agent_input(request),
    context=run_context,
    session=session,
    hooks=PaperAgentHooks(),
)

async for stream_event in result.stream_events():
    progress = _progress_from_stream_event(stream_event)
    if progress:
        yield {"type": "progress", "event": progress}
```

这里涉及的依赖也在同一个文件开头引入：

```text
create_paper_agent
build_agent_input
PaperAgentRunContext
get_thread_session
PaperAgentHooks
AgentRequest
AgentResponse
```

其中：

- `create_paper_agent` 创建论文写作 agent。
- `build_agent_input` 把前端请求转成 agent 输入。
- `PaperAgentRunContext` 保存 project context 和 patches。
- `get_thread_session` 读取当前线程的 agent memory session。
- `PaperAgentHooks` 保留原有日志 hooks。

最终输出解析仍然复用非流式逻辑：

```text
_response_from_final_output
```

这保证流式接口和非流式接口对 `content`、`patches`、防止假修改等规则保持一致。

## 8. SDK events 到用户进度的映射

当前主要监听这些事件。

`agent_updated_stream_event`

表示运行中的 agent 发生切换。

代码位置：

```text
ccfa-paper-agent-backend/app/services/agent_runner.py
```

相关函数：

```text
_progress_from_stream_event
```

前端显示：

```text
正在切换到 PaperWritingAgent...
```

`run_item_stream_event / tool_called`

表示 agent 开始调用工具。

代码里会调用：

```text
_tool_name_from_item
TOOL_PROGRESS_MESSAGES
WRITING_TOOL_NAMES
```

例如：

```text
list_draft_sections
→ 正在查看初稿结构...（工具：list_draft_sections）

get_reference_section_content
→ 正在阅读参考论文内容...（工具：get_reference_section_content）

edit_draft_section
→ 正在写入章节修改建议...（工具：edit_draft_section）
```

如果工具属于 `WRITING_TOOL_NAMES`，事件类型会标记成：

```text
writing
```

否则一般标记成：

```text
tool_start
```

`run_item_stream_event / tool_output`

表示工具执行完成。

前端显示：

```text
工具 xxx 执行完成，正在整理结果...
```

`run_item_stream_event / reasoning_item_created`

表示模型产生了 reasoning item。

前端不展示真实推理内容，只展示阶段提示：

```text
正在判断当前材料是否足够支撑回答...
```

`run_item_stream_event / message_output_created`

表示模型开始生成最终消息。

前端显示：

```text
正在生成最终回答...
```

## 9. 工具状态文案设计

工具状态文案维护在：

```text
ccfa-paper-agent-backend/app/services/agent_runner.py
```

相关常量：

```text
TOOL_PROGRESS_MESSAGES
WRITING_TOOL_NAMES
```

读取初稿：

```text
list_draft_sections
→ 正在查看初稿结构...

get_draft_section_content
→ 正在阅读初稿章节...

list_draft_paragraphs
→ 正在查看初稿段落...

get_draft_paragraph_content
→ 正在阅读初稿段落...
```

读取参考论文：

```text
list_reference_papers
→ 正在查看参考论文清单...

list_reference_sections
→ 正在查看参考论文结构...

get_reference_section_content
→ 正在阅读参考论文内容...
```

写入修改 proposal：

```text
edit_draft
→ 正在写入初稿修改建议...

edit_draft_section
→ 正在写入章节修改建议...

edit_draft_paragraph_content
→ 正在写入段落修改建议...

edit_project_status
→ 正在更新项目写作进度...
```

这样用户看到的是任务语义，不只是工具函数名。

但文案里仍然保留工具名：

```text
（工具：edit_draft_section）
```

这样既自然，也方便确认 agent 是否真的在调用预期工具。

如果未来新增 tool，要同步改两个地方：

1. 在 `ccfa-paper-agent-backend/app/tools/project_tools.py` 里新增或注册工具。
2. 在 `ccfa-paper-agent-backend/app/services/agent_runner.py` 的 `TOOL_PROGRESS_MESSAGES` 里补对应文案。

如果它是编辑类工具，还要加入：

```text
WRITING_TOOL_NAMES
```

## 10. 前端类型设计

前端 stream 类型定义在：

```text
ccfa-paper-agent-frontend/src/types/agent.ts
```

核心类型是：

```text
AgentProgressEvent
AgentStreamEvent
```

`AgentProgressEvent` 对应后端发送的用户可见进度：

```ts
export type AgentProgressEvent = {
  type:
    | "thinking"
    | "tool_start"
    | "tool_end"
    | "retrieving"
    | "writing"
    | "done"
    | "error";
  message: string;
  createdAt: string;
  data?: Record<string, unknown>;
};
```

`AgentStreamEvent` 对应 SSE 的外层消息：

```ts
export type AgentStreamEvent =
  | {
      type: "progress";
      event: AgentProgressEvent;
    }
  | {
      type: "final";
      response: AgentResponse;
    }
  | {
      type: "error";
      message: string;
    };
```

注意这里分了两层：

```text
SSE 外层 type = progress / final / error
progress 内层 event.type = thinking / tool_start / writing / done ...
```

这样前端可以先判断这一帧是不是最终回答，再决定是否展示运行状态。

## 11. 前端消费方式

前端新增：

```text
sendMessageToAgentStream
```

代码位置：

```text
ccfa-paper-agent-frontend/src/agent/agentAdapter.ts
```

它使用 `fetch` 调用：

```text
POST /api/agent/chat/stream
Accept: text/event-stream
```

关键函数分工：

`sendMessageToAgentStream`

负责发起请求，body 中仍然携带：

```text
projectId
threadId
userMessage
context
```

`readAgentEventStream`

负责读取 `response.body.getReader()`，不断解码 chunk。

`parseSseMessage`

负责从一段 SSE message 里提取 `data:` 后面的 JSON。

`normalizeAgentResponse`

负责过滤并保留前端支持的 patch 类型，避免不认识的 patch 进入 UI。

前端解析 SSE 的逻辑是：

```text
不断读取 chunk
    ↓
用 TextDecoder 解码
    ↓
按空行拆分 SSE message
    ↓
取出 data: 后面的 JSON
    ↓
如果 type=progress，调用 onProgress
    ↓
如果 type=final，保存 finalResponse
```

前端不把 progress 写入聊天历史。

progress 只显示在当前 loading 面板里。

最终回答到达后：

```text
append assistant message
apply patches
清空 progress events
关闭 loading
```

## 12. 前端展示方式

前端聊天区新增 `AgentProgressCard`。

代码位置：

```text
ccfa-paper-agent-frontend/src/components/chat/ChatPanel.tsx
```

相关函数和状态：

```text
AgentProgressCard
progressEvents
setProgressEvents
handleSend
```

它展示两层信息：

1. 当前最新状态。
2. 最近几条已发生的状态。

例如：

```text
正在写入章节修改建议...（工具：edit_draft_section）

已完成：
正在读取论文工程信息...
正在分析任务并规划可用工具...
正在查看初稿结构...（工具：list_draft_sections）
正在阅读初稿章节...（工具：get_draft_section_content）
```

`handleSend` 里调用的是：

```text
sendMessageToAgentStream
```

并传入：

```ts
onProgress: (event) => {
  setProgressEvents((currentEvents) => [...currentEvents, event].slice(-8));
}
```

这里有两个设计点：

1. 只保留最近 8 条，避免 UI 被长流程撑爆。
2. progress 不写入 `thread.messages`，所以不会污染聊天历史。

这个面板只在 agent 运行中出现。

agent 返回最终回答后，进度面板消失，聊天区只保留最终 assistant message 和必要的 system message。

## 13. 一次请求穿过哪些文件

用户在聊天框里发送：

```text
请根据核心参考论文优化 Introduction
```

完整链路如下。

第一步，前端发送消息：

```text
ccfa-paper-agent-frontend/src/components/chat/ChatPanel.tsx
```

函数：

```text
handleSend
```

它追加 user message，设置 loading，并调用：

```text
sendMessageToAgentStream
```

第二步，前端发起 stream 请求：

```text
ccfa-paper-agent-frontend/src/agent/agentAdapter.ts
```

函数：

```text
sendMessageToAgentStream
```

请求地址：

```text
POST /api/agent/chat/stream
```

第三步，后端接收请求并包装 SSE：

```text
ccfa-paper-agent-backend/app/main.py
```

函数：

```text
chat_stream
event_generator
```

第四步，后端运行 agent：

```text
ccfa-paper-agent-backend/app/services/agent_runner.py
```

函数：

```text
run_paper_agent_stream
```

它会先 yield：

```text
正在读取论文工程信息...
正在分析任务并规划可用工具...
```

第五步，Agents SDK 返回 tool events：

```text
ccfa-paper-agent-backend/app/services/agent_runner.py
```

函数：

```text
_progress_from_stream_event
```

它把 SDK event 转成：

```text
正在查看初稿结构...（工具：list_draft_sections）
正在阅读参考论文内容...（工具：get_reference_section_content）
正在写入章节修改建议...（工具：edit_draft_section）
```

第六步，前端解析并展示：

```text
ccfa-paper-agent-frontend/src/agent/agentAdapter.ts
ccfa-paper-agent-frontend/src/components/chat/ChatPanel.tsx
```

相关函数：

```text
readAgentEventStream
onProgress
setProgressEvents
AgentProgressCard
```

第七步，最终回答返回：

后端：

```text
ccfa-paper-agent-backend/app/services/agent_runner.py
_response_from_final_output
```

前端：

```text
ccfa-paper-agent-frontend/src/agent/agentAdapter.ts
readAgentEventStream
```

第八步，前端追加 assistant message 和 patches：

```text
ccfa-paper-agent-frontend/src/components/chat/ChatPanel.tsx
handleSend
```

如果返回了 `proposeFileChange`，前端继续走已有的文件修改确认流程。


##  完整交互流程

用户请求：

```text
请根据核心参考论文优化 Introduction
```

运行过程：

```text
用户发送消息
    ↓
ChatPanel.tsx / handleSend
    ↓
agentAdapter.ts / sendMessageToAgentStream
    ↓
POST /api/agent/chat/stream
    ↓
main.py / chat_stream
    ↓
agent_runner.py / run_paper_agent_stream
    ↓
后端发送：正在读取论文工程信息...
    ↓
后端发送：正在分析任务并规划可用工具...
    ↓
agent 调用 list_draft_sections
    ↓
agent_runner.py / _progress_from_stream_event
    ↓
前端显示：正在查看初稿结构...（工具：list_draft_sections）
    ↓
agent 调用 get_draft_section_content
    ↓
前端显示：正在阅读初稿章节...（工具：get_draft_section_content）
    ↓
agent 调用 list_reference_papers
    ↓
前端显示：正在查看参考论文清单...（工具：list_reference_papers）
    ↓
agent 调用 get_reference_section_content
    ↓
前端显示：正在阅读参考论文内容...（工具：get_reference_section_content）
    ↓
agent 调用 edit_draft_section
    ↓
前端显示：正在写入章节修改建议...（工具：edit_draft_section）
    ↓
agent_runner.py / _response_from_final_output
    ↓
后端发送 final response
    ↓
agentAdapter.ts / readAgentEventStream
    ↓
ChatPanel.tsx / appendMessage
    ↓
前端追加 assistant message
    ↓
前端接收 proposeFileChange patch
    ↓
文件卡片出现“查看修改/确认应用”
```

这个流程把 agent 的黑箱等待变成了可观察的运行过程。

