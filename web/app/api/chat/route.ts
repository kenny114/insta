import { NextRequest, NextResponse } from "next/server";
import { openai, SYSTEM_PROMPT, toolDefinitions } from "@/lib/openai";
import { executeTool } from "@/lib/tools";
import type { ToolCallResult } from "@/lib/types";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    const allMessages = [
      { role: "system" as const, content: SYSTEM_PROMPT },
      ...messages,
    ];

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: allMessages,
      tools: toolDefinitions,
      tool_choice: "auto",
    });

    const choice = response.choices[0];

    if (
      choice.finish_reason === "tool_calls" ||
      (choice.message.tool_calls && choice.message.tool_calls.length > 0)
    ) {
      const toolCallResults: ToolCallResult[] = [];

      // Execute all tool calls from this single round
      for (const toolCall of choice.message.tool_calls || []) {
        if (toolCall.type !== "function") continue;
        const args = JSON.parse(toolCall.function.arguments);
        const result = await executeTool(toolCall.function.name, args);

        toolCallResults.push({
          tool: toolCall.function.name,
          args,
          result: result.output,
          status: result.status,
          images: result.images,
        });
      }

      // Build the updated message history for the next round
      const toolResultMessages = (choice.message.tool_calls || [])
        .filter((tc) => tc.type === "function")
        .map((tc, i) => ({
          role: "tool" as const,
          tool_call_id: tc.id,
          content: toolCallResults[i]?.result ?? "",
        }));

      const nextMessages = [
        ...messages,
        choice.message,
        ...toolResultMessages,
      ];

      return NextResponse.json({
        toolCalls: toolCallResults,
        continue: true,
        nextMessages,
      });
    }

    // Final text response — no more tool calls
    return NextResponse.json({
      message: choice.message.content || "Done.",
      continue: false,
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      {
        message: `Sorry, something went wrong: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        continue: false,
      },
      { status: 500 }
    );
  }
}
