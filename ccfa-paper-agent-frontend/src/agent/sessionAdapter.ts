import { getAgentApiUrl } from "./agentApi";

async function deleteAgentSession(path: string): Promise<void> {
  try {
    const response = await fetch(`${getAgentApiUrl()}${path}`, {
      method: "DELETE"
    });

    if (!response.ok) {
      console.warn("Agent session cleanup failed", response.status, await response.text());
    }
  } catch (error) {
    console.warn("Agent session cleanup failed", error);
  }
}

export function clearThreadAgentSession(projectId: string, threadId: string): Promise<void> {
  return deleteAgentSession(
    `/api/agent/sessions/${encodeURIComponent(projectId)}/threads/${encodeURIComponent(threadId)}`
  );
}

export function clearProjectAgentSessions(projectId: string): Promise<void> {
  return deleteAgentSession(`/api/agent/sessions/${encodeURIComponent(projectId)}`);
}
