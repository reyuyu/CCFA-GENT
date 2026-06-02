const DEFAULT_AGENT_API_URL = "http://127.0.0.1:8000";

export function getAgentApiUrl(): string {
  return (import.meta.env.VITE_AGENT_API_URL ?? DEFAULT_AGENT_API_URL).replace(/\/$/, "");
}
