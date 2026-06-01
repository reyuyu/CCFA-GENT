# 五、写作 Agent 和 intro_writing_SKILL 的设计

## 1. 设计目标

本次设计的核心目标，是把论文写作能力从一个泛化的 Paper Agent 中拆出来，形成更清晰的写作执行层：

```text
PaperManagerAgent
  -> WritingAgent
       -> writing-introduction-skill
       -> writing-method-skill
       -> writing-result-skill
       -> writing-abstract-skill
       -> writing-title-contribution-skill
```

其中 `PaperManagerAgent` 负责理解用户请求、调度工具、必要时 handoff 到 `WritingAgent`；`WritingAgent` 负责真正执行论文写作、润色、修改和 patch 生成。

本阶段重点只实现写作 Agent，尤其是 Introduction 写作能力。

## 2. PaperManagerAgent 和 WritingAgent 的职责划分

### 2.1 PaperManagerAgent

`PaperManagerAgent` 是主控 Agent。

它的职责包括：

1. 判断用户请求是不是写作、修改、润色、生成大纲、项目状态更新等任务。
2. 对于目标明确的修改任务，可以直接调用编辑工具。
3. 对于复杂学术写作任务，可以 handoff 给 `WritingAgent`。
4. 不能口头声称已经修改文件，必须依赖工具产生 patch。

因为实际运行中出现过：

```text
Tool edit_draft_section not found in agent PaperManagerAgent
```

所以目前 `PaperManagerAgent` 也注册了编辑工具，避免主控 Agent 被模型路径选择到时无法完成编辑。

### 2.2 WritingAgent

`WritingAgent` 是论文写作 Agent。

它的系统提示词被简化为：

1. 先判断用户正在写论文的哪个部分。
2. 根据论文部分选择对应 skill。
3. 写作前必须调用 `read_writing_skill_instruction` 读取 skill 文件。
4. 修改初稿时必须调用 edit tools 生成真实 patch。
5. 论文正文使用 academic English，解释性回复跟随用户语言。

这样做的好处是：WritingAgent 自身不再塞入过长规则，而是把细节交给 skill 文件管理。

## 3. Skill 目录设计

Skill 被设计成文件夹，而不是简单 prompt 字符串。

当前结构如下：

```text
app/skills/
  registry.py
  writing-introduction-skill/
    SKILL.md
    references/
    scripts/
  writing-method-skill/
    SKILL.md
    references/
    scripts/
  writing-result-skill/
    SKILL.md
    references/
    scripts/
  writing-abstract-skill/
    SKILL.md
    references/
    scripts/
  writing-title-contribution-skill/
    SKILL.md
    references/
    scripts/
```

`registry.py` 负责注册 skill 信息，包括：

- skill id
- skill name
- 适用章节或任务
- 描述
- skill 文件夹路径

这样后续新增 skill 时，不需要把所有规则都写进主系统提示词。

## 4. Skill Tools 设计

为了让 Agent 在运行时读取 skill，新增了 skill tools：

```text
list_writing_skill_registry
read_writing_skill_instruction
list_writing_skill_files
read_writing_skill_file
```

它们的作用分别是：

### 4.1 `list_writing_skill_registry`

列出当前注册的写作 skill。

Agent 可以通过它知道系统中有哪些 skill、每个 skill 适合什么任务。

### 4.2 `read_writing_skill_instruction`

读取某个 skill 文件夹下的 `SKILL.md`。

这是 WritingAgent 执行写作前的关键步骤。

例如 Introduction 写作任务必须读取：

```text
writing-introduction-skill/SKILL.md
```

### 4.3 `list_writing_skill_files`

列出某个 skill 文件夹下的子文件。

后续如果 `references/` 或 `scripts/` 中放入示例、模板或辅助脚本，Agent 可以先查看文件列表。

### 4.4 `read_writing_skill_file`

读取 skill 文件夹中的指定子文件。

这为后续扩展“章节写作模板”“句式语料”“示例论文风格说明”等材料预留了接口。

## 5. Introduction Skill 的核心思想

Introduction 写作 skill 当前强调六个原则：

### 5.1 用户信息只提供方向

用户的要求仍然最高优先级，但用户信息主要作为：

- 写作方向
- 科学意图
- 任务约束
- 需要表达的观点

不能把用户的中文说明简单翻译成英文论文内容。

论文正文的语料、句式和学术表达，应尽量来源于参考论文和已有草稿，而不是中文直译。

### 5.2 参考论文 imitation

对于每一句话，Agent 都应该先判断是否能从参考论文中找到可复用或可迁移的写作材料。

这里 imitation 的对象是：

- 学术表达方式
- 段落组织方式
- 背景引入方式
- gap 暴露方式
- contribution framing

不是复制原文句子。

### 5.3 最小改动

如果已有草稿、参考语料或用户提供的结构，Agent 应该尽量复用。

原则是：

```text
能保留就保留，只改必要部分。
```

避免自由发挥、大幅重写、过度扩写。

### 5.4 逐句写作

Introduction 不是整段一口气生成，而应按句子推进。

每个句子都要检查：

1. 是否有参考来源可复用。
2. 是否需要替换术语、对象或逻辑依赖。
3. 是否承接上一句。
4. 是否为下一句做铺垫。

### 5.5 写完自检

每个段落或写作单元完成后，需要检查：

- 是否符合大纲
- 是否逻辑连贯
- 是否有概念突然出现
- 长度是否合适
- 是否缺少参考支撑
- 是否误改 finalized 段落

### 5.6 大纲优先

写 Introduction 前，必须先明确段落级大纲。

也就是说，Agent 不应该直接开始写 P2、P3、P4，而应该先知道：

```text
P1 写什么
P2 写什么
P3 写什么
P4 写什么
P5 写什么
```

每一段用一句话描述写作任务。

## 6. Introduction 大纲工具设计

为了让 Introduction 大纲成为项目状态的一部分，而不是只存在于聊天记录里，新增了两类工具：

```text
get_introduction_outline
edit_introduction_outline
```

### 6.1 `get_introduction_outline`

读取当前项目已有的 Introduction 大纲。

如果用户已经让 Agent 建立过大纲，后续写 P2、P3 时，Agent 可以先读取已有大纲，保证写作方向一致。

### 6.2 `edit_introduction_outline`

生成或更新 Introduction 段落级大纲。

输入是一个字符串数组：

```json
[
  "P1 introduces the background of black-box deep learning in lung CT diagnosis and the interpretability problem.",
  "P2 discusses XAI and concept-based methods, then identifies the limitation of manual concept annotation.",
  "P3 introduces VLM-based alternatives and explains their limitations for reliable concept grounding."
]
```

后端会把它转成结构化 patch：

```json
{
  "type": "updateIntroductionOutline",
  "payload": {
    "draftFileId": "...",
    "summary": "...",
    "paragraphs": [
      {
        "paragraphNumber": 1,
        "outline": "..."
      }
    ]
  }
}
```

## 7. 前端可见的大纲状态

前端项目状态新增字段：

```ts
introductionOutline?: {
  draftFileId?: string;
  summary: string;
  paragraphs: Array<{
    paragraphNumber: number;
    outline: string;
  }>;
  updatedAt: string;
}
```

当后端返回 `updateIntroductionOutline` patch 后，前端会写入 `project.introductionOutline`。

显示位置在左侧文件栏上方：

```text
Introduction Outline
P1 ...
P2 ...
P3 ...

初稿
核心参考文献
可选参考文献
图片
```

如果项目还没有 Introduction 大纲，这个面板不会显示。

## 8. Patch 机制调整

之前系统只把 `proposeFileChange` 当成真正 patch。

这会导致生成 Introduction 大纲时误判，因为大纲 patch 类型是：

```text
updateIntroductionOutline
```

因此后端判断逻辑调整为：

```text
只要是工具真实生成的 patch，就算有效 patch。
```

目前有效 patch 包括：

- `proposeFileChange`
- `updateIntroductionOutline`
- `updateDraftParagraphStatus`
- `updateProjectMeta`
- `appendSystemMessage`

这样生成大纲不会再被误判成“没有生成真正 patch”。

## 9. 防止 Agent 手写假 patch

之前出现过一个问题：模型没有调用 edit tool，而是在最终回答里手写了一个 JSON patch。

这种 patch 很危险，因为：

1. 可能字段不完整。
2. 可能 JSON 被正文引号破坏。
3. 前端无法确认它是不是工具真实产生的结果。

因此现在要求：

```text
Agent 最终回答里不要手写 patch。
需要修改时，必须调用工具。
后端只接受 run_context.patches 中由工具产生的 patch。
```

这条规则同时写入了系统提示词和后端校验逻辑。

## 10. Introduction 写作的推荐运行流程

一个理想的 Introduction 写作流程如下：

```text
用户：请为 Introduction 建立大纲
  -> PaperManagerAgent 或 WritingAgent
  -> read_writing_skill_instruction(writing-introduction-skill)
  -> get_introduction_outline
  -> list_reference_papers(core)
  -> list_reference_sections / get_reference_section_content
  -> edit_introduction_outline
  -> 前端显示 Introduction Outline

用户：请写 P2
  -> 读取 Introduction Outline
  -> 定位 P2 要写什么
  -> 读取当前 Introduction 和段落状态
  -> 读取相关参考论文段落
  -> 逐句写作
  -> 自检
  -> edit_draft_section 或 edit_draft_paragraph_content
  -> 前端产生可确认 diff
```

## 11. 当前设计的价值

这次设计解决了几个关键问题：

1. 写作规则不再全部塞进系统提示词，而是迁移到 skill 文件。
2. Introduction 写作有明确的“先大纲、再逐句写作、再自检”流程。
3. 用户中文信息不会被直接翻译成论文正文。
4. 参考论文成为真正的写作语料来源。
5. Introduction 大纲成为前端可见、可持续使用的项目状态。
6. patch 机制区分了真实工具 patch 和模型手写假 patch。

整体上，WritingAgent 现在更像一个“按章节 skill 执行的写作系统”，而不是一个只会泛泛润色的聊天模型。
