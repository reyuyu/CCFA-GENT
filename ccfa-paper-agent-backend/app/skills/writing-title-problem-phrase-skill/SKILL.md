# Writing Title And Problem Phrase Skill

Skill ID: `writing-title-problem-phrase-skill`

This skill guides WritingAgent when generating, revising, polishing, or comparing title-like expressions in an English CCF-A / SCI paper.

This skill does **not** handle paper contribution writing. Contribution paragraphs, contribution framing, and contribution bullets should be handled by `writing-introduction-skill`.

This skill only handles:

- paper titles;
- section titles and subsection titles;
- method names when they function as title-like names;
- scientific problem phrases;
- compact problem-name formulations.

## 1. General Principles

### 1.1 Title alignment principle

Any title-like expression must align with the paper's scientific problem, main title, core innovation, and established terminology.

The wording should be consistent across the manuscript. Do not introduce a new term if the paper already has a stable term for the same concept.

### 1.2 Problem-phrase formulation principle

A scientific problem phrase should be attractive, memorable, and precise, but it must not become an arbitrary invented phrase.

The agent may create suitable word combinations, but should avoid severe coinages, vague slogans, or expressions that sound impressive but lack scientific grounding.

## 2. Title Setting Principles

### 2.1 Reference principle

If the title or subtitle to be refined is related to a problem that appears in local reference papers, prioritize those reference papers.

Use `list_reference_papers` to inspect local reference metadata. When useful references exist, use `list_reference_sections` and `get_reference_section_content` to inspect relevant title, abstract, introduction, or section-heading patterns.

If reference papers provide a strong title pattern or problem formulation, use it as one candidate option or as the main stylistic basis.

### 2.2 Correspondence principle

The title must strictly correspond to the surrounding manuscript context.

It should logically match:

- the paper's main title;
- the central scientific problem;
- the core innovation;
- the Introduction's problem construction;
- the specific section or subsection content.

Do not create a title that is attractive but disconnected from the actual paper.

### 2.3 Logic principle

Titles and subtitles should have logical relationships with each other.

For Introduction-related headings, all title-like expressions should serve the paper's scientific problem construction: first exposing the problem, then clarifying the gap, and finally preparing for the proposed solution.

When multiple headings are generated together, check whether they form a coherent sequence rather than isolated attractive phrases.

## 3. Scientific Problem Phrase Principles

### 3.1 Reference principle

If the scientific problem has already been discussed or named in reference papers, prioritize how those papers formulate the problem.

Borrow the scientific structure and terminology of the formulation, not the exact sentence unless it is a standard field term.

### 3.2 Attractiveness principle

The problem phrase should be attractive and specific. Avoid overly broad, empty, or generic expressions.

Prefer phrases that feel precise and interesting, and that help readers quickly remember the problem.

### 3.3 Scientificity principle

The phrase must remain scientifically credible.

At least one key word in the phrase should come from the relevant research field, task, method, data type, clinical setting, or evaluation problem.

Avoid phrases that sound like marketing slogans or unsupported novelty claims.

### 3.4 Structural-combination principle

When generating multiple scientific problem phrases, try to make their grammatical and semantic structures parallel.

This is not mandatory, but it is preferred when the phrases will appear together in one outline, one Introduction logic chain, or one group of section headings.

## 4. Workflow

For every title or scientific problem phrase task:

1. Identify the target expression.

   Determine whether the user is asking for a paper title, section title, subsection title, method-name-like title, or scientific problem phrase.

2. Inspect local reference metadata.

   Call `list_reference_papers` first. Check whether any core or optional reference paper is relevant to the target problem, title style, or phrase formulation.

3. Inspect useful reference sections when available.

   If reference metadata suggests useful material, call `list_reference_sections` and `get_reference_section_content` to inspect relevant title, abstract, introduction, related work, or heading patterns.

4. Use reference expressions as candidate bases.

   If reference papers contain useful formulations, include reference-inspired options. Preserve scientificity and adapt only what is necessary for the current paper.

5. Call retrieval when information is insufficient.

   If local references and project context are insufficient to formulate a scientifically grounded title or problem phrase, call `retrieve_academic_papers` to search for potentially useful papers.

   In this case, return the most relevant candidate papers to the user and explain their reference value. Do not force a final title or problem phrase when the source material is not enough.

6. Generate several alternatives.

   Provide multiple options rather than only one. The options may differ in conservativeness, attractiveness, technical specificity, or alignment with different reference patterns.

7. Self-check the options.

   Evaluate each option according to:

   - scientificity;
   - attractiveness;
   - reference grounding;
   - logical correspondence with the main title and core innovation;
   - structural consistency among multiple headings or problem phrases.

8. Return final options and reasons to the user.

   Present the recommended options, explain the reasons, mention useful reference papers if any, and ask the user to decide.

## 5. Output Requirements

For each option, provide:

- the title or problem phrase;
- the intended use case;
- the reason it works;
- possible risk or limitation if any;
- reference basis if available.

When information is insufficient, do not pretend the phrase is final. Return candidate reference papers and clearly explain what additional material is needed before making a reliable title decision.
