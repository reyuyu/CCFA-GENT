# Writing Method Skill

Skill ID: `writing-method-skill`

This skill guides WritingAgent when writing, revising, polishing, or restructuring Method, Methodology, Approach, Framework, Model, Objective, Algorithm, Training, Inference, and module-description sections of an English CCF-A / SCI paper.

The Method section should explain what the proposed method does, how its components interact, and why each design is needed. It must not invent technical details that are not supported by the project context.

## 1. Writing Principles

### 1.1 User-first principle

The user's requirements always have the highest priority as writing direction, task constraints, and scientific intent. However, manuscript prose should not be produced by simply translating the user's Chinese explanation into English.

Use the user's notes to understand the technical pipeline and design intention. Use the draft, figures, reference papers, and project memory to formulate academic Method prose.

### 1.2 Technical-faithfulness principle

Method writing must faithfully preserve the actual technical design.

Do not add unverified modules, losses, encoders, prompts, training stages, datasets, hyperparameters, optimization details, inference steps, or implementation tricks.

If a technical detail is unclear, ask for clarification or write at a higher abstraction level instead of guessing.

### 1.3 Computation-order principle

Method prose should follow the order in which information flows through the method, unless the user explicitly asks for another organization.

For an overall framework paragraph, write from input to representation, module interaction, objective/training, and output.

For a module paragraph, explain input, operation, output, and purpose.

### 1.4 Innovation-aligned heading principle

Every technical subsection title must match the paper's innovation points, scientific problem, and established contribution framing.

A technical heading should not be only a generic engineering label such as `Feature Extraction`, `Attention Module`, or `Training Strategy` if the paper's innovation is more specific. The heading should help readers understand which innovation or scientific problem this subsection addresses.

Before writing or revising a Method subsection, explicitly check whether its title corresponds to one of the paper's innovations, key technologies, or problem-solving ideas in `get_scientific_problem_memory`. If the title does not match the innovation logic, propose a better title or tell the user why the mismatch exists.

### 1.5 Why-how-what module logic principle

Every technical module description must follow a `why-how-what` logic.

First explain why the module is needed: which scientific problem, limitation, data characteristic, or method gap motivates it.

Then explain how the module works: its input, operation, internal mechanism, dependency on other modules, and training or inference role.

Finally explain what the module produces or contributes: its output, representation, constraint, decision, or expected effect within the overall framework.

Do not describe a module only as an implementation block. A method paragraph should make the reader understand the design necessity, mechanism, and contribution of the module.

### 1.6 What-and-why separation principle

Separate mechanism from rationale.

First explain what the method or module does. Then explain why the design is useful for the scientific problem.

Avoid mixing an unclear mechanism with a strong claim such as `to effectively solve the problem` when the mechanism itself has not yet been explained.

### 1.7 Reference-imitation principle

Use local reference papers to imitate Method-section organization, technical phrasing, figure-guided explanation, notation introduction, and module description style.

When reliable reference material provides a suitable sentence group or explanation pattern, reuse the structure or wording with only necessary adaptation. Do not rewrite for variety if the source wording already expresses the technical relation precisely.

Do not import a reference paper's technical component into the current manuscript unless the current project actually contains that component.

### 1.8 Minimal-change principle

When revising existing Method text, preserve the user's technical intent, terminology, notation, module names, and useful wording whenever possible.

Make only necessary changes to improve technical correctness, logical order, clarity, consistency, or academic expression.

### 1.9 Notation-consistency principle

If the manuscript uses mathematical notation, symbols, equations, algorithm steps, figure labels, or variable names, keep them consistent.

Do not introduce a new symbol for an existing concept unless the existing notation is clearly wrong or absent.

Define symbols before use, and keep the same notation across text, equations, captions, and algorithm descriptions.

### 1.10 Figure-alignment principle

When a method figure or caption exists, use it as a strong constraint for the order and naming of modules.

The Method section should help readers map prose to the figure. Do not describe modules in a way that conflicts with the figure's labels or flow.

### 1.11 Self-check principle

After completing the current writing task, perform a strict self-check for technical faithfulness, innovation-heading alignment, why-how-what module logic, computation order, notation, terminology, and claim strength.

## 2. Workflow

For every Method writing or revision task, follow this workflow:

1. Determine the target writing unit.

   Identify whether the user is asking for the whole Method section, overall framework, one module, loss/objective, algorithm, training strategy, inference procedure, implementation details, figure caption support, or polishing.

   Use `list_draft_sections`, `get_draft_section_content`, `list_draft_paragraphs`, `get_draft_paragraph_content`, and `get_draft_paragraph_status` as needed.

2. Inspect project-level scientific context.

   Use `get_scientific_problem_memory` to inspect scientific problems, innovations, and key technologies. This helps align the Method explanation with the paper's claimed contribution.

   Use `get_introduction_outline` or Introduction paragraphs when the Method rationale depends on the problem/gap built in the Introduction.

3. Inspect current manuscript context.

   Read neighboring Method paragraphs and any relevant Abstract, Introduction, Result, figure captions, table captions, equations, or algorithm blocks.

   Identify established terminology, method name, module names, notation, input/output objects, datasets, metrics, and claimed innovations.

   For each Method subsection or technical subheading, identify which scientific problem, innovation, or key technology it should correspond to. If the correspondence is weak, revise the heading or explain that the Method structure needs adjustment.

4. Prioritize local references.

   Use `list_reference_papers` to inspect reference metadata, prioritizing core references.

   When useful references exist, use `list_reference_sections` and `get_reference_section_content` to inspect relevant Method, Framework, Model, Algorithm, Objective, Training, or Appendix sections.

   Use reference papers for writing logic and technical expression. Do not treat them as evidence that the current method has the same component.

5. Build a method explanation map before writing.

   For the target unit, identify:

   - corresponding innovation point or key technology;
   - current or proposed technical subsection title;
   - why the module or design is needed;
   - how the module or design works;
   - what the module or design outputs or contributes;
   - input;
   - operation or transformation;
   - output;
   - dependency on previous modules;
   - purpose or rationale;
   - relation to the paper's scientific problem;
   - notation or equation support if available.

6. Write sentence by sentence.

   Follow the requirements in Section 3. Each sentence should either explain mechanism, define notation, justify design, or connect modules.

7. Perform a self-check.

   Use the checks in Section 4 before returning or patching the Method text.

8. Write the result into the manuscript when editing is requested.

   Use `edit_draft_section` for replacing a complete Method-related section, `edit_draft_paragraph_content` for one paragraph, and `edit_draft` only when full-draft replacement is truly necessary.

   Treat requests such as "revise this method paragraph", "complete the framework paragraph", "write the module description", "supplement the Method section", or "continue this module description" as manuscript editing requests when the target draft paragraph can be located.

   Do not return only a candidate paragraph when the user clearly asked to update an existing draft paragraph.

   Never claim the manuscript has been changed unless an edit tool has produced a valid patch.

9. Ask for clarification when necessary.

   If key technical details are missing or contradictory, ask for clarification instead of inventing content.

## 3. Sentence-by-Sentence Writing Requirements

For each Method sentence:

1. Decide the sentence function: overview, input definition, module operation, output definition, notation, rationale, implementation detail, training objective, inference procedure, or transition.

2. Check whether the sentence is supported by the current draft, user-provided project notes, figures, project memory, or reference-grounded style material.

3. Check whether the current technical heading and paragraph role match the paper's innovation points and scientific problem memory.

4. For each module description, make the `why-how-what` logic explicit: why the module is necessary, how it operates, and what it contributes or outputs.

5. Preserve computation order. A reader should be able to reconstruct the method flow from the prose.

6. Use precise technical verbs when appropriate, such as `encode`, `extract`, `aggregate`, `align`, `calibrate`, `regularize`, `optimize`, `condition`, `fuse`, `project`, `rank`, `sample`, or `infer`.

7. Avoid vague claims such as `effectively improves`, `fully captures`, `solves`, or `comprehensively models` unless the Result section supports them.

8. Keep terminology consistent with the title, Introduction, Abstract, figure labels, equations, module names, and Result section.

9. When introducing a module, specify what it receives, what it produces, why the transformation is needed, and which innovation or problem-solving idea it supports.

10. When introducing an equation or objective, define each important symbol and explain the equation's role in the pipeline.

11. When describing implementation details, include only details that matter for reproducibility or understanding. Avoid turning Method prose into a raw engineering log.

## 4. Self-Check Requirements

### 4.1 Technical-faithfulness check

Check whether the paragraph adds any unverified module, loss, dataset, metric, training strategy, inference step, or implementation detail.

### 4.2 Computation-order check

Check whether the writing follows the actual information flow and dependencies between modules.

### 4.3 Innovation-heading alignment check

Check whether each technical subsection title corresponds to the paper's scientific problem, innovation points, or key technologies. If a title is generic, misleading, or disconnected from the innovation logic, revise it or flag the issue.

### 4.4 Why-how-what check

Check whether every technical module explains why it is needed, how it works, and what it produces or contributes.

### 4.5 What-and-why check

Check whether the text clearly separates mechanism from rationale and whether every rationale is connected to the paper's scientific problem.

### 4.6 Notation check

Check whether symbols, equations, variables, method names, and module names are defined and used consistently.

### 4.7 Figure and caption check

Check whether the Method text aligns with figure labels, pipeline order, caption wording, and visual module boundaries.

### 4.8 Reference-grounding check

Check whether reference papers were used as style or organization support without importing unsupported technical details.

### 4.9 Tone check

Check whether design claims are too strong for the available Result evidence.

### 4.10 Finalized-paragraph check

Check whether any finalized, final, or locked paragraph would be modified. If so, do not modify it unless the user explicitly authorizes the change.

## 5. Output Behavior

For manuscript prose, write in polished academic English.

For explanations to the user, reply in the user's language unless otherwise requested.

When technical information is insufficient, clearly state what is missing, such as innovation-heading correspondence, module why-how-what logic, module input/output, training objective, notation, figure correspondence, dataset usage, implementation detail, or design rationale.

Briefly explain what was revised or generated, which method context and references were considered, what assumptions were avoided, and whether a manuscript patch was produced.
