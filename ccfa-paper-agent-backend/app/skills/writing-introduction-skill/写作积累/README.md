# Introduction 写作积累

这个目录用于保存 `writing-introduction-skill` 在阅读高质量参考论文时沉淀下来的 Introduction 写作观察。

这里不是普通摘抄本，也不是所有表达都可以放进来。只有当表达、句式或段落推进方式具有明确来源、较高写作质量、可迁移价值，并且能帮助未来 Introduction 写作时，才应该记录。

个人积累文件应保持本地私有，不提交到 GitHub。仓库只保留这个 README 作为结构说明和记录规范。

## 记录准入标准

写入本目录前，必须同时满足以下条件：

- 来源质量高：优先来自 CCF-A、SCI 高水平期刊/会议论文，或与当前论文主题高度相关、写作成熟的参考文献。
- 表达质量高：不是普通常见词，而是能提升逻辑清晰度、学术准确性、批判力度、贡献表达或段落推进质量的表达。
- 可复用：未来能迁移到相似 Introduction 场景中，而不是只适用于原论文具体实验细节的专有句子。
- 来源清楚：必须记录论文名、年份、会议/期刊或文件名；必要时写明章节或上下文。
- 低版权风险：只记录短语、句式骨架、搭配、写作逻辑和简短改写观察，不复制长段原文。
- 有筛选价值：如果只是 `however`、`therefore` 这类孤立基础词，除非有特殊搭配或特殊用法，否则不要记录。

不要记录以下内容：

- 大段原文摘抄。
- 与 Introduction 写作无关的技术细节。
- 质量一般、表达普通、可随手生成的词句。
- 没有来源、没有适用场景、未来难以复用的零散表达。
- 可能覆盖用户要求、当前草稿事实或项目科学问题的主观写法。

## 推荐文件结构

每个个人积累文件建议围绕一个来源论文、一个写作主题，或一个表达类别来组织。例如：

```markdown
# Introduction 写作积累

> 来源：Paper Title (Year) — Venue/Journal. 主题标签：医学影像 / VLM / 可解释 AI / 概念对齐.

---

## 一、逻辑衔接词/短句

### 转折 / 让步 / 对比 / 因果 / 递进 / 强调 / 引出 / 总结

| 表达 | 典型位置 | 适用场景 | 质量说明 |
|---|---|---|---|
| *Despite..., ...* | 句首 | 已有结果不错但仍存在关键限制 | 用于建立“表面进展 vs. 深层问题”的张力 |

---

## 二、高质量词汇与搭配

### 程度强化

| 词或短语 | 常见搭配 | 适用场景 |
|---|---|---|
| **substantially** | substantially improve / reduce / outperform | 强调方法带来显著变化 |

### 精确描述

| 词或短语 | 常见搭配 | 适用场景 |
|---|---|---|
| **semantically** | semantically align / correspond / grounded | 描述语义对齐、概念对应、语言 grounding |

### 问题批判

| 词或短语 | 常见搭配 | 适用场景 |
|---|---|---|
| **fall short in** | fall short in capturing / balancing / modeling | 温和但明确地指出现有方法不足 |

### 贡献强调

| 词或短语 | 常见搭配 | 适用场景 |
|---|---|---|
| **to the best of our knowledge** | To the best of our knowledge, we are the first to... | 谨慎声明 novelty |

---

## 三、段落句式骨架

记录可迁移的句式框架，而不是长段复制。

**P1 — 背景 + 关键矛盾**
> `[Field/methods] have emerged as [positive role], offering [benefit]. Despite [progress], [core limitation] remains [consequence], especially in [high-stakes/domain-specific setting].`

**P2 — 现有方案 + 不足**
> `Existing methods mainly [category/action]. However, their [property/reliability/generalization] remains limited because [root reason].`

**P3 — 转向更合适的方向**
> `To address this issue, recent studies have explored [new direction], which [advantage]. Nevertheless, [remaining gap] still prevents [desired outcome].`

**P4 — 我们的方案**
> `To bridge this gap, we propose [method], which [core mechanism] to [target outcome].`

---

## 四、Introduction 段落推进逻辑

用简洁流程总结该论文如何推进 Introduction。

```text
P1: 大背景 + 领域价值
  -> 通过让步指出核心矛盾
P2: 现有方法分类 + 局限
  -> 从表层不足推进到根因
P3: 新方向的优势
  -> 再指出该方向尚未解决的问题
P4: 本文方案
  -> 对应前文 gap 给出机制
P5: 贡献总结
```

---

## 五、复用注意事项

- 可复用到哪些论文场景：
- 不适合复用到哪些场景：
- 与当前项目科学问题的可能对应关系：
- 使用时需要替换的变量：

---

*最后更新：YYYY-MM-DD · 来源：Paper Title*
```

## 建议分类

长期积累时，可以按以下维度拆分文件：

- `connectives-and-transitions.md`：高质量逻辑衔接表达。
- `academic-collocations.md`：高质量学术搭配、程度词、评价词。
- `problem-critique-patterns.md`：现有方法不足、gap、limitation 的写法。
- `contribution-patterns.md`：贡献、novelty、method benefit 的写法。
- `intro-logic-patterns.md`：Introduction 段落推进逻辑。
- `source-[paper-short-name].md`：按单篇高质量参考论文总结。

这些文件名只是建议。实际记录时应优先保持结构清晰、来源明确、便于未来 agent 快速扫描和复用。

## 使用优先级

写作时，本目录只是辅助资源，优先级低于：

1. 用户当前要求。
2. 当前论文草稿和已确认事实。
3. 项目的科学问题、创新点和关键技术记忆。
4. 已阅读参考论文中的具体可验证材料。

如果积累中的表达与当前论文事实、用户意图或上下文逻辑冲突，必须放弃该表达。
