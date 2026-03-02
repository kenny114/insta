"use client";

import { useEffect, useRef } from "react";
import type { Message } from "@/lib/types";
import MessageBubble from "./MessageBubble";

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
}

export default function MessageList({ messages, isLoading }: MessageListProps) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
      {messages.length === 0 && (
        <div className="flex flex-col items-center justify-center h-full text-center text-white/30 space-y-4">
          <div className="text-5xl">&#9670;</div>
          <p className="text-lg font-medium">What can I help you create?</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs max-w-md">
            {[
              "Research recruitment ads from competitors",
              "Generate ad copy for a flyer",
              "Create a full ad from scratch",
              "Score an existing ad",
            ].map((suggestion) => (
              <div
                key={suggestion}
                className="rounded-lg border border-white/10 px-3 py-2 text-white/50"
              >
                {suggestion}
              </div>
            ))}
          </div>
        </div>
      )}

      {messages.map((msg) => (
        <MessageBubble key={msg.id} message={msg} />
      ))}

      {isLoading && (
        <div className="flex justify-start">
          <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 bg-white/40 rounded-full animate-bounce [animation-delay:0ms]" />
              <span className="w-2 h-2 bg-white/40 rounded-full animate-bounce [animation-delay:150ms]" />
              <span className="w-2 h-2 bg-white/40 rounded-full animate-bounce [animation-delay:300ms]" />
            </div>
          </div>
        </div>
      )}

      <div ref={endRef} />
    </div>
  );
}
