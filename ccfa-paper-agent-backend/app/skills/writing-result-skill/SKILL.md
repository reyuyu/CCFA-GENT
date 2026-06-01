# ResultSkill

Use this skill for Experiments, Results, Discussion, Ablation Study, Analysis,
Comparison, Limitations, and robustness/generalization discussion.

## Inputs To Inspect

- Target result, experiment, ablation, or discussion text and paragraph status.
- Tables, figures, metrics, datasets, and experimental settings present in the project context.
- Neighboring experiment paragraphs to maintain ordering and terminology.
- Core references when interpreting baselines or evaluation protocols.

## Required Reasoning

1. Identify the paragraph function: protocol, main comparison, ablation, analysis,
   robustness, qualitative result, discussion, or limitation.
2. Ground every performance claim in available numbers, figures, or draft text.
3. Distinguish observed result, interpretation, and implication.
4. Keep metric directionality correct: higher-is-better or lower-is-better.
5. Do not infer statistical significance unless explicitly available.

## Writing Constraints

- Do not invent numeric results or baseline names.
- Do not use "state-of-the-art" unless the evidence and target style justify it.
- Prefer cautious interpretation when evidence is partial.
- Mention datasets, metrics, and baselines consistently with the draft.
- Ablation analysis should connect each component to its intended design role.

## Output Expectations

- For result paragraphs: report what happened, why it matters, and what it supports.
- For discussion: connect empirical patterns to the method's design assumptions.
- For patching: preserve finalized paragraphs and existing table/figure references.
