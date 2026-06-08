import type { AgentProgressEvent, AgentReferenceRequest } from "./agent";

export type ChatRole = "user" | "assistant" | "system";

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
  progressEvents?: AgentProgressEvent[];
  referenceRequests?: AgentReferenceRequest[];
};

export type ChatThread = {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
};
