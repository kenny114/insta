"use client";

import { useState } from "react";
import type { Message, ToolCallResult } from "@/lib/types";
import MessageList from "./MessageList";
import ChatInput from "./ChatInput";

interface StreamEvent {
  type: "tool_running" | "tool_done" | "done";
  toolCall?: ToolCallResult;
  message?: string;
  continue?: boolean;
  nextMessages?: unknown[];
}

async function* readStream(response: Response): AsyncGenerator<StreamEvent> {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (line.trim()) {
        yield JSON.parse(line);
      }
    }
  }

  if (buffer.trim()) {
    yield JSON.parse(buffer);
  }
}

export default function ChatContainer() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = async (content: string) => {
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content,
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      let apiMessages: unknown[] = [...messages, userMessage].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      while (true) {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: apiMessages }),
        });

        if (!res.ok) {
          throw new Error(`Request failed with status ${res.status}`);
        }

        // Track tool calls for this round using a message ID we can update
        const roundMessageId = crypto.randomUUID();
        const toolCalls: ToolCallResult[] = [];
        let finalEvent: StreamEvent | null = null;

        for await (const event of readStream(res)) {
          if (event.type === "tool_running" && event.toolCall) {
            // Add a running tool call card
            toolCalls.push(event.toolCall);
            setMessages((prev) => {
              const filtered = prev.filter((m) => m.id !== roundMessageId);
              return [
                ...filtered,
                {
                  id: roundMessageId,
                  role: "assistant",
                  content: "",
                  toolCalls: [...toolCalls],
                },
              ];
            });
          } else if (event.type === "tool_done" && event.toolCall) {
            // Replace the running entry with the completed result
            const idx = toolCalls.findIndex(
              (tc) =>
                tc.tool === event.toolCall!.tool && tc.status === "running"
            );
            if (idx !== -1) {
              toolCalls[idx] = event.toolCall;
            } else {
              toolCalls.push(event.toolCall);
            }
            setMessages((prev) => {
              const filtered = prev.filter((m) => m.id !== roundMessageId);
              return [
                ...filtered,
                {
                  id: roundMessageId,
                  role: "assistant",
                  content: "",
                  toolCalls: [...toolCalls],
                },
              ];
            });
          } else if (event.type === "done") {
            finalEvent = event;
          }
        }

        if (!finalEvent) break;

        if (finalEvent.continue && finalEvent.nextMessages) {
          apiMessages = finalEvent.nextMessages;
        } else {
          // Final text response
          if (finalEvent.message) {
            setMessages((prev) => [
              ...prev,
              {
                id: crypto.randomUUID(),
                role: "assistant",
                content: finalEvent!.message || "Done.",
              },
            ]);
          }
          break;
        }
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "Sorry, something went wrong. Please try again.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[600px] rounded-2xl border border-white/10 bg-[#0a0a0a] overflow-hidden">
      <div className="px-4 py-3 border-b border-white/10 flex items-center gap-3">
        <div className="w-3 h-3 rounded-full bg-emerald-400" />
        <span className="text-sm font-medium text-white/70">
          Ad Generator Assistant
        </span>
      </div>
      <MessageList messages={messages} isLoading={isLoading} />
      <ChatInput onSend={sendMessage} disabled={isLoading} />
    </div>
  );
}
