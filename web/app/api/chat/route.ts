import { NextRequest } from "next/server";
import { openai, SYSTEM_PROMPT, toolDefinitions } from "@/lib/openai";
import { executeTool } from "@/lib/tools";
import type { ToolCallResult } from "@/lib/types";

export const maxDuration = 300;

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
      const toolCalls = (choice.message.tool_calls || []).filter(
        (tc) => tc.type === "function"
      );

      // Stream each tool call result as NDJSON so the frontend can show
      // images one by one as they complete
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          const toolCallResults: ToolCallResult[] = [];

          for (const toolCall of toolCalls) {
            const args = JSON.parse(toolCall.function.arguments);

            // Send a "running" event so the frontend can show a spinner
            controller.enqueue(
              encoder.encode(
                JSON.stringify({
                  type: "tool_running",
                  toolCall: {
                    tool: toolCall.function.name,
                    args,
                    result: "",
                    status: "running",
                  },
                }) + "\n"
              )
            );

            const result = await executeTool(toolCall.function.name, args);

            const toolResult: ToolCallResult = {
              tool: toolCall.function.name,
              args,
              result: result.output,
              status: result.status,
              images: result.images,
            };

            toolCallResults.push(toolResult);

            // Send the completed tool result
            controller.enqueue(
              encoder.encode(
                JSON.stringify({
                  type: "tool_done",
                  toolCall: toolResult,
                }) + "\n"
              )
            );
          }

          // Build nextMessages for the next round
          const toolResultMessages = toolCalls.map((tc, i) => ({
            role: "tool" as const,
            tool_call_id: tc.id,
            content: toolCallResults[i]?.result ?? "",
          }));

          const nextMessages = [
            ...messages,
            choice.message,
            ...toolResultMessages,
          ];

          // Send the final message with continue flag
          controller.enqueue(
            encoder.encode(
              JSON.stringify({
                type: "done",
                continue: true,
                nextMessages,
              }) + "\n"
            )
          );

          controller.close();
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "application/x-ndjson",
          "Cache-Control": "no-cache",
        },
      });
    }

    // Final text response — no more tool calls
    const encoder = new TextEncoder();
    const body = encoder.encode(
      JSON.stringify({
        type: "done",
        message: choice.message.content || "Done.",
        continue: false,
      }) + "\n"
    );

    return new Response(body, {
      headers: { "Content-Type": "application/x-ndjson" },
    });
  } catch (error) {
    console.error("Chat API error:", error);
    const encoder = new TextEncoder();
    const body = encoder.encode(
      JSON.stringify({
        type: "done",
        message: `Sorry, something went wrong: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        continue: false,
      }) + "\n"
    );

    return new Response(body, {
      status: 500,
      headers: { "Content-Type": "application/x-ndjson" },
    });
  }
}
