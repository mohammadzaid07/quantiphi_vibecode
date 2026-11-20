const BASE = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

export async function fetchConversations() {
  const response = await fetch(`${BASE}/api/conversations`);
  if (!response.ok) throw new Error("Could not load conversation history");
  return response.json();
}

export async function fetchConversation(id) {
  const response = await fetch(`${BASE}/api/conversations/${id}`);
  if (!response.ok) throw new Error("Could not load conversation");
  return response.json();
}

export async function deleteConversation(id) {
  const response = await fetch(`${BASE}/api/conversations/${id}`, { method: "DELETE" });
  if (!response.ok) throw new Error("Could not delete conversation");
  return response.json();
}

export async function streamChat(payload, onEvent, endpoint = "/api/chat/stream") {
  const response = await fetch(`${BASE}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "text/event-stream" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Request failed (${response.status})`);
  }
  if (!response.body) throw new Error("Streaming is not supported by this browser");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split("\n\n");
    buffer = events.pop() || "";
    for (const eventText of events) {
      const line = eventText.split("\n").find((item) => item.startsWith("data: "));
      if (!line) continue;
      try { onEvent(JSON.parse(line.slice(6))); } catch { /* ignore malformed event */ }
    }
  }
}
