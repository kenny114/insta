export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  toolCalls?: ToolCallResult[];
}

export interface ToolCallResult {
  tool: string;
  args: Record<string, unknown>;
  result: string;
  status: "success" | "error" | "running";
  images?: string[]; // absolute file paths to generated images
}

export interface ChatRequest {
  messages: { role: "user" | "assistant" | "system"; content: string }[];
}

export interface ChatResponse {
  message: string;
  toolCalls?: ToolCallResult[];
}
