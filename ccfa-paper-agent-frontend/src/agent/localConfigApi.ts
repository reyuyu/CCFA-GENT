import { getAgentApiUrl } from "./agentApi";

export type LocalConfig = {
  saved: boolean;
  envPath: string;
  deepseekApiKeyConfigured: boolean;
  deepseekBaseUrl: string;
  deepseekModel: string;
  semanticScholarApiKeyConfigured: boolean;
  semanticScholarBaseUrl: string;
  mineruApiTokenConfigured: boolean;
  mineruParseMode: string;
};

export type LocalConfigInput = {
  deepseekApiKey?: string;
  deepseekBaseUrl?: string;
  deepseekModel?: string;
  semanticScholarApiKey?: string;
  semanticScholarBaseUrl?: string;
  mineruApiToken?: string;
  mineruParseMode?: string;
};

async function parseConfigResponse(response: Response): Promise<LocalConfig> {
  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(message || `Local config request failed with ${response.status}`);
  }
  return (await response.json()) as LocalConfig;
}

export async function fetchLocalConfig(): Promise<LocalConfig> {
  const response = await fetch(`${getAgentApiUrl()}/api/local-config`);
  return parseConfigResponse(response);
}

export async function saveLocalConfig(input: LocalConfigInput): Promise<LocalConfig> {
  const response = await fetch(`${getAgentApiUrl()}/api/local-config`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(input)
  });
  return parseConfigResponse(response);
}
