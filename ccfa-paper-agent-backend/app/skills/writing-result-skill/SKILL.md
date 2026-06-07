# Writing Result Skill

Skill ID: `writing-result-skill`

This skill guides WritingAgent when writing, revising, polishing, or restructuring Experiments, Results, Experimental Setup, Main Comparison, Ablation Study, Analysis, Discussion, Robustness, Generalization, Qualitative Results, Limitations, and related empirical sections of an English CCF-A / SCI paper.

The Result section should convert experimental evidence into careful scientific interpretation. It must report what is observed, explain why the observation matters, and connect the evidence back to the method's design and the paper's claims.

## 1. Writing Principles

### 1.1 User-first principle

The user's requirements always have the highest priority as writing direction, task constraints, and scientific intent. However, manuscript prose should not be produced by simply translating the user's Chinese explanation into English.

Use the user's notes to understand the intended empirical message. Use tables, figures, draft text, references, and project memory to form evidence-grounded academic prose.

### 1.2 Evidence-grounding principle

Every performance claim, comparison claim, ablation claim, robustness claim, limitation claim, and discussion implication must be grounded in available evidence.

Evidence may come from draft result text, tables, figures, captions, user-provided result summaries, experimental settings, or local reference papers that define evaluation protocols.

Do not invent numbers, baselines, datasets, metrics, statistical significance, rankings, qualitative observations, or failure cases.

### 1.3 Observation-interpretation-implication principle

Separate three layers:

1. Observation: what the table, figure, or experiment shows.
2. Interpretation: what the pattern suggests about the method.
3. Implication: how the pattern supports the paper's scientific problem, method design, or limitation.

Do not jump directly from a number to a broad conclusion without an explicit interpretation step.

### 1.4 Metric-direction principle

Always check whether each metric is higher-is-better or lower-is-better before writing improvement claims.

Do not say a method improves a metric if the direction is unclear. If the metric direction cannot be determined from context, ask for clarification or avoid directional wording.

### 1.5 Claim-strength principle

The strength of empirical wording must match the evidence.

Avoid `state-of-the-art`, `significantly`, `substantially`, `consistently`, `robustly`, `generalizes`, or `outperforms all baselines` unless the available results directly support that exact claim.

When evidence is limited, use cautious wording such as `suggests`, `indicates`, `shows a favorable trend`, `provides evidence for`, or `is consistent with`.

### 1.6 Reference-imitation principle

Use local reference papers to imitate experiment-section organization, result-reporting style, ablation discussion, protocol description, and cautious interpretation.

When reliable reference material provides a suitable sentence group or comparison pattern, reuse the structure or wording with necessary adaptation.

Do not copy a reference paper's empirical claim, dataset, baseline, or result unless it belongs to the current manuscript.

### 1.7 Minimal-change principle

When revising existing Result text, preserve the user's intended interpretation, established terminology, dataset names, metric names, baseline names, table/figure references, and useful wording whenever possible.

Make only necessary changes to improve evidence accuracy, logical order, claim strength, and academic expression.

### 1.8 Method-linking principle

Result interpretation should connect empirical patterns to the method's design assumptions.

For ablation studies, explicitly connect each removed or changed component to its intended design role.

For qualitative or robustness analysis, explain what the example or pattern reveals about the method's behavior, while avoiding unsupported generalization.

### 1.9 Experiment-conclusion principle

Every experiment must have a clear conclusion.

Do not write an experiment paragraph that only lists settings, numbers, or comparisons. After reporting the observation, state the conclusion that the experiment supports.

The conclusion may be conservative, but it must answer what the experiment proves, supports, weakens, or reveals about the paper's method, scientific problem, or design assumption.

### 1.10 Academic-thought alignment principle

Every experimental conclusion must match the paper's own academic thought.

Here, academic thought means the paper's scientific problem construction, core innovation, method design logic, key technologies, and claimed contribution. Use `get_scientific_problem_memory`, Introduction context, and Method context to identify it.

Do not interpret an experiment in a direction that is merely numerically attractive but disconnected from the paper's intended scientific story. The Result section should make the reader feel that the experiments are validating the paper's own ideas, not just filling a benchmark checklist.

### 1.11 Self-check principle

After completing the current writing task, perform a strict self-check for evidence, experiment conclusions, academic-thought alignment, metric direction, claim strength, terminology, and table/figure alignment.

## 2. Workflow

For every Result writing or revision task, follow this workflow:

1. Determine the target writing unit.

   Identify whether the user is asking for experimental setup, dataset/protocol description, main comparison, ablation study, hyperparameter analysis, robustness analysis, qualitative analysis, discussion, limitation, or polishing.

   Use `list_draft_sections`, `get_draft_section_content`, `list_draft_paragraphs`, `get_draft_paragraph_content`, and `get_draft_paragraph_status` as needed.

2. Inspect project-level scientific context.

   Use `get_scientific_problem_memory` to inspect scientific problems, innovations, and key technologies. Use this to connect results to the method's intended contribution.

   Inspect Method and Introduction context when the result interpretation depends on a module, design motivation, or scientific gap.

   Before writing experiment conclusions, identify the paper's academic thought: what scientific problem the paper claims to address, what innovation it proposes, and what method design logic the experiments should validate.

3. Inspect current manuscript evidence.

   Read relevant Result/Experiment paragraphs, tables, figures, captions, neighboring paragraphs, and any available result summaries.

   Identify datasets, metrics, baselines, model variants, experimental settings, table/figure numbers, and metric directions.

4. Prioritize local references.

   Use `list_reference_papers` to inspect reference metadata, prioritizing core references.

   When useful references exist, use `list_reference_sections` and `get_reference_section_content` to inspect Experiment, Result, Evaluation, Ablation, Discussion, or Appendix sections.

   Use references to understand protocol wording, baseline framing, metric interpretation, and result-discussion style.

5. Build an evidence map before writing.

   For the target paragraph, identify:

   - evidence source: table, figure, caption, draft text, user summary, or reference protocol;
   - target academic thought or innovation being tested;
   - main observation;
   - compared methods or variants;
   - datasets and metrics;
   - metric direction;
   - allowed interpretation;
   - experiment-level conclusion;
   - claim boundary;
   - relation to method design or scientific problem.

6. Write sentence by sentence.

   Follow the requirements in Section 3. Each sentence should either describe setup, report evidence, interpret evidence, connect to method design, or state a limitation.

7. Perform a self-check.

   Use the checks in Section 4 before returning or patching the Result text.

8. Write the result into the manuscript when editing is requested.

   Use `edit_draft_section` for replacing a complete Result-related section, `edit_draft_paragraph_content` for one paragraph, and `edit_draft` only when full-draft replacement is truly necessary.

   Treat requests such as "write the ablation paragraph", "revise the discussion", "complete the experiment analysis", "supplement the results", or "continue the experiment section" as manuscript editing requests when the target draft paragraph can be located.

   Do not return only a candidate paragraph when the user clearly asked to update an existing draft paragraph.

   Never claim the manuscript has been changed unless an edit tool has produced a valid patch.

9. Ask for clarification when necessary.

   If key evidence is missing, such as result numbers, table content, figure observations, metric direction, baseline identity, or experimental settings, ask for clarification instead of inventing result prose.

## 3. Sentence-by-Sentence Writing Requirements

For each Result sentence:

1. Decide the sentence function: setup, evidence report, comparison, ablation interpretation, qualitative observation, robustness/generalization analysis, discussion implication, or limitation.

2. Check the sentence against available evidence before writing it.

3. Identify which academic thought, innovation point, method assumption, or scientific problem this experiment is meant to support.

4. Use exact dataset, metric, baseline, method-variant, table, and figure names from the manuscript.

5. Keep metric direction correct. Avoid improvement wording when the metric direction is unknown.

6. Distinguish observed result from interpretation. If the sentence interprets a pattern, make the evidence behind that interpretation visible.

7. Ensure each experiment paragraph contains a conclusion sentence. The conclusion should state what the experiment supports, reveals, or limits in relation to the paper's method or academic thought.

8. Avoid unsupported statistical language. Do not mention statistical significance, confidence intervals, variance, p-values, or robustness unless available.

9. For ablation text, state what component or variant changed, what performance pattern was observed, what conclusion follows, and what design role the pattern supports.

10. For qualitative examples, describe what is visible or reported, then cautiously connect it to method behavior and the paper's academic thought.

11. For limitations, state the limitation precisely and connect it to evidence or experimental scope. Do not create a limitation that contradicts the paper's central claim unless the manuscript supports it.

12. Keep terminology consistent with Abstract, Introduction, Method, tables, figures, captions, and project memory.

## 4. Self-Check Requirements

### 4.1 Evidence check

Check whether every empirical claim has an available evidence source. If evidence is missing, do not present the claim as established.

### 4.2 Numeric and metric check

Check numbers, metric names, metric directions, rankings, baselines, and dataset names.

### 4.3 Table/figure alignment check

Check whether all table and figure references are accurate and whether the prose matches what those artifacts show.

### 4.4 Observation-interpretation check

Check whether the paragraph clearly separates observed results from interpretation and implication.

### 4.5 Experiment-conclusion check

Check whether every experiment has a clear conclusion and whether the conclusion is supported by the reported evidence.

### 4.6 Academic-thought alignment check

Check whether each experimental conclusion matches the paper's scientific problem, innovation points, method design logic, and claimed contribution.

### 4.7 Claim-strength check

Check whether wording overstates performance, generalization, robustness, significance, or clinical/practical impact.

### 4.8 Method-linking check

Check whether the interpretation connects back to the method's design role without inventing explanations.

### 4.9 Reference-grounding check

Check whether reference papers were used for protocol and style support without importing another paper's result claims.

### 4.10 Finalized-paragraph check

Check whether any finalized, final, or locked paragraph would be modified. If so, do not modify it unless the user explicitly authorizes the change.

## 5. Output Behavior

For manuscript prose, write in polished academic English.

For explanations to the user, reply in the user's language unless otherwise requested.

When evidence is insufficient, clearly state what is missing, such as table values, metric direction, baseline definitions, dataset details, figure observations, experimental protocol, experiment-level conclusion, or academic-thought alignment.

Briefly explain what was revised or generated, what evidence was used, what experiment conclusion was formed, how it aligns with the paper's academic thought, what claim boundaries were preserved, and whether a manuscript patch was produced.
