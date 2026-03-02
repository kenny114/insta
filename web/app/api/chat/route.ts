import { NextRequest, NextResponse } from "next/server";
import { openai, SYSTEM_PROMPT, toolDefinitions } from "@/lib/openai";
import { executeTool } from "@/lib/tools";
import type { ToolCallResult } from "@/lib/types";

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    const allMessages = [
      { role: "system" as const, content: SYSTEM_PROMPT },
      ...messages,
    ];

    const toolCallResults: ToolCallResult[] = [];
    let maxLoops = 5;

    while (maxLoops > 0) {
      maxLoops--;

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
        // Add assistant message with tool calls
        allMessages.push(choice.message as never);

        // Execute each tool call
        for (const toolCall of choice.message.tool_calls || []) {
          if (toolCall.type !== "function") continue;
          const fnCall = toolCall as { id: string; type: "function"; function: { name: string; arguments: string } };
          const args = JSON.parse(fnCall.function.arguments);
          const result = await executeTool(fnCall.function.name, args);

          toolCallResults.push({
            tool: fnCall.function.name,
            args,
            result: result.output,
            status: result.status,
            images: result.images,
          });

          // Add tool result to messages
          allMessages.push({
            role: "tool" as const,
            tool_call_id: fnCall.id,
            content: result.output,
          } as never);
        }
      } else {
        // Final text response
        return NextResponse.json({
          message: choice.message.content || "Done.",
          toolCalls:
            toolCallResults.length > 0 ? toolCallResults : undefined,
        });
      }
    }

    // If we hit the loop limit
    return NextResponse.json({
      message:
        "I completed several tool operations. Check the results above for details.",
      toolCalls: toolCallResults.length > 0 ? toolCallResults : undefined,
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      {
        message: `Sorry, something went wrong: ${error instanceof Error ? error.message : "Unknown error"}`,
      },
      { status: 500 }
    );
  }
}
