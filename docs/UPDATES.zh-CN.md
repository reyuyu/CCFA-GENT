# 项目更新 / Project Updates

记录主要功能变化。每条更新都包含中文和英文，尽量只保留最重要的信息。

Major feature changes are listed here. Each entry includes Chinese and English, keeping only the essentials.

## 2026-06-11

### Agent 指定回答选择器 / Agent Mode Selector

**中文**

- 新增 `agentMode` 请求选项，用户可以明确选择智能调度、写作agent、检查agent、学习agent或检索agent。
- 将聊天框中常驻的一排 agent 按钮改为更紧凑的下拉选择器。
- 每个 agent 模式都有独立图标、浅色协调配色、说明文字和不透明下拉选项样式。
- 用户选择会保存在本地，并在 Agent 运行过程卡片中显示当前使用的 agent 模式。

**English**

- Added an `agentMode` request option so users can explicitly choose Auto Dispatch, WritingAgent, PaperCheckAgent, ReferenceLearningAgent, or SemanticScholarRetrievalAgent.
- Replaced the always-visible agent button row with a compact dropdown selector in the chat composer.
- Each agent mode now has its own icon, light coordinated color treatment, description, and opaque dropdown option style.
- The selected agent mode is saved locally and shown in the streaming progress card during Agent runs.

### 参考学习 Agent / Reference Learning Agent

**中文**

- 新增 `参考学习agent`，可由主控 Agent 自动交接，专门深读本地参考论文。
- 参考学习agent 会梳理每篇参考论文可借鉴的语料、学术观点、写作逻辑、技术思路和实验设计。
- 新增 Introduction 好词好句积累规范文件，要求只收录来源明确、可复用、低版权风险的短语、搭配、句式骨架和写作观察。
- 参考学习agent 可以把可借鉴内容映射到作者初稿的具体章节或段落，并标注 `可直接用`、`需要少量改写`、`只借鉴逻辑` 或 `暂不建议使用`。
- 必要时，参考学习agent 可以基于参考论文逻辑和现有初稿生成 Introduction 大纲调整建议；正文改写仍交给写作 Agent 处理。

**English**

- Added `参考学习agent`, a specialist handoff agent for deep reading of local reference papers.
- The agent summarizes reusable source material, academic viewpoints, writing logic, technical ideas, and experiment-design lessons from each reference paper.
- Added an Introduction good-phrase accumulation template with rules for source attribution, reuse value, and low copyright risk.
- The agent maps borrowable material to concrete draft sections or paragraphs and labels it as directly usable, needs minor adaptation, logic-only, or not recommended.
- When needed, it can propose Introduction outline refinements based on reference-paper logic and the existing draft, while manuscript rewriting remains with WritingAgent.

## 2026-06-10

### 更舒服的 Agent 问答工作台 / More Comfortable Agent Chat Workspace

**中文**

- 优化 Agent 回答中的 Markdown 文本块和代码块样式，改为浅色纸面风格，选中文本时不再出现刺眼的黑底白字反差。
- 左侧资料/线程栏新增平滑收起和展开交互，收起后的回拉按钮移到页面左侧中部，避免遮挡聊天线程标题。
- 优化聊天页顶部、消息区和输入栏之间的过渡，输入栏从硬切色块改为渐变浮层，并增加更自然的阴影层次。
- 左侧资料卡片、线程卡片和论文脉络卡片增加轻量立体感；论文脉络默认收起，展开后内部滚动，避免长内容撑开侧栏。

**English**

- Refined Markdown and code block rendering in Agent answers with a light paper-like style, avoiding harsh dark selection contrast.
- Added a smooth collapse and expand interaction for the left files/threads sidebar, with the restore button moved to the left-middle edge so it does not cover thread titles.
- Improved transitions between the chat header, message area, and composer; the composer now feels like a floating gradient layer instead of a hard separated color block.
- Added subtle depth to file, thread, and writing-map cards; the writing map now starts collapsed and scrolls internally when expanded.

## 2026-06-09

### 更清晰的 Agent 过程流与模型选择 / Clearer Agent Event Flow And Model Choice

**中文**

- 聊天界面现在可以在 `deepseek-v4-flash` 和 `deepseek-v4-pro` 之间切换，默认使用 `deepseek-v4-flash`。
- 推荐日常写作、检查和资料整理优先使用 Flash：速度更快，也更节省 token；复杂长链路推理或高风险改写再切换到 Pro。
- Agent event 流现在会展示每个工具调用的具体用途，用户可以更清楚地看到 Agent 正在读取初稿、参考文献、写作 skill，还是生成修改建议。
- 当任务发生 Agent handoff 时，前端会用更醒目的“Agent 交接”标签突出显示，方便用户理解任务正在转交给写作或检查专门 Agent。

**English**

- The chat UI can now switch between `deepseek-v4-flash` and `deepseek-v4-pro`, with `deepseek-v4-flash` as the default.
- For routine writing, checking, and project-material organization, Flash is recommended because it is faster and more token-efficient; Pro is better reserved for complex long-horizon reasoning or high-risk rewrites.
- The Agent event stream now shows concrete descriptions for tool calls, making it clearer when the Agent is reading drafts, references, writing skills, or generating edit proposals.
- Agent handoff events are emphasized with a dedicated "Agent handoff" label so users can see when the task is transferred to a writing or checking specialist Agent.

## 2026-06-08

### 更顺手的参考论文加入流程 / Smarter Reference Paper Intake

**中文**

- 当 Agent 找到高度相关且可以获取 PDF 的论文时，现在会展示“精读请求卡片”，而不只是把论文列出来。
- 用户可以一键接受，把论文加入核心参考或可选参考；如果暂时不需要，也可以忽略。
- 用户确认后，系统会自动获取并解析论文，将其整理成可阅读的 Markdown，再加入当前论文工程的参考论文列表。
- Agent 不需要等待论文解析完成，可以先继续回答当前问题；精读请求由用户稍后确认。
- 检索到的论文在用户确认并解析入库前，仍然只作为推荐候选，不会被当作已经读过的本地证据。

**English**

- When the Agent finds a highly relevant paper with an accessible PDF, it can now show a reading request card instead of only listing the paper.
- Users can accept the card to add the paper as a core or optional reference, or ignore it if it is not useful.
- After acceptance, the app automatically fetches and parses the paper into readable Markdown, then adds it to the project reference list.
- The Agent can continue answering the current question while the reading request waits for user confirmation.
- Retrieved papers are still treated as recommendations until the user accepts them and the parsed paper is available in the local project.

## 2026-06-07

### 时间感知学术检索 / Time-Aware Academic Retrieval

**中文**

- 为学术检索 agent 新增本机时间工具，使其在检索前可以读取后端机器当前日期和年份。
- 为 Semantic Scholar 搜索工具新增可选发表年份范围参数，例如 `2024-2026`。
- 更新检索提示词，使“最新论文 / recent papers”类请求优先考虑当前年份和近几年论文，结果不足时再放宽年份范围。

**English**

- Added a local time tool for the academic retrieval agent so it can read the backend machine's current date and year before searching.
- Updated the Semantic Scholar search tool to support an optional publication-year range, such as `2024-2026`.
- Updated retrieval instructions so latest/recent-paper searches prioritize the current year and recent years, then relax the year range only when results are insufficient.

### Abstract、Method、Result 初步写作 Skill / Initial Writing Skills For Abstract, Method, And Result

**中文**

- 新增 `writing-abstract-skill`、`writing-method-skill` 和 `writing-result-skill` 三个初步版写作 skill。
- Abstract skill 初步建立了 problem-gap-method-evidence-contribution 链条、证据支撑、摘要压缩和 claim 强度控制规则。
- Method skill 初步建立了技术忠实性、技术小标题与创新点匹配、以及每个技术模块遵循 `why-how-what` 写作逻辑的规则。
- Result skill 初步建立了基于证据的实验写作、每个实验形成明确结论、以及实验结论与论文学术思想匹配的规则。
- 这三个模块 skill 目前只是初步版本，主要用于搭建基础写作框架，后续还会结合具体项目案例、参考文献写作积累和真实写作反馈继续优化。

**English**

- Added preliminary `writing-abstract-skill`, `writing-method-skill`, and `writing-result-skill` files.
- The abstract skill establishes a first-pass workflow for the problem-gap-method-evidence-contribution chain, evidence grounding, compression, and claim-strength control.
- The method skill establishes first-pass principles for technical faithfulness, innovation-aligned subsection headings, and `why-how-what` logic for each technical module.
- The result skill establishes first-pass principles for evidence-grounded experiment writing, experiment-level conclusions, and alignment between each conclusion and the paper's academic thought.
- These three module skills are initial versions only. They provide a basic writing framework and will be further optimized with concrete project cases, reference-paper accumulation, and real writing feedback.

## 2026-06-06

### 初稿上传流程 / Draft Upload Flow

**中文**

- 初稿现在支持上传 `.md`、`.pdf` 和 `.tex` 文件。
- 推荐：直接上传 `.md` 或 `.pdf` 初稿；PDF 初稿会通过 MinerU 解析为 Markdown。
- 不推荐：直接上传 `.tex`。TeX 转换只是兼容入口，解析结果可能不理想。
- 初稿文档区只保留一个 Markdown 初稿；上传新初稿会替换旧初稿。

**English**

- Draft manuscripts now support uploading `.md`, `.pdf`, and `.tex` files.
- Recommended: upload draft manuscripts as `.md` or `.pdf`; PDF drafts are parsed into Markdown with MinerU.
- Not recommended: upload `.tex` directly. TeX conversion is only a compatibility fallback, and the parsing result may be unsatisfactory.
- The draft manuscript area keeps only one Markdown draft at a time. Uploading a new draft replaces the previous one.
