import { getAgentApiUrl } from "./agentApi";

export type LocalConfig = {
  saved: boolean;
  envPath: string;
  deepseekApiKeyConfigured: boolean;
  deepseekBaseUrl: string;
  deepseekModel: string;
  latexDraftCleanModel: string;
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

export type LocalShutdownResult = {
  message: string;
  backendPids: number[];
  frontendPids: number[];
};

async function parseConfigResponse(response: Response): Promise<LocalConfig> {
  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(message || `Local config request failed with ${response.status}`);
  }
  return (await response.json()) as LocalConfig;
}

function createLocalBackendConnectionError(): Error {
  const apiUrl = getAgentApiUrl();
  return new Error(
    `无法连接本地后端。请确认 start-local.ps1 或 start-local.sh 已成功运行，并能打开 ${apiUrl}/health。`
  );
}

export async function fetchLocalConfig(): Promise<LocalConfig> {
  const response = await fetch(`${getAgentApiUrl()}/api/local-config`).catch(() => {
    throw createLocalBackendConnectionError();
  });
  return parseConfigResponse(response);
}

export async function saveLocalConfig(input: LocalConfigInput): Promise<LocalConfig> {
  const response = await fetch(`${getAgentApiUrl()}/api/local-config`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(input)
  }).catch(() => {
    throw createLocalBackendConnectionError();
  });
  return parseConfigResponse(response);
}

export async function shutdownLocalServices(): Promise<LocalShutdownResult> {
  const response = await fetch(`${getAgentApiUrl()}/api/local-shutdown`, {
    method: "POST"
  }).catch(() => {
    throw createLocalBackendConnectionError();
  });
  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(message || `Local shutdown request failed with ${response.status}`);
  }
  return (await response.json()) as LocalShutdownResult;
}
