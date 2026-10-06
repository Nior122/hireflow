/** @jest-environment node */

import { readOpenAICompatibleStream } from "./stream";

function streamFromChunks(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
}

describe("readOpenAICompatibleStream", () => {
  it("ignores reasoning deltas and assembles split content and tool calls", async () => {
    const events = [
      { choices: [{ delta: { reasoning: "private chain of thought" } }] },
      { choices: [{ delta: { content: "Hello " } }] },
      { choices: [{ delta: { content: "there" } }] },
      { choices: [{ delta: { tool_calls: [{ index: 0, id: "call-1", function: { name: "getApplications", arguments: "{\"status\":" } }] } }] },
      { choices: [{ delta: { tool_calls: [{ index: 0, function: { arguments: "\"APPLIED\"}" } }] }, finish_reason: "tool_calls" }] },
    ];
    const serialized = events.map(event => `data: ${JSON.stringify(event)}\r\n\r\n`).join("") + "data: [DONE]\r\n\r\n";
    // Split through event names and JSON tokens to exercise arbitrary network chunk boundaries.
    const chunks = serialized.match(/.{1,13}/gs) ?? [serialized];
    const receivedText: string[] = [];

    const result = await readOpenAICompatibleStream(streamFromChunks(chunks), text => receivedText.push(text));

    expect(result.content).toBe("Hello there");
    expect(receivedText.join("")).toBe("Hello there");
    expect(JSON.stringify(result)).not.toContain("private chain of thought");
    expect(result).toMatchObject({
      finishReason: "tool_calls",
      toolCalls: [{
        id: "call-1",
        name: "getApplications",
        arguments: "{\"status\":\"APPLIED\"}",
        index: 0,
      }],
    });
  });

  it("returns an empty result for a missing body", async () => {
    await expect(readOpenAICompatibleStream(null)).resolves.toEqual({
      content: "",
      toolCalls: [],
      finishReason: null,
    });
  });

  it("handles a final data event without a trailing newline", async () => {
    const event = `data: ${JSON.stringify({ choices: [{ delta: { content: "Complete" } }] })}`;
    await expect(readOpenAICompatibleStream(streamFromChunks([event]))).resolves.toMatchObject({ content: "Complete" });
  });
});
