import { getAgentApiUrl } from "./agentApi";

export type OrganizeMarkdownResult = {
  organizedMarkdown: string;
  summary: string;
};

export async function organizeMarkdownSections(
  fileName: string,
  markdown: string
): Promise<OrganizeMarkdownResult> {
  const response = await fetch(`${getAgentApiUrl()}/api/markdown/organize-sections`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      fileName,
      markdown
    })
  });

  if (!response.ok) {
    const message = await response
      .clone()
      .json()
      .then((body) => body.detail ?? JSON.stringify(body))
      .catch(async () => response.text().catch(() => ""));
    throw new Error(message || `Markdown section organizer failed with ${response.status}`);
  }

  return (await response.json()) as OrganizeMarkdownResult;
}

export async function cleanLatexDraftMarkdown(
  fileName: string,
  markdown: string
): Promise<OrganizeMarkdownResult> {
  const response = await fetch(`${getAgentApiUrl()}/api/markdown/clean-latex-draft`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      fileName,
      markdown
    })
  });

  if (!response.ok) {
    const message = await response
      .clone()
      .json()
      .then((body) => body.detail ?? JSON.stringify(body))
      .catch(async () => response.text().catch(() => ""));
    throw new Error(message || `LaTeX draft cleaner failed with ${response.status}`);
  }

  return (await response.json()) as OrganizeMarkdownResult;
}
