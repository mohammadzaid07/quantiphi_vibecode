import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bot, Plus, Send, MessageSquare, PanelLeftClose, PanelLeftOpen,
  Sparkles, Trash2, Download, RefreshCw, Menu, X, Wifi, WifiOff
} from "lucide-react";
import { fetchConversations, fetchConversation, deleteConversation, streamChat } from "./api";

const tones = [
  { value: "professional", label: "Professional" },
  { value: "casual", label: "Casual" },
  { value: "concise", label: "Concise" },
];

function formatTime(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function App() {
  const [conversations, setConversations] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [tone, setTone] = useState("professional");
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [error, setError] = useState("");
  const [connected, setConnected] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  const refreshHistory = async () => {
    try {
      const items = await fetchConversations();
      setConversations(items);
      setConnected(true);
    } catch (err) {
      setConnected(false);
      setError(err.message);
    }
  };

  useEffect(() => { refreshHistory(); }, []);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const newChat = () => {
    if (busy) return;
    setConversationId(null);
    setMessages([]);
    setInput("");
    setError("");
    inputRef.current?.focus();
  };

  const openChat = async (id) => {
    if (busy) return;
    try {
      setError("");
      const data = await fetchConversation(id);
      setConversationId(id);
      setMessages(data.messages || []);
      setTone(data.tone || "professional");
    } catch (err) { setError(err.message); }
  };

  const consumeStream = async (payload, endpoint) => {
    setBusy(true);
    setError("");
    let activeId = payload.conversation_id || null;
    let assistantStarted = false;

    try {
      await streamChat(payload, (event) => {
        if (event.type === "start") {
          activeId = event.conversation_id;
          setConversationId(activeId);
        } else if (event.type === "token") {
          if (!assistantStarted) {
            assistantStarted = true;
            setMessages((prev) => [...prev, { role: "assistant", content: "", timestamp: new Date().toISOString() }]);
          }
          setMessages((prev) => {
            const copy = [...prev];
            const last = copy[copy.length - 1];
            if (last?.role === "assistant") copy[copy.length - 1] = { ...last, content: last.content + event.content };
            return copy;
          });
        } else if (event.type === "error") {
          setError(event.message || "The response could not be generated.");
        }
      }, endpoint);
      await refreshHistory();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  };

  const sendMessage = async (event) => {
    event?.preventDefault();
    const message = input.trim();
    if (!message || busy) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: message, timestamp: new Date().toISOString() }]);
    await consumeStream({ message, conversation_id: conversationId, tone }, "/api/chat/stream");
  };

  const regenerate = async () => {
    if (!conversationId || busy || !messages.length) return;
    const last = messages[messages.length - 1];
    if (last.role !== "assistant") return;
    setMessages((prev) => prev.slice(0, -1));
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUser) return;
    await consumeStream(
      { message: lastUser.content, conversation_id: conversationId, tone },
      `/api/conversations/${conversationId}/regenerate`
    );
  };

  const removeChat = async (id, event) => {
    event.stopPropagation();
    if (!window.confirm("Delete this conversation permanently?")) return;
    try {
      await deleteConversation(id);
      if (conversationId === id) newChat();
      await refreshHistory();
    } catch (err) { setError(err.message); }
  };

  const exportChat = () => {
    if (!messages.length) return;
    const body = messages.map((m) => `## ${m.role === "user" ? "You" : "Assistant"}\n\n${m.content}`).join("\n\n---\n\n");
    const blob = new Blob([`# Quantiphi Chat Export\n\nTone: ${tone}\n\n${body}`], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "quantiphi-conversation.md";
    link.click();
    URL.revokeObjectURL(url);
  };

  const currentTitle = useMemo(() => {
    const current = conversations.find((c) => c.conversation_id === conversationId);
    return current?.title || "New conversation";
  }, [conversations, conversationId]);

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? "open" : "closed"}`}>
        <div className="brand-row">
          <div className="brand-mark"><Sparkles size={18} /></div>
          <div className="brand-copy"><strong>quantiphi</strong><span>AI ASSISTANT</span></div>
          <button className="icon-btn sidebar-toggle" onClick={() => setSidebarOpen(false)} title="Collapse sidebar"><PanelLeftClose size={18} /></button>
        </div>
        <button className="new-chat" onClick={newChat}><Plus size={17} /> New chat</button>
        <div className="history-label">RECENT CONVERSATIONS</div>
        <div className="history-list">
          {conversations.map((item) => (
            <button key={item.conversation_id} className={`history-item ${conversationId === item.conversation_id ? "active" : ""}`} onClick={() => openChat(item.conversation_id)}>
              <MessageSquare size={15} />
              <span>{item.title || "Untitled conversation"}</span>
              <span className="history-delete" onClick={(e) => removeChat(item.conversation_id, e)} title="Delete"><Trash2 size={14} /></span>
            </button>
          ))}
          {!conversations.length && <p className="empty-history">Your conversations will appear here.</p>}
        </div>
        <div className="sidebar-bottom">
          <span className={`status-dot ${connected ? "online" : ""}`} />
          <span>{connected ? "Database connected" : "Connecting to backend…"}</span>
        </div>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <div className="topbar-left">
            {!sidebarOpen && <button className="icon-btn" onClick={() => setSidebarOpen(true)} title="Open sidebar"><PanelLeftOpen size={19} /></button>}
            <div><div className="page-title">{currentTitle}</div><div className="page-subtitle">Your intelligent workspace</div></div>
          </div>
          <div className="top-actions">
            <span className={`connection-pill ${connected ? "good" : "bad"}`}>{connected ? <Wifi size={13} /> : <WifiOff size={13} />}{connected ? "Connected" : "Offline"}</span>
            <button className="icon-btn" onClick={exportChat} disabled={!messages.length} title="Export conversation"><Download size={17} /></button>
          </div>
        </header>

        <section className="chat-area">
          {!messages.length ? (
            <div className="welcome">
              <div className="welcome-icon"><Bot size={30} /></div>
              <p className="eyebrow">QUANTIPHI AI</p>
              <h1>What can I help you<br /><span>think through today?</span></h1>
              <p className="welcome-text">Ask a question, explore an idea, or work through a problem.</p>
              <div className="suggestions">
                {["Explain a complex concept simply", "Help me plan a project", "Write and improve some code"].map((s) => <button key={s} onClick={() => setInput(s)}>{s}<span>↗</span></button>)}
              </div>
            </div>
          ) : (
            <div className="messages">
              {messages.map((message, index) => (
                <article className={`message-row ${message.role}`} key={`${index}-${message.role}`}>
                  <div className={`avatar ${message.role}`}>{message.role === "assistant" ? <Sparkles size={16} /> : "Z"}</div>
                  <div className="message-content">
                    <div className="message-meta">{message.role === "user" ? "You" : "Quantiphi AI"} <time>{formatTime(message.timestamp)}</time></div>
                    <div className="message-text">{message.content}{busy && index === messages.length - 1 && message.role === "assistant" && <span className="cursor" />}</div>
                  </div>
                </article>
              ))}
              <div ref={bottomRef} />
            </div>
          )}
        </section>

        <footer className="composer-wrap">
          {error && <div className="error-banner">{error}</div>}
          <div className="composer-tools">
            <label className="tone-label">RESPONSE TONE</label>
            <div className="tone-options">
              {tones.map((item) => <button key={item.value} className={tone === item.value ? "selected" : ""} onClick={() => setTone(item.value)} disabled={busy}>{item.label}</button>)}
            </div>
            {messages.some((m) => m.role === "assistant") && <button className="regenerate" onClick={regenerate} disabled={busy}><RefreshCw size={13} /> Regenerate</button>}
          </div>
          <form className="composer" onSubmit={sendMessage}>
            <textarea ref={inputRef} rows={1} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(e); } }} placeholder="Message Quantiphi AI…" disabled={busy} />
            <button className="send-btn" type="submit" disabled={!input.trim() || busy} title="Send message"><Send size={17} /></button>
          </form>
          <div className="disclaimer">AI responses may be inaccurate. Review important information before relying on it.</div>
        </footer>
      </main>
    </div>
  );
}

export default App;
