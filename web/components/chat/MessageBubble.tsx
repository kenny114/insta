"use client";

import type { Message } from "@/lib/types";
import ToolCallCard from "./ToolCallCard";

interface MessageBubbleProps {
  message: Message;
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[80%] space-y-2`}>
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
            isUser
              ? "bg-blue-600 text-white"
              : "bg-white/5 border border-white/10 text-white/90"
          }`}
        >
          <p className="whitespace-pre-wrap">{message.content}</p>
        </div>

        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="space-y-2">
            {message.toolCalls.map((tc, i) => (
              <ToolCallCard key={i} toolCall={tc} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
