# 八、论文检查 Agent 的设计

## 1. 设计目标

论文检查 Agent 的目标，是把“评价论文内容写得好不好”这类任务从泛化的 `PaperManagerAgent` 和生成型 `WritingAgent` 中拆出来，形成一个专门负责诊断、评价、给出依据和修改建议的检查执行层。

整体结构仍然采用 handoff 设计：

```text
PaperManagerAgent
  -> WritingAgent
       -> writing-introduction-skill
       -> writing-method-skill
       -> writing-result-skill
       -> writing-abstract-skill

  -> PaperCheckAgent
       -> checking-introduction-skill
       -> checking-method-skill
       -> checking-result-skill
       -> checking-abstract-skill
       -> checking-title-problem-phrase-skill
       -> checking-full-paper-skill
```

其中 `PaperManagerAgent` 负责识别用户请求类型并进行 handoff；`PaperCheckAgent` 负责检查论文内容质量，输出检查意见、问题依据和修改建议。

`PaperCheckAgent` 的默认职责不是改稿，而是检查。它可以支持编辑初稿，但只有在用户明确确认后，才能进入修改流程，并且仍然必须通过工具生成可确认 patch，不能静默改写本地文件。

## 2. PaperManagerAgent 和 PaperCheckAgent 的职责划分

### 2.1 PaperManagerAgent

`PaperManagerAgent` 是主控 Agent。

当用户请求属于“评价、检查、诊断、审稿式反馈”时，应 handoff 到 `PaperCheckAgent`。

典型触发包括：

1. 用户问某个写作部分“写得好不好”“是否合格”“有什么问题”。
2. 用户要求检查 Introduction、Method、Result、Abstract、标题、贡献点或全文。
3. 用户要求评价语料是否充足、参考支撑是否够、逻辑是否通畅。
4. 用户要求检查用词是否与上下文对齐、术语是否一致、语气是否学术。
5. 用户要求检查篇幅是否正确、段落是否过长或过短、结构是否符合目标章节。
6. 用户要求像 reviewer 一样指出问题、给出修改意见或打分。

主控 Agent 不应该把这类任务直接交给 `WritingAgent`，因为检查任务的核心不是生成文本，而是判断已有文本是否成立、是否充分、是否需要修改。

### 2.2 PaperCheckAgent

`PaperCheckAgent` 是论文检查 Agent。

它的职责包括：

1. 判断用户要检查的是哪个论文部分。
2. 根据论文部分选择对应 checking skill。
3. 检查前必须读取对应的 checking skill 文件。
4. 读取当前初稿、段落状态、项目元信息、科学问题记忆和相关参考论文。
5. 输出检查意见、严重程度、依据、修改建议。
6. 默认不修改初稿。
7. 如果用户要求修改，先确认用户是否允许生成修改 patch。
8. 在用户确认后，才调用 edit tools 生成真实 patch。

`PaperCheckAgent` 可以理解为论文系统里的“审稿式诊断层”。它既不应该像 `WritingAgent` 一样直接进入写作生成，也不应该只给泛泛建议，而是要把每个问题尽量落到文本位置、上下文证据和参考材料依据上。

## 3. Handoff 规则

### 3.1 handoff 到 PaperCheckAgent 的情况

当用户请求包含以下意图时，`PaperManagerAgent` 应 handoff 到 `PaperCheckAgent`：

```text
检查 / 评价 / 评估 / 诊断 / 审稿 / 看看写得怎么样 / 找问题 /
逻辑是否通顺 / 语料是否充足 / 证据是否充分 / 用词是否对齐 /
篇幅是否合适 / 结构是否合理 / 是否符合 Introduction 写法 /
是否符合 Method 写法 / 是否可以投 CCF-A / 是否像 SCI 论文
```

示例：

```text
用户：帮我看看 Introduction P2 写得好不好。
用户：检查这一段语料是否充足。
用户：评价 Method 的逻辑是否清楚。
用户：看看 Abstract 篇幅和结构是否合适。
用户：像 reviewer 一样指出 Result section 的问题。
```

这些请求都应该进入 `PaperCheckAgent`。

### 3.2 handoff 到 WritingAgent 的情况

如果用户直接要求“写、改写、润色、扩写、缩写、生成新段落”，应 handoff 到 `WritingAgent`。

示例：

```text
用户：帮我重写 Introduction P2。
用户：把 Method 这一段润色成更学术的英文。
用户：给我写一个 Abstract。
```

### 3.3 检查后进入修改的情况

如果用户先要求检查，再要求修改，应分两步：

```text
用户：帮我检查 Introduction P2 写得怎么样
  -> PaperCheckAgent 输出检查意见和依据

用户：根据这些意见帮我修改
  -> PaperCheckAgent 确认用户授权修改
  -> 调用 edit tools 生成 patch
  -> 前端展示 diff
  -> 用户确认后写入本地文件
```

如果用户在同一句话中明确授权：

```text
用户：帮我检查 Introduction P2，如果有问题就直接给我生成修改 patch。
```

`PaperCheckAgent` 可以在完成检查后生成 patch，但仍然不能绕过前端确认。这里的“直接”只表示可以生成可确认 diff，不表示自动写入本地文件。

## 4. Checking Skill 目录设计

检查 skill 与写作 skill 保持结构对称。

建议目录如下：

```text
app/skills/
  checking-registry.py

  checking-introduction-skill/
    SKILL.md
    rubrics/
    examples/
    checklists/

  checking-method-skill/
    SKILL.md
    rubrics/
    examples/
    checklists/

  checking-result-skill/
    SKILL.md
    rubrics/
    examples/
    checklists/

  checking-abstract-skill/
    SKILL.md
    rubrics/
    examples/
    checklists/

  checking-title-problem-phrase-skill/
    SKILL.md
    rubrics/
    examples/
    checklists/

  checking-full-paper-skill/
    SKILL.md
    rubrics/
    examples/
    checklists/
```

如果代码实现时希望使用 snake_case 命名，也可以把这些 skill 暴露为：

```text
check_introduction_skill
check_method_skill
check_result_skill
check_abstract_skill
check_title_problem_phrase_skill
check_full_paper_skill
```

但为了和已有 `writing-introduction-skill` 风格保持一致，文件夹名建议使用 `checking-xxx-skill`。

## 5. Checking Skill Registry 设计

检查 skill registry 的作用与 writing skill registry 对称。

每个 checking skill 应注册：

- skill id
- skill name
- target sections
- description
- directory
- instruction path

示例：

```text
checking-introduction-skill
  name: IntroductionCheckSkill
  targets: introduction, motivation, research gap, contribution
  description: Check Introduction structure, motivation chain, gap validity, evidence support, paragraph logic, and academic expression.

checking-method-skill
  name: MethodCheckSkill
  targets: method, methodology, approach, framework, model
  description: Check method clarity, technical completeness, module dependency, notation consistency, and unsupported implementation claims.

checking-result-skill
  name: ResultCheckSkill
  targets: experiment, result, discussion, ablation, analysis
  description: Check result reporting, comparison fairness, evidence-to-claim alignment, metric explanation, ablation logic, and discussion validity.
```

后续可以选择两种实现方式：

1. 单独建立 `checking_registry.py`，与 `registry.py` 分离。
2. 扩展现有 `registry.py`，增加 `SkillType = writing | checking`。

第一种方式更清晰，第二种方式更容易复用工具。当前设计上推荐先分离，因为检查 skill 和写作 skill 的输出目标不同。

## 6. Checking Skill Tools 设计

为保持结构对称，建议新增检查 skill tools：

```text
list_checking_skill_registry
read_checking_skill_instruction
list_checking_skill_files
read_checking_skill_file
edit_checking_skill_file
```

### 6.1 `list_checking_skill_registry`

列出当前注册的检查 skill。

`PaperCheckAgent` 可以通过它知道系统中有哪些检查能力，以及每个 skill 适合检查哪些章节。

### 6.2 `read_checking_skill_instruction`

读取某个 checking skill 文件夹下的 `SKILL.md`。

这是检查前的强制步骤。

例如检查 Introduction 时必须读取：

```text
checking-introduction-skill/SKILL.md
```

### 6.3 `list_checking_skill_files`

列出 checking skill 文件夹下的辅助文件。

这些文件可以包括：

- checklist
- 评分 rubrics
- 常见问题类型
- 高质量论文示例观察
- 目标 venue 风格要求

### 6.4 `read_checking_skill_file`

读取 checking skill 的指定辅助文件。

当用户要求更细粒度检查，例如“只检查语料是否充足”或“只检查 gap 是否成立”，Agent 可以读取对应 checklist。

### 6.5 `edit_checking_skill_file`

可选工具，用于维护检查经验积累。

例如当 Agent 在多篇论文中发现某类 Introduction 常见问题，可以记录到 `checklists/` 或 `examples/` 中。但这类写入不应混同于修改论文初稿。

## 7. PaperCheckAgent 的检查维度

`PaperCheckAgent` 不只做语言润色检查，而是做论文内容质量检查。

通用检查维度包括：

1. **任务匹配**：该段是否完成了它在章节中的任务。
2. **结构合理性**：段落内部是否有清楚的推进顺序。
3. **逻辑连贯性**：句子之间是否存在跳跃、断裂、重复或循环论证。
4. **语料充足性**：当前内容是否有足够来源材料、参考论文或项目事实支撑。
5. **claim-evidence 对齐**：每个强主张是否有证据支撑。
6. **上下文对齐**：术语、问题定义、方法名、贡献点是否与前后文一致。
7. **篇幅合适性**：该段长度是否符合章节任务，是否过短、过长或信息密度失衡。
8. **学术表达质量**：措辞是否准确、克制、符合 academic English。
9. **不可编造风险**：是否出现无来源实验结果、无依据优势、虚假引用或过度承诺。
10. **可修改性**：是否属于 finalized 段落，是否允许提出修改 patch。

这些维度在不同章节中的权重不同。例如 Introduction 更重视 motivation chain 和 gap，Method 更重视技术完整性和模块依赖，Result 更重视证据与结论对齐。

## 8. 各章节 Checking Skill 的重点

### 8.1 IntroductionCheckSkill

重点检查：

- 背景是否自然引入。
- motivation chain 是否成立。
- research gap 是否具体、可信、不过度扩大。
- contribution 是否与 gap 对应。
- 是否存在概念突然出现。
- 是否有足够参考论文语料支撑。
- 是否从用户中文意图直译成了论文正文。
- 段落长度是否符合 Introduction 功能。

### 8.2 MethodCheckSkill

重点检查：

- 方法整体流程是否清楚。
- 模块输入、操作、输出、目的是否完整。
- 模块之间依赖是否连贯。
- 术语、符号、变量是否一致。
- 是否发明了未确认的 loss、组件、训练细节或超参数。
- 是否把设计动机和实现细节混在一起。
- 图、公式、文字描述是否互相支撑。

### 8.3 ResultCheckSkill

重点检查：

- 实验结论是否由数据支持。
- 比较是否公平。
- baseline、dataset、metric 是否说明清楚。
- ablation 是否能支撑对应模块贡献。
- 是否存在夸大实验结果的问题。
- discussion 是否真正解释现象，而不是重复表格。
- 是否缺少失败案例、限制性讨论或必要 caveat。

### 8.4 AbstractCheckSkill

重点检查：

- 是否覆盖 background/problem、gap、method、result、contribution。
- 是否过长或过短。
- 是否把 Introduction 和 Method 的细节堆得过多。
- 是否出现正文没有支撑的结果或贡献。
- 是否有清楚的问题-方法-结果链。
- 是否符合目标 venue 的摘要风格。

### 8.5 TitleProblemPhraseCheckSkill

重点检查：

- 标题是否准确表达研究对象和核心方法。
- 是否过宽、过窄、过营销化。
- problem phrase 是否能稳定用于全文。
- 方法名、任务名、贡献短语是否与论文实际内容一致。
- 是否存在与已有领域术语冲突的命名。

### 8.6 FullPaperCheckSkill

重点检查：

- 全文主线是否一致。
- Introduction 中承诺的贡献是否在 Method 和 Result 中兑现。
- Method 中提出的模块是否都有实验验证。
- Result 中强调的优势是否回扣核心问题。
- Abstract、Title、Introduction、Conclusion 是否表达同一个故事。
- 参考论文支撑是否集中在关键 claim 上。
- 是否存在章节之间术语漂移。

## 9. 检查报告输出格式

`PaperCheckAgent` 的默认输出应该是结构化 Markdown，而不是直接改写文本。

推荐格式：

```text
总体判断
- 简短说明该部分当前质量：可用 / 基本可用但需要修改 / 暂不建议使用。

主要问题
1. [严重程度] 问题标题
   位置：对应段落、句子或章节。
   问题：说明哪里不成立。
   依据：引用当前草稿、上下文、参考论文或缺失材料。
   建议：说明如何改。

次要问题
- 用词、长度、衔接、表达精度等较小问题。

材料充分性判断
- 当前语料是否足够支持写作目标。
- 缺哪些材料。
- 是否需要检索或补充参考论文。

是否建议修改
- 建议修改 / 暂不修改 / 需要用户补充材料后再修改。
- 如果需要修改，询问用户是否生成可确认 patch。
```

严重程度建议使用：

```text
P0: 会导致论文事实错误、虚假 claim、严重逻辑断裂。
P1: 明显影响章节质量，需要优先修改。
P2: 局部表达或组织问题，建议优化。
P3: 风格、措辞、篇幅上的轻微建议。
```

## 10. 意见依据设计

检查意见必须有依据。

依据来源按优先级包括：

1. 当前初稿文本。
2. 前后文段落和章节结构。
3. 段落写作状态和 finalized 标记。
4. Introduction 大纲或其他章节规划。
5. 科学问题记忆、创新点、关键技术记忆。
6. 核心参考论文。
7. 可选参考论文。
8. 用户当前消息中的明确要求。

如果某个问题是由于材料缺失导致的，Agent 应明确说：

```text
当前材料不足以判断 / 当前材料不足以支持这个 claim。
```

不能为了让检查报告显得完整而编造依据。

## 11. 编辑初稿的权限边界

`PaperCheckAgent` 支持编辑初稿，但它的默认行为必须是只检查、不修改。

### 11.1 不允许修改的情况

以下情况不能调用 edit tools：

1. 用户只说“帮我检查”“评价一下”“看看哪里有问题”。
2. 用户要求给修改建议，但没有要求生成修改稿或 patch。
3. 当前段落是 finalized，用户没有明确授权修改。
4. Agent 判断材料不足，修改会导致编造。

### 11.2 可以生成 patch 的情况

以下情况可以生成 patch：

1. 用户明确说“检查后帮我修改”。
2. 用户在检查报告后继续说“按这些意见修改”。
3. 用户明确允许修改 finalized 段落。
4. 修改所需材料充足，并且目标段落可编辑。

即使可以生成 patch，也只能通过 edit tools 产生：

```text
edit_draft
edit_draft_section
edit_draft_paragraph_content
```

最终写入仍由前端 diff 确认完成。

### 11.3 推荐交互话术

当检查后需要修改时，Agent 应这样收束：

```text
我建议修改 P2 的 motivation-to-gap 过渡和最后一句 claim。
如果你确认，我可以基于上面的检查意见生成一个可预览的 patch。
```

不要说：

```text
我已经帮你改好了。
```

除非工具已经生成 patch，并且前端已经完成用户确认写入。

## 12. 推荐运行流程

### 12.1 只检查不修改

```text
用户：帮我检查 Introduction P2 写得好不好
  -> PaperManagerAgent
  -> handoff_to_paper_check_agent
  -> PaperCheckAgent
  -> list_checking_skill_registry
  -> read_checking_skill_instruction(checking-introduction-skill)
  -> get_introduction_outline
  -> get_scientific_problem_memory
  -> get_draft_paragraph_content(P2)
  -> get_draft_paragraph_status(P2)
  -> list_reference_papers(core)
  -> get_reference_section_content(relevant sections)
  -> 输出检查报告、依据和修改建议
  -> 不生成 patch
```

### 12.2 检查后请求修改

```text
用户：按刚才意见修改
  -> PaperManagerAgent
  -> handoff_to_paper_check_agent
  -> PaperCheckAgent
  -> 确认目标段落和可编辑状态
  -> 必要时重新读取检查 skill 和上下文
  -> edit_draft_paragraph_content
  -> 后端返回工具生成的 proposeFileChange patch
  -> 前端展示 diff
  -> 用户确认后写入本地文件
```

### 12.3 材料不足时

```text
用户：检查这个 gap 是否有参考支撑
  -> PaperCheckAgent 读取草稿和参考论文
  -> 判断本地材料不足
  -> 说明缺失的是背景证据、方法对比证据还是问题定义证据
  -> 可建议调用 retrieve_academic_papers
  -> 不生成修改稿
```

## 13. 与 WritingAgent 的关系

`PaperCheckAgent` 和 `WritingAgent` 是对称但不重叠的两个 Agent。

```text
WritingAgent:
  目标是生成或修改论文文本。
  输出是 manuscript prose 或 patch。
  skill 关注如何写。

PaperCheckAgent:
  目标是判断已有文本是否成立。
  输出是检查意见、依据和建议。
  skill 关注如何检查。
```

在复杂流程中，两者可以串联：

```text
先由 PaperCheckAgent 检查问题
再由 WritingAgent 或 PaperCheckAgent 在授权后生成 patch
最后由前端展示 diff 并等待用户确认
```

如果修改任务本质是大幅重写或新增内容，建议由 `WritingAgent` 执行。

如果修改任务是根据检查报告进行局部修复，`PaperCheckAgent` 可以直接执行。

## 14. 当前设计的价值

论文检查 Agent 解决的是写作系统中的另一个核心问题：不是“能不能写”，而是“写出来的内容是否可靠、充分、连贯、可发表”。

这次设计带来的价值包括：

1. 检查任务不再混在写作任务里，handoff 路径更清晰。
2. 检查 skill 与写作 skill 对称，后续可以按章节持续扩展。
3. 检查报告要求给出依据，避免泛泛而谈。
4. 语料充足性、逻辑连贯性、上下文对齐、篇幅控制都成为显式检查维度。
5. Agent 默认只给意见，不直接改稿，保护初稿安全。
6. 需要修改时仍通过工具 patch 和前端确认，延续可确认文件修改机制。

整体上，`PaperCheckAgent` 是论文系统中的“诊断和审稿层”。它让用户可以先判断一段内容是否值得保留、哪里需要补证据、哪里需要重构，再决定是否交给系统生成可确认修改。
