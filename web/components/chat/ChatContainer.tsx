"use client";

import { useState } from "react";
import type { Message, ChatResponse } from "@/lib/types";
import MessageList from "./MessageList";
import ChatInput from "./ChatInput";

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
      // Start with the current conversation history
      let apiMessages: unknown[] = [...messages, userMessage].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      // Keep stepping through tool calls until the AI is done
      while (true) {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: apiMessages }),
        });

        if (!res.ok) {
          throw new Error(`Request failed with status ${res.status}`);
        }

        const data: ChatResponse = await res.json();

        if (data.continue && data.nextMessages) {
          // Show tool call results as they arrive
          if (data.toolCalls && data.toolCalls.length > 0) {
            setMessages((prev) => [
              ...prev,
              {
                id: crypto.randomUUID(),
                role: "assistant",
                content: "",
                toolCalls: data.toolCalls,
              },
            ]);
          }
          // Use the updated history (includes tool results) for the next round
          apiMessages = data.nextMessages;
        } else {
          // Final text response
          setMessages((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              role: "assistant",
              content: data.message || "Done.",
              toolCalls: data.toolCalls,
            },
          ]);
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
