
> **Agent 运行过程流 / progress events / streaming events / execution trajectory**

也就是前端展示的：

```text
Agent 正在分析任务……
Agent 正在调用工具：search_reference_papers
Agent 正在整理参考论文信息……
Agent 正在判断信息是否足够……
Agent 正在生成最终回答……
```

还有一个是 **OpenAI Agents SDK 里的 tracing 机制**，更偏后端调试、日志、观测；你现在问的是**用户可见的运行状态提示**。

这两个东西有关，但不是一回事。

---

## 1. 两种 “trace” 要分清楚

### A. 后端调试 trace

这是 OpenAI Agents SDK 官方文档里说的 tracing。它会记录一次 agent run 里面的 LLM generation、tool calls、handoffs、guardrails、自定义事件等，用来 debug、可视化、监控工作流。官方定义里，trace 是一次完整 workflow，span 是其中的单个操作，比如一次模型调用或一次工具执行。([OpenAI GitHub Pages](https://openai.github.io/openai-agents-python/tracing/?utm_source=chatgpt.com "Tracing - OpenAI Agents SDK"))

它面向的是开发者。

例如：

```text
trace_id = xxx
├─ agent_span
├─ generation_span
├─ function_span: retrieve_paper
├─ generation_span
└─ function_span: update_draft
```

这个适合你后续排查：

```text
为什么 agent 修改错了？
它到底调用了哪个 tool？
它读了哪些论文？
哪一步耗时最长？
```

---

### B. 前端展示 trace / 进度流

你说的是这个。

它面向用户。

例如：

```text
正在读取项目上下文……
正在检索核心参考论文……
正在调用工具 retrieve_reference_sections……
正在根据论文内容组织回答……
正在生成最终修改建议……
```

OpenAI Agents SDK 里对应的能力更接近 **streaming events**。官方文档里 `Runner.run_streamed()` 可以返回语义事件，`stream_events()` 可以拿到运行中的事件；这些事件包括 raw response event、run item stream event、agent updated event 等。([OpenAI GitHub Pages](https://openai.github.io/openai-agents-python/running_agents/?utm_source=chatgpt.com "Running agents - OpenAI Agents SDK"))

其中 `RunItemStreamEvent` 会在消息生成、工具调用、工具输出、handoff 等事件发生时产生，所以它特别适合做你说的“Agent 正在调用 tools”这种前端提示。([OpenAI GitHub Pages](https://openai.github.io/openai-agents-python/streaming/?utm_source=chatgpt.com "Streaming - OpenAI Agents SDK"))

---

## 2. 你真正想做的是：User-facing Agent Progress

你可以把它理解成：

```text
trace：给开发者看的完整轨迹
progress：给用户看的运行提示
```

在你的论文写作 Agent 里，前端不应该展示太底层的东西，比如：

```text
span_id=xxx
parent_id=xxx
raw_response_event.delta=...
```

而应该展示经过包装后的自然语言状态：

```text
正在读取论文工程信息
正在筛选可参考论文
正在检索 Introduction 相关内容
正在调用段落改写工具
正在整合修改建议
```

也就是说，**不要把底层 SDK 事件原样给用户看，而是把它翻译成用户能理解的状态消息。**

---

## 3. OpenAI Agents SDK 里可以怎么做？

如果你仍然使用 Agents SDK 的 `Runner.run_streamed()`，可以监听事件：

```python
from agents import Runner

async def run_agent_with_progress(agent, user_input: str):
    result = Runner.run_streamed(agent, input=user_input)

    async for event in result.stream_events():
        if event.type == "run_item_stream_event":
            if event.name == "tool_called":
                print("Agent 正在调用工具……")

            elif event.name == "tool_output":
                print("工具执行完成，Agent 正在整理结果……")

            elif event.name == "message_output_created":
                print("Agent 正在生成回答……")

        elif event.type == "agent_updated_stream_event":
            print("Agent 正在切换任务处理角色……")

    return result.final_output
```

注意：不同 SDK 版本里的事件字段可能略有差异，但核心思想是一样的：**监听 stream events，然后映射成前端状态。**

---

## 4. DeepSeek 能不能做这种 “运行过程提示”？

可以。

而且这里要分清楚：

```text
OpenAI 默认 tracing dashboard 受 OpenAI trace 后端影响；
但“前端运行过程提示”不一定依赖 OpenAI trace dashboard。
```

你用 DeepSeek 的时候，仍然可以自己做 progress event。

最推荐你做一个统一的事件格式：

```python
from dataclasses import dataclass, field
from typing import Literal, Any


@dataclass
class AgentProgressEvent:
    type: Literal[
        "thinking",
        "tool_start",
        "tool_end",
        "retrieving",
        "writing",
        "done",
        "error",
    ]
    message: str
    data: dict[str, Any] = field(default_factory=dict)
```

例如：

```python
AgentProgressEvent(
    type="tool_start",
    message="正在调用工具：检索核心参考论文",
    data={"tool_name": "retrieve_reference_papers"}
)
```

前端只展示 `message`，后端保留 `data` 用来 debug。

---

## 5. 你可以这样设计运行过程

以你的论文写作 Agent 为例，用户说：

```text
帮我根据核心参考论文优化 Introduction
```

前端可以展示：

```text
1. 正在读取当前论文工程信息……
2. 正在定位 Introduction 章节……
3. 正在检索核心参考论文中与 Introduction 相关的内容……
4. 正在分析参考论文的写作结构……
5. 正在判断当前初稿是否缺少研究动机、贡献或问题定义……
6. 正在生成修改建议……
7. 正在整理最终回答……
```

其中有些状态来自真实工具调用：

```text
正在读取当前论文工程信息
正在检索核心参考论文
正在定位 Introduction 章节
```

有些状态是你人为设计的阶段提示：

```text
正在分析参考论文的写作结构
正在判断信息是否足够
正在整理最终回答
```

这很正常。

---

## 6. 但有一个关键点：不要展示模型真实“思维链”

你提到：

```text
agent 正在判断信息是否够用
```

这可以展示。

但不要展示成：

```text
模型的完整内心推理过程如下……
第一步我认为……
第二步我怀疑……
第三步我决定……
```

更安全、也更专业的方式是展示**阶段性摘要**，而不是模型的完整 reasoning。

推荐展示：

```text
正在判断当前材料是否足够支持回答……
```

不推荐展示：

```text
我正在逐条权衡 A、B、C，然后因为 xxx 所以选择 yyy……
```

前者是状态提示，后者是暴露推理链。

---

## 7. 你的工程里建议同时做两个系统

我建议你不要二选一，而是分成两层：

```text
后端 trace：
给开发者看，记录完整运行轨迹、tool 输入输出、耗时、错误、上下文变更。

前端 progress：
给用户看，只展示简洁状态，例如“正在检索论文”“正在调用工具”“正在生成回答”。
```

结构可以是：

```text
app/
├─ agent/
│  ├─ runner.py
│  ├─ progress.py      # 用户可见进度事件
│  ├─ tracing.py       # 开发者调试 trace
│  └─ tools/
├─ api/
│  └─ chat.py          # SSE / WebSocket 推送 progress
└─ storage/
   └─ traces.py        # 保存后端 trace
```

---

## 8. 一个更贴近你项目的伪代码

```python
async def run_paper_agent(user_input, project_id, thread_id, emit):
    await emit({
        "type": "thinking",
        "message": "正在读取论文工程信息……"
    })

    project_context = await load_project_context(project_id)

    await emit({
        "type": "retrieving",
        "message": "正在检索与当前问题相关的初稿和参考论文……"
    })

    related_sections = await retrieve_related_sections(
        project_context=project_context,
        query=user_input,
    )

    await emit({
        "type": "thinking",
        "message": "正在判断当前材料是否足够支持回答……"
    })

    await emit({
        "type": "writing",
        "message": "正在组织论文写作建议……"
    })

    result = await call_deepseek_agent(
        user_input=user_input,
        project_context=project_context,
        related_sections=related_sections,
    )

    await emit({
        "type": "done",
        "message": "回答已生成。"
    })

    return result
```

这里的 `emit` 可以是：

```text
SSE
WebSocket
前端轮询
本地 CLI print
```

如果你现在还没有服务器，本地开发阶段可以先用 `print` 或日志模拟。后面有前端了，再换成 SSE 或 WebSocket。

---

## 9. 最简单的前端效果

你的聊天界面可以这样显示：

```text
用户：
帮我修改 Introduction，使其更符合 CVPR 风格。

Agent 运行中：
✓ 已读取论文工程信息
✓ 已定位 Introduction 章节
✓ 已检索 3 篇核心参考论文
✓ 已分析当前段落问题
⏳ 正在生成修改建议……
```

最终回答出来后，把这些状态折叠成：

```text
查看运行过程
```

点开后再显示完整过程。

这就是一个很舒服的 Agent 交互体验。
