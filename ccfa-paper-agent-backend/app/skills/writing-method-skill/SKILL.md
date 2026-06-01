# MethodSkill

Use this skill for Method, Methodology, Approach, Framework, Model, Training
Objective, Algorithm, and module descriptions.

## Inputs To Inspect

- Target method section or paragraph and its writing status.
- Existing method terminology: method name, module names, losses, datasets, and metrics.
- Figures, captions, or image metadata related to the method.
- Core references describing comparable architectures or method framing.
- Any project notes that define the actual technical pipeline.

## Required Reasoning

1. Identify whether the target text should explain the overall framework, a
   specific module, an objective/loss, implementation details, or design rationale.
2. Preserve the order of computation and dependencies between modules.
3. Separate what the method does from why it is designed that way.
4. Use symbols consistently if equations or notation already exist.
5. Avoid adding unverified components, losses, datasets, or training details.

## Writing Constraints

- Keep technical claims concrete and traceable to the draft or project context.
- Do not invent algorithm steps, hyperparameters, or implementation details.
- Prefer precise verbs: encode, aggregate, align, regularize, optimize, calibrate.
- Avoid vague phrases such as "significantly improves" unless results support it.
- When describing modules, include input, operation, output, and purpose.

## Output Expectations

- For framework paragraphs: give a clear top-down overview before module details.
- For module paragraphs: explain mechanism and rationale without excessive hype.
- For patching: replace only editable non-final content unless explicitly authorized.
