type LatexConversionStats = {
  headingCount: number;
  formulaCount: number;
  captionCount: number;
};

export type LatexConversionResult = {
  markdown: string;
  stats: LatexConversionStats;
};

const headingLevels: Record<string, number> = {
  part: 1,
  chapter: 1,
  section: 2,
  subsection: 3,
  subsubsection: 4,
  paragraph: 5,
  subparagraph: 6
};

const mathEnvironments = new Set([
  "equation",
  "equation*",
  "align",
  "align*",
  "gather",
  "gather*",
  "multline",
  "multline*",
  "split",
  "flalign",
  "flalign*",
  "eqnarray",
  "eqnarray*"
]);

const textCommandReplacements: Array<[RegExp, (value: string) => string]> = [
  [/\\(?:textbf|bfseries)\{([^{}]*)\}/g, (value) => `**${value}**`],
  [/\\(?:emph|textit|itshape)\{([^{}]*)\}/g, (value) => `*${value}*`],
  [/\\texttt\{([^{}]*)\}/g, (value) => `\`${value}\``],
  [/\\(?:underline)\{([^{}]*)\}/g, (value) => value]
];

function stripLatexComments(input: string): string {
  return input
    .split(/\r?\n/)
    .map((line) => {
      for (let index = 0; index < line.length; index += 1) {
        if (line[index] !== "%") continue;
        let slashCount = 0;
        for (let cursor = index - 1; cursor >= 0 && line[cursor] === "\\"; cursor -= 1) {
          slashCount += 1;
        }
        if (slashCount % 2 === 0) {
          return line.slice(0, index);
        }
      }
      return line;
    })
    .join("\n");
}

function extractDocumentBody(input: string): string {
  const beginMatch = /\\begin\{document\}/.exec(input);
  const endMatch = /\\end\{document\}/.exec(input);
  if (beginMatch && endMatch && endMatch.index > beginMatch.index) {
    return input.slice(beginMatch.index + beginMatch[0].length, endMatch.index);
  }
  return input;
}

function readBraced(input: string, openBraceIndex: number): { value: string; endIndex: number } | undefined {
  if (input[openBraceIndex] !== "{") return undefined;

  let depth = 0;
  for (let index = openBraceIndex; index < input.length; index += 1) {
    const char = input[index];
    if (char === "\\" && index + 1 < input.length) {
      index += 1;
      continue;
    }
    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return {
          value: input.slice(openBraceIndex + 1, index),
          endIndex: index + 1
        };
      }
    }
  }

  return undefined;
}

function replaceCommandWithBracedContent(
  input: string,
  command: RegExp,
  replacer: (content: string, fullCommand: string) => string
): string {
  let output = "";
  let cursor = 0;
  const source = input;

  while (cursor < source.length) {
    command.lastIndex = cursor;
    const match = command.exec(source);
    if (!match) {
      output += source.slice(cursor);
      break;
    }

    const commandStart = match.index;
    const braceIndex = command.lastIndex;
    const braced = readBraced(source, braceIndex);
    if (!braced) {
      output += source.slice(cursor, command.lastIndex);
      cursor = command.lastIndex;
      continue;
    }

    output += source.slice(cursor, commandStart);
    output += replacer(braced.value.trim(), match[0]);
    cursor = braced.endIndex;
  }

  return output;
}

function normalizeInlineCommands(input: string): string {
  let output = input;
  for (const [pattern, replacer] of textCommandReplacements) {
    output = output.replace(pattern, (_match, value: string) => replacer(value));
  }

  output = output
    .replace(/\\(?:cite|citep|citet|citealp|autocite|parencite|textcite)(?:\[[^\]]*]){0,2}\{([^{}]+)\}/g, (_match, keys: string) =>
      keys
        .split(",")
        .map((key: string) => `@${key.trim()}`)
        .join("; ")
        .replace(/^/, "[")
        .replace(/$/, "]")
    )
    .replace(/\\(?:eqref|ref|autoref|cref|Cref)\{([^{}]+)\}/g, (_match, label: string) => `\\ref{${label}}`)
    .replace(/\\label\{([^{}]+)\}/g, (_match, label: string) => `<!-- label: ${label} -->`)
    .replace(/\\url\{([^{}]+)\}/g, "$1")
    .replace(/\\href\{([^{}]+)\}\{([^{}]+)\}/g, "[$2]($1)")
    .replace(/\\(?:quad|qquad|,|;|:|!)/g, " ")
    .replace(/\\(?:noindent|newpage|clearpage|maketitle|centering)\b/g, "")
    .replace(/\\&/g, "&")
    .replace(/\\%/g, "%")
    .replace(/\\_/g, "_")
    .replace(/\\#/g, "#");

  return output;
}

function convertHeadings(input: string, stats: LatexConversionStats): string {
  return replaceCommandWithBracedContent(
    input,
    /\\(part|chapter|section|subsection|subsubsection|paragraph|subparagraph)\*?/g,
    (content, fullCommand) => {
      const command = /\\([a-z]+)/i.exec(fullCommand)?.[1] ?? "section";
      const level = headingLevels[command] ?? 2;
      stats.headingCount += 1;
      return `\n\n${"#".repeat(level)} ${normalizeInlineCommands(content)}\n\n`;
    }
  );
}

function convertCaptions(input: string, stats: LatexConversionStats): string {
  return input.replace(
    /\\begin\{(figure\*?|table\*?)\}[\s\S]*?\\end\{\1\}/g,
    (block, environment: string) => {
      const captionMatch = /\\caption(?:\[[\s\S]*?])?\{/.exec(block);
      if (!captionMatch) return "";

      const captionStart = captionMatch.index + captionMatch[0].length - 1;
      const caption = readBraced(block, captionStart);
      if (!caption) return "";

      const labelMatch = /\\label\{([^{}]+)\}/.exec(block);
      stats.captionCount += 1;
      const kind = environment.startsWith("table") ? "Table" : "Figure";
      const label = labelMatch ? `\n<!-- label: ${labelMatch[1]} -->` : "";
      return `\n\n> **${kind} caption.** ${normalizeInlineCommands(caption.value.trim())}${label}\n\n`;
    }
  );
}

function convertDisplayMath(input: string, stats: LatexConversionStats): string {
  let output = input.replace(/\$\$([\s\S]*?)\$\$/g, (_match, formula: string) => {
    stats.formulaCount += 1;
    return `\n\n$$\n${formula.trim()}\n$$\n\n`;
  });

  output = output.replace(/\\\[((?:.|\n)*?)\\\]/g, (_match, formula: string) => {
    stats.formulaCount += 1;
    return `\n\n$$\n${formula.trim()}\n$$\n\n`;
  });

  for (const environment of mathEnvironments) {
    const escaped = environment.replace("*", "\\*");
    output = output.replace(
      new RegExp(`\\\\begin\\{${escaped}\\}([\\s\\S]*?)\\\\end\\{${escaped}\\}`, "g"),
      (_match, formula: string) => {
        stats.formulaCount += 1;
        return `\n\n$$\n${formula.trim()}\n$$\n\n`;
      }
    );
  }

  return output;
}

function convertInlineMath(input: string, stats: LatexConversionStats): string {
  return input.replace(/\\\(([\s\S]*?)\\\)/g, (_match, formula: string) => {
    stats.formulaCount += 1;
    return `$${formula.trim()}$`;
  });
}

function convertLists(input: string): string {
  return input
    .replace(/\\begin\{itemize\}/g, "\n")
    .replace(/\\end\{itemize\}/g, "\n")
    .replace(/\\begin\{enumerate\}/g, "\n")
    .replace(/\\end\{enumerate\}/g, "\n")
    .replace(/^\s*\\item(?:\[[^\]]+])?\s*/gm, "- ");
}

function cleanupMarkdown(input: string): string {
  return input
    .replace(/\\begin\{abstract\}/g, "\n\n## Abstract\n\n")
    .replace(/\\end\{abstract\}/g, "\n\n")
    .replace(/\\(?:documentclass|usepackage|title|author|date|bibliographystyle|bibliography)(?:\[[^\]]*])?\{[^{}]*\}/g, "")
    .replace(/\\begin\{[^{}]+\}/g, "")
    .replace(/\\end\{[^{}]+\}/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function convertLatexToMarkdown(latex: string, sourceName?: string): LatexConversionResult {
  const stats: LatexConversionStats = {
    headingCount: 0,
    formulaCount: 0,
    captionCount: 0
  };

  let markdown = latex.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  markdown = stripLatexComments(markdown);
  markdown = extractDocumentBody(markdown);
  markdown = convertCaptions(markdown, stats);
  markdown = convertHeadings(markdown, stats);
  markdown = convertDisplayMath(markdown, stats);
  markdown = convertInlineMath(markdown, stats);
  markdown = convertLists(markdown);
  markdown = normalizeInlineCommands(markdown);
  markdown = cleanupMarkdown(markdown);

  const title = sourceName ? `<!-- Converted from ${sourceName}. Images were omitted; figure/table captions were preserved. -->` : "";
  return {
    markdown: [title, markdown].filter(Boolean).join("\n\n"),
    stats
  };
}
