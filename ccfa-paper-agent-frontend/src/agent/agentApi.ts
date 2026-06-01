const DEFAULT_AGENT_API_URL = "http://localhost:8000";

export function getAgentApiUrl(): string {
  return (import.meta.env.VITE_AGENT_API_URL ?? DEFAULT_AGENT_API_URL).replace(/\/$/, "");
}
