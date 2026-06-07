# Writing Abstract Skill

Skill ID: `writing-abstract-skill`

This skill guides WritingAgent when writing, revising, shortening, strengthening, or restructuring the Abstract section of an English CCF-A / SCI paper.

The Abstract should be treated as a compressed version of the paper's scientific story, not as a loose summary. It must connect the problem, gap, method, evidence, and contribution in a coherent chain.

## 1. Writing Principles

### 1.1 User-first principle

The user's requirements always have the highest priority as writing direction, task constraints, and scientific intent. However, manuscript prose should not be produced by simply translating the user's Chinese explanation into English.

Use the user's notes to clarify what the paper is about, what must be emphasized, and what constraints exist. Use the draft, references, and project memory to form academic English prose.

### 1.2 Manuscript-grounding principle

Every Abstract sentence must be grounded in the current manuscript, project memory, local references, or user-confirmed evidence.

Do not introduce new claims, new method components, new datasets, new metrics, new baselines, or new implications that do not appear elsewhere in the project context.

If the manuscript lacks result evidence, write cautiously or ask for the missing experimental summary instead of inventing a performance sentence.

### 1.3 Problem-method-result chain principle

The Abstract must preserve a clear chain:

1. What problem or limitation motivates the paper.
2. What gap remains unresolved.
3. What method or idea the paper proposes.
4. What evidence supports the method.
5. What contribution or implication follows from the evidence.

Avoid writing a list of disconnected sentences. Each sentence should make the next sentence necessary.

### 1.4 Compression principle

The Abstract should be concise and information-dense. Compress by removing secondary background, excessive implementation detail, repeated motivation, and unsupported impact language.

Do not compress by deleting the central problem-method-result logic.

### 1.5 Reference-imitation principle

Use local reference papers to imitate Abstract-level organization, sentence rhythm, claim strength, and result reporting style.

When a reference paper provides a strong Abstract pattern that fits the current manuscript, use it as a structural model. Do not copy irrelevant claims or import a reference paper's method details into the current paper.

### 1.6 Minimal-change principle

When revising an existing Abstract, preserve the user's scientific intent, established terminology, useful wording, and claim boundaries whenever possible.

Do not rewrite the whole Abstract only for style if local sentence-level revision can solve the problem.

### 1.7 Evidence-strength principle

The strength of each Abstract claim must match the available evidence.

Avoid strong expressions such as `significantly`, `substantially`, `comprehensively`, `robustly`, `state-of-the-art`, `superior`, or `generalizable` unless the current manuscript provides direct support.

When evidence is partial, prefer cautious expressions such as `aims to`, `is designed to`, `demonstrates the potential of`, `shows improved`, or `provides empirical evidence that`.

### 1.8 Self-check principle

After completing the Abstract, perform a strict self-check for structure, evidence, terminology, length, and claim strength.

## 2. Workflow

For every Abstract writing or revision task, follow this workflow:

1. Determine the target writing unit.

   Identify whether the user is asking for a full Abstract, a shortened version, a stronger version, a revision of an existing Abstract, a structured outline, or several candidate variants.

   Use `list_draft_sections`, `get_draft_section_content`, `list_draft_paragraphs`, `get_draft_paragraph_content`, and `get_draft_paragraph_status` as needed.

2. Inspect project-level scientific context.

   Use `get_scientific_problem_memory` to inspect scientific problems, innovations, and key technologies. Use this memory as alignment context, not as automatic manuscript evidence.

   If the Abstract depends on the Introduction's problem construction, use `get_introduction_outline` and relevant Introduction paragraphs to understand the problem-gap logic.

3. Inspect manuscript sections.

   Read the current Abstract if it exists.

   Inspect relevant Introduction, Method, and Result/Experiment sections. The Abstract should not be written only from the Abstract itself unless the user explicitly asks for surface polishing.

4. Prioritize local references.

   Use `list_reference_papers` to inspect reference metadata, prioritizing core references.

   When useful references exist, use `list_reference_sections` and `get_reference_section_content` to inspect Abstract, Introduction, Method, and Experiment sections that can guide abstract structure, claim strength, and result reporting.

5. Build the Abstract logic before writing.

   Before composing prose, identify the planned sentence roles. A typical CCF-A / SCI Abstract may include:

   - S1: broad background or task importance.
   - S2: unresolved limitation or scientific gap.
   - S3: proposed method or central idea.
   - S4: key technical mechanism or design rationale.
   - S5: main experimental evidence.
   - S6: contribution, implication, or final conclusion.

   This structure is flexible. Use fewer or more sentences when the target venue, manuscript style, or user request requires it.

6. Write sentence by sentence.

   For each sentence, decide which manuscript evidence supports it. Keep terminology consistent with the title, Introduction, Method, Result sections, datasets, metrics, and contribution keywords.

7. Perform a self-check.

   Use the checks in Section 4 before returning or patching the Abstract.

8. Write the result into the manuscript when editing is requested.

   Use `edit_draft_section` for replacing the Abstract section, `edit_draft_paragraph_content` for one Abstract paragraph, and `edit_draft` only when full-draft replacement is truly necessary.

   Do not return only a candidate Abstract when the user clearly asked to update the manuscript. The frontend can show a diff only when an edit tool produces a `proposeFileChange` patch.

   Never claim the manuscript has been changed unless an edit tool has produced a valid patch.

9. Ask for clarification when necessary.

   If the project lacks key information such as main result numbers, datasets, metrics, baselines, or method details, ask the user for the missing information instead of fabricating Abstract prose.

## 3. Sentence-by-Sentence Writing Requirements

For each Abstract sentence:

1. Identify its role in the problem-method-result chain.

2. Check whether it is supported by draft content, project memory, references, or user-confirmed information.

3. Use reference-paper Abstracts as style and structure models when appropriate.

4. Keep the sentence compact. Remove secondary clauses that belong in Introduction, Method, or Result sections.

5. Avoid citation markers unless the target venue or current manuscript style requires them.

6. Avoid vague impact claims. State the concrete contribution or evidence whenever possible.

7. Ensure the sentence logically connects to the previous and next sentence.

## 4. Self-Check Requirements

### 4.1 Structure check

Check whether the Abstract contains a clear problem, gap, method, evidence, and contribution chain.

### 4.2 Evidence check

Check whether every result and contribution claim is supported by the manuscript. If evidence is missing, mark the missing information clearly.

### 4.3 Terminology check

Check whether terms match the title, scientific problem memory, Introduction, Method, Result sections, datasets, metrics, and method/module names.

### 4.4 Length check

Check whether the Abstract length is suitable for the target venue or journal if known. If no target length is provided, prefer a concise single paragraph suitable for a standard CCF-A / SCI manuscript.

### 4.5 Tone check

Check whether any word overstates novelty, performance, generality, clinical value, robustness, or significance.

### 4.6 Section-boundary check

Check whether the Abstract includes excessive implementation detail, literature review, ablation interpretation, or discussion content that belongs elsewhere.

### 4.7 Finalized-paragraph check

Check whether any finalized, final, or locked paragraph would be modified. If so, do not modify it unless the user explicitly authorizes the change.

## 5. Output Behavior

For manuscript prose, write in polished academic English.

For explanations to the user, reply in the user's language unless otherwise requested.

When useful, provide multiple Abstract variants with clear differences, such as concise, method-focused, result-focused, or conservative versions.

Briefly explain what was generated or revised, what manuscript evidence was used, what result information was missing if any, and whether a manuscript patch was produced.
