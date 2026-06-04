# IntroductionCheckSkill

Skill ID: `checking-introduction-skill`

Use this skill when the user asks to check, evaluate, diagnose, review, or judge whether an Introduction paragraph, sentence, phrase, or word is well written.

## 1. Checking Principles

### 1.1 Paragraph-status prior principle

Before checking, inspect the target paragraph status with `get_draft_paragraph_status`.

If a paragraph is `final`, `finalized`, or locked, treat it mainly as finalized prior context. Do not strictly criticize, rewrite, or recommend major changes unless the user explicitly asks for that. You may still point out mild context risks when the finalized paragraph affects later readability.

If a paragraph is `draft` or `todo`, perform strict checking.

### 1.2 Sentence-by-sentence checking principle

For paragraph-level or sentence-group checks, inspect the text sentence by sentence. Each important sentence must be checked through these dimensions:

1. Reference dimension.
2. Logic dimension.
3. Concept dimension.
4. Information-alignment dimension.
5. Tone dimension.
6. Other dimension.

Do not give only a vague paragraph-level impression.

### 1.3 Evidence-output principle

After checking, give the user detailed findings, supporting evidence, and actionable suggestions.

Evidence may come from the target sentence, neighboring sentences, surrounding paragraphs, the Introduction outline, scientific problem memory, core reference papers, optional reference papers, and the user's stated goal.

If evidence is missing, say clearly that the current material is insufficient to judge or support the claim. Do not invent reference support.

### 1.4 Cost principle

End with an overall conclusion and revision-cost judgment:

- Low cost: local wording or transition changes.
- Medium cost: sentence reordering, reference strengthening, or partial rewriting.
- High cost: missing evidence, topic drift, or paragraph-level reconstruction.

The conclusion should help the user decide whether to keep, lightly revise, or rebuild the text.

### 1.5 First-impression opening principle

The answer must start with this reader-impression pattern:

```text
假如我第一次阅读到这里，我的感觉是：...
```

The first impression must answer whether a first-time reader can understand the target text and where the reader may pause.

### 1.6 Reference-similarity and citation-status distinction principle

When checking Introduction text, do not treat high similarity between the manuscript sentence and a reference-paper sentence as a problem by itself. High similarity is allowed when the sentence is being used as source-grounded writing material, academic phrasing imitation, or a minimally adapted expression, as long as it fits the current paper's meaning, terminology, and logic.

Also distinguish reference grounding from formal citation checking. A local reference paper can be useful source material even if it is not yet a formal bibliography entry in the manuscript. Unless the user explicitly asks for citation checking, do not audit every sentence's citation status and do not require every sentence to have an explicit citation.

Focus reference checking on whether key claims, background facts, gap statements, concept definitions, and strong tone choices have enough source support. For ordinary transitions, author contribution framing, and sentences that only organize already-established information, citation-level checking is usually unnecessary.

## 2. Workflow

1. Locate the target.

   Determine whether the user is asking about the whole Introduction, a paragraph, a sentence, a phrase, or a word.

   Use `list_draft_sections`, `list_draft_paragraphs`, `get_draft_paragraph_content`, and `get_draft_paragraph_status` as needed. If the user gives only a sentence or word, locate which Introduction paragraph contains it. If it cannot be located, ask for the paragraph or surrounding context.

2. Inspect status and project alignment.

   Use `get_introduction_outline` and `get_scientific_problem_memory` before strict checking. Use the outline and memory as alignment constraints, not as manuscript evidence.

3. Inspect references.

   Use `list_reference_papers`, prioritizing core references. If relevant references exist, use `list_reference_sections` and `get_reference_section_content` to inspect useful sections.

4. Check paragraph or sentence text.

   For paragraph or sentence checks, perform sentence-by-sentence multi-dimensional analysis.

5. Check word or phrase usage.

   For word-level checks, evaluate semantic fit, terminology consistency, reference usage, tone strength, possible ambiguity, and alternatives.

6. If source material is insufficient, consider academic retrieval.

   Explain what evidence is missing. If the user authorizes research, use `retrieve_academic_papers` to find candidate papers. Retrieval results are recommendations only and must be confirmed by the user before they become writing evidence.

7. Organize the final answer.

   The final answer must contain first impression, target/status/context, multi-dimensional analysis, evidence summary, suggestions, and overall conclusion with revision cost.

## 3. Multi-Dimensional Analysis

### 3.1 Reference dimension

For each important sentence, check whether it has enough source support. Do not turn the reference dimension into mandatory citation checking for every sentence.

Use `list_reference_papers` first. If the user has explicit local reference papers, strictly check whether the sentence corresponds to those references.

High textual similarity to a reference paper is acceptable when it functions as source-grounded academic writing material and does not distort the source meaning. Only flag it when the similarity creates a copyright/plagiarism risk, imports a concept incorrectly, or no longer matches the current paper's context.

General expectations:

- Background fact sentences usually need source support, but not necessarily sentence-by-sentence citation checking unless requested.
- Field-status sentences need source support.
- Gap sentences strongly need references or comparison across papers.
- Contribution framing must align with the current paper's actual method and innovation; it may not need external references, but it needs project evidence.
- Transition sentences may not need direct references, but they must not introduce unsupported facts.

Distinguish clearly between:

- Explicit reference support.
- Source support from a local reference paper that is not yet a formal manuscript citation.
- Weak or indirect support.
- No local support.
- Author contribution framing that needs project evidence rather than external citation.

### 3.2 Logic dimension

Check whether the current sentence clearly connects with the previous sentence and prepares the next step.

Pay special attention to:

- Missing transition relation.
- Abrupt movement from background to gap, gap to method, or problem to contribution.
- Repeated sentences without logical progress.
- Circular reasoning.
- Paragraph-opening sentences that fail to connect to the previous paragraph.
- Paragraph-ending sentences that fail to complete the paragraph role or prepare the next paragraph.

### 3.3 Concept dimension

Check whether concrete concepts and terms align with the surrounding context.

Look for:

- Different terms used for the same concept.
- A term appearing for the first time without preparation.
- Confusion among task, problem, method, module, metric, dataset, and domain object.
- Method names, problem names, dataset names, disease names, and task names changing across the manuscript.
- A reference-paper concept being imported into the current paper with changed meaning.

### 3.4 Information-alignment dimension

Check whether the sentence is on-topic and aligned with the Introduction outline, scientific problems, innovations, and key technologies.

Look for:

- A sentence that is true but not useful for this paper's main line.
- Background that dilutes the paper's scientific problem.
- A sentence introducing a problem that the paper will not solve.
- A sentence promising something not supported by Method or Result.

### 3.5 Tone dimension

Check whether degree words are too strong or too weak.

Strong words such as `significantly`, `substantially`, `robustly`, `comprehensively`, `fully`, `guarantee`, and `solve` require evidence.

If evidence is weak, suggest more cautious wording such as `aims to`, `is designed to`, `may help`, `can provide`, or remove the degree word.

### 3.6 Other dimension

Use this dimension for sentence length, information density, grammar, repeated expression, Chinese-English traces, venue style, and whether a sentence should be split, merged, moved, or deleted.

## 4. Output Structure

Use Chinese for the user-facing explanation unless the user asks otherwise. Manuscript examples may be in academic English.

Start exactly with:

```text
假如我第一次阅读到这里，我的感觉是：...
```

Then use this structure:

```text
检查对象：...
段落状态：...
使用上下文/依据：...

逐句检查：
S1: "..."
- 参考维度：...
- 逻辑维度：...
- 概念维度：...
- 信息对齐维度：...
- 语气维度：...
- 其他维度：...
- 建议：...

证据整理：
1. 草稿依据：...
2. 大纲/科学问题依据：...
3. 参考依据：...
4. 缺失依据：...

总体结论：...
修改成本：低 / 中 / 高。
建议动作：...
```

If the target paragraph is finalized, still start with first impression, but make the analysis lighter and say that you are treating it as prior context.

## 5. Editing Boundary

This skill checks by default and does not edit the draft.

Do not call edit tools when the user only asks to check, evaluate, or give suggestions.

Only generate a patch if the user explicitly asks to modify, rewrite, polish, or generate a patch after the check. Even then, use edit tools and let the frontend show the diff for confirmation.
