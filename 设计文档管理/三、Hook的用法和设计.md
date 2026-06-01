下面这版可以作为第三个 agent 笔记：**Hook 的用法和设计**。

这篇主要介绍当前工程里 hook 是什么、放在哪里、怎么接入 agent run，以及它和 streaming events 的区别。

## 1、Hook 是什么

在 OpenAI Agents SDK 里，hook 是一组运行过程回调。

agent 开始运行、agent 结束运行、工具开始调用、工具调用结束时，SDK 会自动调用对应的 hook 方法。

它适合做这些事情：

1. 记录后端日志。
2. 统计一次 agent run 的耗时。
3. 记录 tool 调用发生了什么。
4. 未来扩展成开发者观测系统。

它不直接改变 agent 的回答，也不应该直接负责前端 UI 展示。

## 2. 当前工程里的 Hook 文件位置

当前 hook 实现在：

```text
ccfa-paper-agent-backend/app/observability/hooks.py
```

导出入口在：

```text
ccfa-paper-agent-backend/app/observability/__init__.py
```

接入 agent run 的位置在：

```text
ccfa-paper-agent-backend/app/services/agent_runner.py
```

相关代码：

```python
from app.observability import PaperAgentHooks
```

普通非流式运行：

```python
result = await Runner.run(
    agent,
    input=build_agent_input(request),
    context=run_context,
    session=session,
    hooks=PaperAgentHooks(),
)
```

流式运行：

```python
result = Runner.run_streamed(
    agent,
    input=build_agent_input(request),
    context=run_context,
    session=session,
    hooks=PaperAgentHooks(),
)
```

也就是说，当前普通接口和 streaming events 接口都会触发同一套 hook。

## 3. 当前 Hook 类设计

当前 hook 类叫：

```text
PaperAgentHooks
```

代码位置：

```text
ccfa-paper-agent-backend/app/observability/hooks.py
```

它继承自 Agents SDK 的：

```python
from agents import RunHooks
```

基本结构如下：

```python
class PaperAgentHooks(RunHooks):
    def __init__(self) -> None:
        self.started_at = time.perf_counter()

    async def on_agent_start(self, context: Any, agent: Any) -> None:
        ...

    async def on_agent_end(self, context: Any, agent: Any, output: Any) -> None:
        ...

    async def on_tool_start(self, context: Any, agent: Any, tool: Any) -> None:
        ...

    async def on_tool_end(self, context: Any, agent: Any, tool: Any, result: str) -> None:
        ...
```

`__init__` 里记录开始时间：

```python
self.started_at = time.perf_counter()
```

这样 `on_agent_end` 可以计算整次 agent run 的耗时。

## 4. 当前实现了哪些回调

### 4.1 `on_agent_start`

触发时机：

```text
agent 开始运行时
```

当前记录：

```text
agent_start name=PaperWritingAgent
```

代码位置：

```text
ccfa-paper-agent-backend/app/observability/hooks.py
```

作用：

- 知道一次 agent run 已经开始。
- 记录当前运行的是哪个 agent。

### 4.2 `on_agent_end`

触发时机：

```text
agent 生成最终输出后
```

当前记录：

```text
agent_end name=PaperWritingAgent elapsed_ms=1234 output_type=str
```

它会计算：

```python
elapsed_ms = int((time.perf_counter() - self.started_at) * 1000)
```

作用：

- 记录整次 agent run 的耗时。
- 记录最终输出类型。
- 后续可以用于判断模型响应慢不慢。

### 4.3 `on_tool_start`

触发时机：

```text
agent 开始调用某个 tool 时
```

当前记录：

```text
tool_start agent=PaperWritingAgent tool=list_reference_papers
```

作用：

- 知道 agent 真的开始调用某个工具。
- 适合后端排查“为什么没有调用工具”的问题。

### 4.4 `on_tool_end`

触发时机：

```text
tool 执行结束后
```

当前记录：

```text
tool_end agent=PaperWritingAgent tool=get_reference_section_content result_len=2048
```

作用：

- 知道工具已经执行结束。
- 记录工具返回内容长度。
- 避免日志里直接输出大段论文内容。

## 5. Hook 和 streaming events 的区别

hook 和 streaming events 都和“运行过程”有关，但它们不是一回事。

hook 面向后端开发者：

```text
agent_start
agent_end
tool_start
tool_end
elapsed_ms
result_len
```

streaming events 面向前端用户：

```text
正在读取论文工程信息...
正在查看参考论文清单...（工具：list_reference_papers）
正在阅读参考论文内容...（工具：get_reference_section_content）
正在生成最终回答...
```

当前 streaming events 的主要实现位置是：

```text
ccfa-paper-agent-backend/app/services/agent_runner.py
```

相关函数：

```text
run_paper_agent_stream
_progress_from_stream_event
_progress_event
```

当前 hook 的主要实现位置是：

```text
ccfa-paper-agent-backend/app/observability/hooks.py
```

简单理解：

```text
hook = 后端日志和观测
streaming events = 前端用户进度提示
```

这两层应该分开设计。

不要把完整 hook 日志直接推给用户，也不要把前端进度提示当成后端 trace。

## 6. 一次运行中 Hook 怎么被触发

用户发送消息后，后端运行流程大致是：

```text
ChatPanel.tsx 发送请求
    ↓
agentAdapter.ts 调用后端
    ↓
main.py 接收请求
    ↓
agent_runner.py 创建 agent、session、run_context
    ↓
Runner.run(...) 或 Runner.run_streamed(...)
    ↓
传入 hooks=PaperAgentHooks()
    ↓
SDK 自动触发 on_agent_start
    ↓
如果 agent 调用 tool，触发 on_tool_start
    ↓
tool 执行完，触发 on_tool_end
    ↓
agent 输出最终结果，触发 on_agent_end
```

hook 不需要前端主动调用。

只要 `Runner.run` 或 `Runner.run_streamed` 里传了：

```python
hooks=PaperAgentHooks()
```

SDK 就会自动调用这些回调。

## 7. 为什么 Hook 适合放在 observability 目录

当前 hook 文件放在：

```text
ccfa-paper-agent-backend/app/observability/hooks.py
```

这是合理的，因为 hook 的职责是观察运行过程，而不是实现业务逻辑。

它不属于：

```text
tools
agents
context
schemas
```

它更接近：

```text
logging
tracing
metrics
debug
```

所以放在 `observability` 目录比较清楚。

