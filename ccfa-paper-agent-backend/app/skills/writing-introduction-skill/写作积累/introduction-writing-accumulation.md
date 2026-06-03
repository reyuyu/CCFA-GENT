# Introduction 写作积累

> 来源：Bie et al. (2024) MICA — AAAI. 医学影像 + 可解释 AI + 概念对齐.

---

## 一、逻辑衔接词/短句

### 转折

| 表达 | 典型位置 |
|---|---|
| *Despite..., ...* | 段首 / 句首 |
| *However, ...* | 段首 / 句首 |
| *..., yet ...* | 句中 |
| *Although..., ...* | 句首 |
| *Nevertheless, ...* | 段首 |
| *In contrast, ...* | 段首 |
| *On the contrary, ...* | 段首 |
| *..., but ...* | 句中 |
| *Conversely, ...* | 段首 |

### 因果

| 表达 | 典型位置 |
|---|---|
| *..., leading to...* | 句中/句尾 |
| *Thus, ...* | 段首 |
| *Therefore, ...* | 段首 |
| *This is caused by...* | 句首 |
| *As a result, ...* | 段首 |
| *Consequently, ...* | 段首 |
| *..., which necessitates...* | 句中 |
| *..., making...* | 句中 |

### 递进 / 补充

| 表达 | 典型位置 |
|---|---|
| *In particular, ...* | 段首 |
| *Specifically, ...* | 段首 |
| *Furthermore, ...* | 段首 |
| *Moreover, ...* | 段首 |
| *Notably, ...* | 段首 |
| *Beyond that, ...* | 段首 |
| *Additionally, ...* | 段首 |
| *In addition, ...* | 段首 |

### 让步

| 表达 | 典型位置 |
|---|---|
| *While..., ...* | 句首 |
| *Despite..., ...* | 句首 |
| *Even though..., ...* | 句首 |
| *Notwithstanding..., ...* | 句首 |
| *..., though ...* | 句中/句尾 |

### 对比 / 并列

| 表达 | 典型位置 |
|---|---|
| *...while others...* | 句中 |
| *On one hand...on the other hand...* | 段首 |
| *Rather than..., ...* | 句首 |
| *Instead, ...* | 句首 |
| *..., whereas ...* | 句中 |

### 强调

| 表达 | 典型位置 |
|---|---|
| *In fact, ...* | 段首 |
| *Indeed, ...* | 段首 |
| *It is noteworthy that...* | 句首 |
| *Crucially, ...* | 段首 |
| *Above all, ...* | 段首 |

### 引出 / 过渡

| 表达 | 典型位置 |
|---|---|
| *To this end, ...* | 段首 |
| *In this regard, ...* | 段首 |
| *To address this, ...* | 段首 |
| *A major challenge is that...* | 句首 |
| *Within X, several approaches have been proposed...* | 段首 |
| *With a particular emphasis placed on...* | 句中/句尾 |

### 总结 / 收束

| 表达 | 典型位置 |
|---|---|
| *In summary, ...* | 段首 |
| *Overall, ...* | 段首 |
| *Taken together, ...* | 段首 |
| *Collectively, ...* | 段首 |
| *In essence, ...* | 段首 |

---

## 二、高分词汇

### 程度强化

| 词 | 搭配示例 |
|---|---|
| **significant** | ~ potential / performance / improvements |
| **considerable** | ~ scrutiny / attention / challenges |
| **rigorous** / **stringent** | ~ demands / requirements / evaluation |
| **superior** | ~ performance / quality / efficiency |
| **substantially** | ~ improve / outperform / reduce |
| **highly** | ~ effective / sensitive / competitive |

### 精确描述

| 词 | 搭配示例 |
|---|---|
| **meticulously** | ~ align / design / curated |
| **nuanced** | ~ semantic relationships / differences / patterns |
| **inherently** | ~ interpretable / ambiguous / limited |
| **semantically** | ~ align / correspond / relate |
| **holistically** | ~ capture / model / consider |
| **concurrently** | ~ perform X and Y / achieve X while Y |

### 问题批判

| 词 | 搭配示例 |
|---|---|
| **under scrutiny** | *...has been under considerable scrutiny* |
| **misleading** | *...making the explanations misleading* |
| **not devoid of** | *...are not devoid of limitations* |
| **fall short in** | *...fall short in balancing X and Y* |
| **sacrificed** | *performance is sacrificed when...* |
| **neglecting** | *...neglecting the nuanced relationships between...* |

### 贡献强调

| 词 | 搭配示例 |
|---|---|
| **the first to** | *We are the first to...* |
| **encompassing** | *...at multiple levels, encompassing X, Y, and Z* |
| **makes full use of** | *...makes full use of...through...* |
| **while preserving** | *...while preserving interpretability, attains high...* |
| **benefiting from** | *...benefiting from the high-quality...learned within...* |

### 方法标签

`inherently interpretable` · `concept-aware` · `concept-based` · `multi-level` · `multi-modal` · `ante-hoc` · `human-understandable` · `high-stakes`

---

## 三、段落句式骨架

**P1 — 背景 + 矛盾**
> *"[DL methods] have surfaced as powerful instruments in [lung cancer diagnosis], offering significant potential to revolutionize [radiological diagnostics]. Despite the encouraging performance, their end-to-end prediction nature leads to a lack of transparency, raising critical issues of trust and interpretability in high-stakes domains like healthcare."*

**P2 — 现有方案 + 批判**
> *"The healthcare field, with its rigorous demands for trustworthiness, requires models that are both accurate and understandable, which necessitates research into Explainable AI. Within XAI, post-hoc approaches [列举] have been proposed, but their reliability remains under considerable scrutiny — studies show they yield inconsistent results across runs and are sensitive to input perturbations, making them potentially misleading."*

**P3 — 转向概念方法**
> *"Thus, ante-hoc explainable methods have garnered researchers' interest, with a particular emphasis placed on concept-based approaches. These methods integrate interpretability into the model by linking predictions to human-understandable concepts, offering explanations that are generally more trustworthy than post-hoc alternatives."*

**P4 — 指出 Gap**
> *"However, concept-based methods are not devoid of limitations. [描述 Gap 1, 2, 3]. We argue this is caused by [根因]. This narrow focus limits both performance and interpretability, leading to [后果]."*

**P5 — 提出方案**
> *"To address the mentioned challenges, we introduce [FGCA], a framework that meticulously aligns [CT images] and [radiological concepts] semantically at [描述架构]. Specifically, [三个目标]. In this manner, our method makes full use of [concept-level supervision] and achieves better [alignment quality and diagnostic accuracy]."*

**P6 — 贡献列表**
> *"We summarize our main contributions as follows: (1) We propose FGCA, a ... (2) To the best of our knowledge, we are the first to ... (3) As an inherently interpretable framework, FGCA is capable of ... while ... (4) Experiments on ... demonstrate superior performance, benefiting from ..."*

---

## 四、6 段推进逻辑（速查）

```
P1: 大背景 + 黑箱矛盾
  ↓  "Despite...raising critical issues of..."
P2: XAI 方案分类 + 后验方法的不可靠
  ↓  "However, the reliability...has been under scrutiny"
P3: 转向先天概念方法（正面）
  ↓  "Thus...with a particular emphasis placed on..."
P4: 概念方法的 Gap（三个问题）
  ↓  "However...are not devoid of limitations → We argue..."
P5: 我们的方案 FGCA
  ↓  "To address the mentioned challenges, we introduce..."
P6: 贡献总结
```

---

*最后更新: 2026-06-03 · 来源: MICA (AAAI 2024)*
