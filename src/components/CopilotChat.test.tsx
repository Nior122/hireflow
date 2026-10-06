import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { CopilotChat } from "./CopilotChat";

const originalFetch = global.fetch;
const originalCrypto = globalThis.crypto;

beforeEach(() => {
  let id = 0;
  Object.defineProperty(globalThis, "crypto", {
    configurable: true,
    value: { randomUUID: () => `test-${++id}` },
  });
  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
    configurable: true,
    value: jest.fn(),
  });
});

afterEach(() => {
  cleanup();
  global.fetch = originalFetch;
  Object.defineProperty(globalThis, "crypto", { configurable: true, value: originalCrypto });
});

test("marks a completed Copilot tool as Used instead of spinning forever", async () => {
  const events = [
    { type: "tool_call", id: "call-1", name: "getApplications", args: {} },
    { type: "tool_result", id: "call-1", name: "getApplications", result: "[]" },
    { type: "text", content: "You have no applications yet." },
  ];
  const payload = events.map(event => `data: ${JSON.stringify(event)}\n\n`).join("") + "data: [DONE]\n\n";
  const read = jest.fn()
    .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode(payload) })
    .mockResolvedValueOnce({ done: true, value: undefined });
  const response = {
    ok: true,
    body: { getReader: () => ({ read }) },
  } as unknown as Response;
  global.fetch = jest.fn().mockResolvedValue(response) as unknown as typeof fetch;

  render(<CopilotChat conversationId={null} onNewMessage={jest.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: "Which jobs need follow-up?" }));

  await waitFor(() => expect(screen.getByText(/Used/)).toBeInTheDocument());
  expect(screen.getByText("getApplications")).toBeInTheDocument();
  expect(screen.queryByText(/Using/)).not.toBeInTheDocument();
  expect(screen.getByText("You have no applications yet.")).toBeInTheDocument();
});
