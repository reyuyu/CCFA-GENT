# Writing Introduction Skill

Skill ID: `writing-introduction-skill`

This skill guides WritingAgent when writing, revising, polishing, or restructuring the Introduction section of an English CCF-A / SCI paper.

## 1. Writing Principles

### 1.1 User-first principle

The user's requirements always have the highest priority as writing direction, task constraints, and scientific intent. However, manuscript prose should not be produced by simply translating the user's Chinese explanation into English.


### 1.2 Reference-imitation principle

For every sentence, the agent should consider whether useful writing material can be found from local reference papers. The goal is to minimize self-generated writing whenever reliable reference material is available.

Use reference papers to imitate academic writing logic, paragraph organization, motivation construction, and scientific framing.

When reliable source sentences or sentence groups are already suitable for the current manuscript, prefer preserving the original source wording exactly or with only minimal necessary adaptation. Do not rewrite source sentences merely for differentiation, paraphrasing, or "降重". Differentiation and substantial rewording are the user's responsibility unless the user explicitly asks the agent to do it.

If an original source sentence can be used as-is without breaking the current manuscript's terminology, logic, or claim scope, use it as-is. Unnecessary paraphrasing can lose the source's logical precision and must be avoided.

### 1.3 Minimal-change principle

When source material is available, the agent should reuse what can be reused and make only necessary modifications. Do not freely invent, over-expand, or substantially rewrite beyond the available material.

When revising existing draft content, preserve the user's original scientific intent, paragraph role, terminology, and useful wording whenever possible.

When adapting reference-paper material, preserve the source sentence's original logical relation, qualifier strength, and claim boundary. Only change terms or clauses required to fit the current paper. Do not weaken, strengthen, reorder, or paraphrase the sentence for style if the original sentence already works.

### 1.3.1 Source-material usage principle

When reliable reference-paper material is available, prioritize directly reusing sentence groups that can be used with minimal adaptation. Modify only the necessary parts, such as task-specific terms, method names, domain objects, logical dependencies, or concepts that do not fit the current manuscript.

Avoid constructing one paragraph by interleaving many disconnected fragments from multiple non-continuous source passages. If multiple source passages must be integrated, first study the original logical transitions carefully, then refine the draft's own logical transitions with equal care so that the resulting paragraph is coherent rather than stitched together.

### 1.3.2 Sufficient-source principle

Do not write Introduction content when there is insufficient source material. If the draft, local references, and user-provided project context do not provide enough support for the requested paragraph or claim, the agent must not fabricate or freely generate manuscript prose.

When source material is insufficient, the agent may call `retrieve_academic_papers` to search for potentially useful papers and candidate source material. Retrieval results are only recommendations and must be returned to the user for confirmation before being treated as writing material.

In this situation, clearly tell the user which specific material is insufficient, such as missing background support, missing evidence for a gap, missing concept-based method references, missing clinical task references, missing experiment evidence, or missing terminology grounding. Explain that writing cannot proceed reliably until the user confirms additional references or provides more source material.

### 1.3.3 Corpus reference principle details

1. Prefer copying complete usable sentence groups from source material. If a reference paper provides a complete and usable sentence group, direct reuse is the lowest-risk way to preserve the original logical structure. This is allowed. The user will perform personalization or differentiation when needed. Unless necessary, do not presumptuously modify the original sentence group.

2. When multiple reference sources are available, select the source material that best matches the current paper's need and length. Prefer the material that is most on-topic, requires the smallest changes, and has the logical structure that connects most naturally with the current manuscript.

3. Before using source material, check the original sentence group's surrounding context, setup, and logical connection. Do not directly move a sentence group into the manuscript if doing so would lose necessary context. If the moved material would create a logical gap, then modification is necessary; clearly tell the user why the modification is needed and what context or logical relation required the change.

4. Be cautious when cross-splicing material from multiple source passages. Avoid stitching together unrelated fragments. If cross-source or cross-passage splicing is necessary, explicitly handle the logical relation between the fragments so that the resulting paragraph is coherent rather than a surface-level collage.

### 1.4 Sentence-by-sentence writing principle

All Introduction writing must follow a sentence-by-sentence process. Each sentence should be carefully written, checked, and connected to the surrounding context.

### 1.4.1 Sentence-level transition principle

For every sentence or sentence group, the agent should consider whether a connective or transition expression is needed to make the logical relationship explicit. This includes, but is not limited to, concession, contrast, progression, cause, consequence, comparison, limitation, and emphasis transitions, such as `despite`, `however`, `nevertheless`, `therefore`, `in contrast`, or `in particular`.

If the current source-material sentence group already has complete and coherent transition wording, the agent should prioritize the source material and avoid adding unnecessary self-generated connectives. Connectives should improve local logic, not decorate the sentence.

### 1.5 Writing-accumulation principle

The skill folder contains a `写作积累` directory for reusable writing observations learned from reference papers. The agent may read and edit Markdown files in this directory with `list_writing_skill_files`, `read_writing_skill_file`, and `edit_writing_skill_file` to record strong academic expressions, especially connective expressions, degree adjectives, degree adverbs, other useful adjectives/adverbs, reusable academic sentence patterns, and Introduction-level writing logic.

These accumulated expressions are auxiliary writing resources. They can help when expression quality is weak, but they must never override the user's requirement, the current draft, verified project context, or reusable source material from reference papers.

### 1.6 Self-check principle

After completing the current writing task, the agent must perform a strict writing self-check.

### 1.7 Outline-first principle

Before writing, the agent must first clarify the paragraph-level outline of the Introduction. Each paragraph in the outline should be represented by one sentence describing what that paragraph should write.

Use `get_introduction_outline` to inspect the current Introduction outline. If no outline exists, or if the outline is inconsistent with the current task, use `edit_introduction_outline` to generate or update the structured paragraph-level outline so that it is visible to the frontend.

## 2. Workflow

For every Introduction writing or revision task, follow this workflow:

1. Determine the target writing unit.

   Identify whether the user is asking for the whole Introduction, a specific paragraph, a new paragraph, motivation, gap, related work, problem formulation, contribution framing, or polishing.

   Use `list_draft_sections`, `get_draft_section_content`, `list_draft_paragraphs`, `get_draft_paragraph_content`, and `get_draft_paragraph_status` as needed.

2. Determine the paragraph-level outline of the Introduction.

   Use `get_introduction_outline` to check whether an Introduction outline already exists.

   If no outline exists, first build a logical outline based on the current paper context, the current draft, and core reference papers. Then call `edit_introduction_outline` to save the outline.

   If an outline exists, follow it unless the user explicitly asks to adjust it or it clearly conflicts with the draft/project context. When updating it, call `edit_introduction_outline`.

3. Prioritize local reference papers.

   Use `list_reference_papers` to inspect reference metadata, prioritizing core references. Compare the reference papers with the outline requirements and determine whether the current writing content has reusable or adaptable material.

   When useful references exist, use `list_reference_sections` and `get_reference_section_content` to inspect relevant Introduction, Related Work, Method, or Experiment sections.

   When the agent reads reference papers to search for writing material, it may record valuable writing observations in Markdown files under `写作积累` with `edit_writing_skill_file`, especially strong connective expressions, degree adjectives, degree adverbs, other useful adjectives/adverbs, reusable academic sentence patterns, and Introduction writing logic. Record only reusable observations or short fragments; do not copy long passages.

4. Prepare the writing context.

   Collect the source material, current draft content, paragraph status, preceding writing context, established terminology, and user-provided information.

   Treat user-provided Chinese notes as directional guidance rather than direct manuscript material. Do not simply translate them into English. Use reference papers and existing draft context to formulate academic prose.

   Do not modify finalized or locked paragraphs unless the user explicitly allows it.

5. Start sentence-by-sentence writing.

   Follow the requirements in Section 3. Each sentence should be grounded in user information, draft context, references, or clearly marked cautious reasoning.

   During sentence-level writing, if the agent feels the expression is weak or the logical connection is underpowered, it may inspect Markdown files under `写作积累` with `list_writing_skill_files` and `read_writing_skill_file` to see whether any accumulated expression or sentence pattern can be adapted. This has ordinary priority only and must remain lower priority than source material, draft context, and user requirements.

6. Perform a self-check.

   After completing a paragraph or writing unit, perform the checks in Section 4.

7. Write the result into the manuscript when editing is requested.

   Use `edit_draft_section` for the whole Introduction, `edit_draft_paragraph_content` for one paragraph, and `edit_draft` only when full-draft replacement is truly necessary.

   Treat requests such as "complete the remaining part of paragraph 2", "finish P2", "continue this paragraph", "supplement this paragraph", "revise Introduction paragraph 2", or Chinese equivalents such as "完成第二段的剩下部分", "补充第 2 段", "续写 P2", and "修改 Introduction 第 2 段" as manuscript editing requests when the target draft paragraph can be located. In these cases, compose the complete replacement paragraph and call `edit_draft_paragraph_content` before the final answer.

   Do not return only a candidate paragraph when the user clearly asked to update an existing draft paragraph. The frontend can show "view changes / confirm apply" only when an edit tool has produced a `proposeFileChange` patch.

   Never claim the manuscript has been changed unless an edit tool has produced a valid patch.

8. Ask for clarification when necessary.

   If key information is uncertain, missing, or unsupported by the draft/references/project context, ask the user for clarification instead of inventing content.

## 3. Sentence-by-Sentence Writing Requirements

All Introduction writing must be performed sentence by sentence.

For each sentence, follow this process:

0. Judge whether there is source material that can be directly filled in, reused, or minimally adapted.

1. If source material exists, determine which parts need minor adjustment.

   The parts that need adjustment are usually words, terms, concepts, or logical dependencies that do not match the current paper, or concepts that have not been introduced in the current manuscript.

   If no such mismatch exists, keep the source sentence unchanged. Do not paraphrase for originality, variety, or lowering similarity unless the user explicitly requests that task.

2. If no reference-paper or draft source material exists, write cautiously from the current project context and user-provided information, but do not simply translate user Chinese notes. Ask for more reference material or clarification when academic formulation would otherwise be unsupported.

3. Ensure the sentence has a clear logical relationship with the previous sentence and prepares a logical connection to the next sentence.

4. Judge whether this sentence or sentence group needs an explicit connective expression. Consider the intended relation, such as concession, contrast, progression, cause, consequence, comparison, limitation, or emphasis. If the source sentence group already provides a complete transition, keep it rather than adding a new connective.

5. If the sentence's expression is weak and source material does not already solve the problem, optionally consult `写作积累` for reusable academic connectives, degree modifiers, adjective/adverb choices, sentence patterns, or Introduction logic patterns. Use this only as an auxiliary resource.

6. Keep terminology consistent with the title, draft, method names, problem names, datasets, metrics, and contribution keywords.

## 4. Self-Check Requirements

After completing a paragraph or a writing unit, perform the following checks:

### 4.1 Topic check

Check whether the paragraph matches the outline requirement and ensure that it does not deviate from the topic.

### 4.2 Logic check

Check whether the paragraph has strict logical coherence and whether there is a reasonable transition between sentences and between paragraphs.

Check whether each sentence or sentence group uses connective expressions appropriately: add a connective only when it clarifies the relationship, and remove or avoid one when the source material or surrounding prose already makes the transition clear.

### 4.3 Concept check

Check whether any concept appears without sufficient prior preparation, or whether any concept is abrupt, irrelevant, or disconnected from the writing flow.

### 4.4 Length check

Based on the reference papers, target venue/journal, current draft style, and the outline, check whether the length of the content is appropriate.

### 4.5 Reference-grounding check

Check whether too much of the writing lacks reference support. If a large amount of content is written without reference material, revise it to be more reference-grounded or ask the user for additional information.

### 4.6 Finalized-paragraph check

Check whether any finalized, final, or locked paragraph would be modified. If so, do not modify it unless the user explicitly authorizes the change.

## 5. Output Behavior

For manuscript prose, write in polished academic English.

For explanations to the user, reply in the user's language unless otherwise requested.

When multiple polishing options are useful, include the options in the user-facing response and clearly explain the difference between them.

Briefly explain what was revised or generated, which references or source materials were considered, whether the Introduction outline was used or updated, and whether finalized paragraphs were preserved.
