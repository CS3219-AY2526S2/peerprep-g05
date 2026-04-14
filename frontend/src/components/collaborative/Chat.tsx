import { useEffect, useRef, useState, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";

interface Message {
  id: string;
  sender: string;
  content: string;
  timestamp: Date;
  isOwn: boolean;
}

interface ChatProps {
  roomId: string;
  username?: string;
}

const BUTTON_SIZE = 52;
const PANEL_WIDTH = 360;
const PANEL_HEIGHT = 520;
const PANEL_GAP = 12;

export function Chat({ roomId, username = "You" }: ChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const [chatError, setChatError] = useState<string | null>(null);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const { user } = useAuth();
  const userId = user?.id ?? "";
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Button position, defaults to bottom-right
  const [pos, setPos] = useState(() => ({
    x: window.innerWidth - BUTTON_SIZE - 20,
    y: window.innerHeight - BUTTON_SIZE - 20,
  }));

  const isDragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const dragMoved = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Clamp position within viewport
  const clamp = useCallback(
    (x: number, y: number) => ({
      x: Math.max(0, Math.min(x, window.innerWidth - BUTTON_SIZE)),
      y: Math.max(0, Math.min(y, window.innerHeight - BUTTON_SIZE)),
    }),
    []
  );

  // Re-clamp on window resize
  useEffect(() => {
    const onResize = () => setPos((p) => clamp(p.x, p.y));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [clamp]);

  // Global mouse/touch move & up listeners
  useEffect(() => {
    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging.current) return;
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
      const newX = clientX - dragOffset.current.x;
      const newY = clientY - dragOffset.current.y;
      const moved = Math.abs(newX - pos.x) > 4 || Math.abs(newY - pos.y) > 4;
      if (moved) dragMoved.current = true;
      setPos(clamp(newX, newY));
    };

    const onUp = () => {
      if (!isDragging.current) return;
      isDragging.current = false;
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onUp);
    };
  }, [clamp, pos.x, pos.y]);

  const onPointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    isDragging.current = true;
    dragMoved.current = false;
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    dragOffset.current = { x: clientX - pos.x, y: clientY - pos.y };
    document.body.style.userSelect = "none";
    document.body.style.cursor = "grabbing";
  };

  const onPointerUp = () => {
    if (!dragMoved.current) {
      setIsOpen((prev) => !prev);
    }
  };

  // Panel positioning relative to button
  const panelBelow =
    pos.y + BUTTON_SIZE + PANEL_GAP + PANEL_HEIGHT < window.innerHeight;
  const panelRight = pos.x + PANEL_WIDTH < window.innerWidth;

  const panelStyle: React.CSSProperties = {
    position: "fixed",
    zIndex: 40,
    width: `min(${PANEL_WIDTH}px, 90vw)`,
    height: `min(${PANEL_HEIGHT}px, 55vh)`,
    top: panelBelow
      ? pos.y + BUTTON_SIZE + PANEL_GAP
      : pos.y - PANEL_GAP - Math.min(PANEL_HEIGHT, window.innerHeight * 0.55),
    left: panelRight
      ? pos.x
      : pos.x + BUTTON_SIZE - Math.min(PANEL_WIDTH, window.innerWidth * 0.9),
    background: "#111827",
    border: "1px solid #1f2937",
    borderRadius: "16px",
    boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
    fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    transformOrigin: `${panelRight ? "left" : "right"} ${panelBelow ? "top" : "bottom"}`,
    transform: isOpen ? "scale(1)" : "scale(0.85)",
    opacity: isOpen ? 1 : 0,
    pointerEvents: isOpen ? "all" : "none",
    transition:
      "transform 0.2s cubic-bezier(0.34,1.56,0.64,1), opacity 0.15s ease",
  };

  // Scroll to bottom on new messages
  useEffect(() => {
    if (isOpen) messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen]);

  // Focus input on open, clear unread
  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  // Helper: show error with auto-dismiss
  const showError = useCallback((message: string) => {
    setChatError(message);
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    errorTimerRef.current = setTimeout(() => setChatError(null), 5000);
  }, []);

  const dismissError = () => {
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    setChatError(null);
  };

  // WebSocket lifecycle
  useEffect(() => {
    const ws = new WebSocket(`${import.meta.env.VITE_CHAT_WS_URL}`);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("[Chat WS] onopen | readyState:", ws.readyState);
      ws.send(JSON.stringify({ type: "CHAT_JOIN", roomId }));
      console.log("[Chat WS] CHAT_JOIN sent for room:", roomId);
    };

    ws.onmessage = (event) => {
      let payload: any;
      try {
        payload = JSON.parse(event.data);
      } catch {
        console.warn("[Chat WS] Received malformed JSON");
        return;
      }

      switch (payload.type) {
        case "CHAT_HISTORY":
          setMessages(
            payload.messages.map((m: any) => ({
              ...m,
              timestamp: new Date(m.timestamp),
              isOwn: m.sender === userId,
            }))
          );
          break;

        case "CHAT_MESSAGE":
          setChatError(null); // clear any lingering error on success
          setMessages((prev) => [
            ...prev,
            {
              ...payload,
              timestamp: new Date(payload.timestamp),
              isOwn: payload.sender === userId,
            },
          ]);
          if (!isOpen) setUnreadCount((prev) => prev + 1);
          break;

        case "CHAT_ERROR":
          showError(payload.message ?? "An unknown error occurred.");
          break;

        case "CHAT_USER_LEFT":
          setMessages((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              sender: "system",
              content: "The other user has disconnected from the session.",
              timestamp: new Date(),
              isOwn: false,
            },
          ]);
          if (!isOpen) setUnreadCount((prev) => prev + 1);
          break;
        
        case "CHAT_AI_REQUEST":
          setIsAiThinking(true);
          break;
        
        case "CHAT_AI_RESPONSE":
          setIsAiThinking(false);
          setMessages((prev) => [...prev, {
              ...payload,
              timestamp: new Date(payload.timestamp),
              isOwn: false,
          }]);
          if (!isOpen) setUnreadCount((prev) => prev + 1);
          break;
        
        case "CHAT_AI_ERROR":
          setIsAiThinking(false);
          showError(payload.message ?? "AI request failed.");
          break;
        
        default:
          console.warn("[Chat WS] Unknown payload type:", payload.type);
      }
    };

    ws.onerror = (err) => {
      console.error("[Chat WS] Error:", err);
      showError("Connection error. Messages may not be delivered.");
    };

    ws.onclose = (e) => {
      console.log("[Chat WS] Disconnected | code:", e.code);
      if (e.code !== 1000 && e.code !== 1001) {
        // Abnormal closure — not a deliberate tab close
        showError("Disconnected from chat. Please refresh to reconnect.");
      }
    };

    return () => {
      wsRef.current = null;
      ws.onopen = null;
      ws.onmessage = null;
      ws.onerror = null;
      ws.onclose = null;
      ws.close();
    };
  }, [roomId, userId]);

  // Cleanup error timer on unmount
  useEffect(() => {
    return () => {
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    };
  }, []);

  const handleSend = () => {
    const trimmed = inputValue.trim();
    if (!trimmed || !wsRef.current) return;
    if (wsRef.current.readyState !== WebSocket.OPEN) {
      showError("Not connected. Please refresh to reconnect.");
      return;
    }
    setInputValue("");
    wsRef.current.send(
      JSON.stringify({ type: "CHAT_MESSAGE", roomId, content: trimmed })
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleAskAi = () => {
    const trimmed = inputValue.trim();
    if (!trimmed || !wsRef.current) return;
    if (wsRef.current.readyState !== WebSocket.OPEN) {
        showError("Not connected.");
        return;
    }
    setInputValue("");
    wsRef.current.send(JSON.stringify({
        type: "CHAT_AI_REQUEST",
        roomId,
        sessionId: roomId,
        prompt: trimmed,
    }));
  };

  const formatTime = (date: Date) =>
    date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <>
      {/* Draggable toggle button */}
      <div
        onMouseDown={onPointerDown}
        onMouseUp={onPointerUp}
        onTouchStart={onPointerDown}
        onTouchEnd={onPointerUp}
        aria-label={isOpen ? "Close chat" : "Open chat"}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && setIsOpen((p) => !p)}
        style={{
          position: "fixed",
          left: pos.x,
          top: pos.y,
          zIndex: 50,
          width: BUTTON_SIZE,
          height: BUTTON_SIZE,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: isDragging.current ? "grabbing" : "grab",
          background: isOpen
            ? "#374151"
            : "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
          boxShadow: isOpen
            ? "0 4px 14px rgba(0,0,0,0.35)"
            : "0 4px 20px rgba(99,102,241,0.5)",
          transition: "background 0.2s, box-shadow 0.2s",
          touchAction: "none",
          userSelect: "none",
        }}
      >
        {/* Drag hint ring */}
        <div
          style={{
            position: "absolute",
            inset: "-4px",
            borderRadius: "50%",
            border: "1.5px dashed rgba(255,255,255,0.15)",
            pointerEvents: "none",
          }}
        />

        {/* Unread badge */}
        {unreadCount > 0 && !isOpen && (
          <span
            style={{
              position: "absolute",
              top: "-3px",
              right: "-3px",
              width: "18px",
              height: "18px",
              fontSize: "10px",
              background: "#ef4444",
              color: "#fff",
              fontWeight: 700,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              lineHeight: 1,
            }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}

        <span style={{ fontSize: "20px", pointerEvents: "none" }}>
          {isOpen ? "✕" : "💬"}
        </span>
      </div>

      {/* Chat panel */}
      <div style={panelStyle}>
        {/* Header */}
        <div
          style={{
            height: "52px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "0 16px",
            background: "linear-gradient(90deg, #1f2937 0%, #111827 100%)",
            borderBottom: "1px solid #1f2937",
            flexShrink: 0,
          }}
        >
          <span
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: "#22c55e",
              boxShadow: "0 0 6px #22c55e",
              animation: "pulse 2s infinite",
            }}
          />
          <span
            style={{
              color: "#e5e7eb",
              fontSize: "13px",
              fontWeight: 600,
              letterSpacing: "0.04em",
            }}
          >
            ROOM CHAT
          </span>
          <span
            style={{
              marginLeft: "auto",
              color: "#4b5563",
              fontSize: "11px",
              fontFamily: "monospace",
            }}
          >
            #{roomId.slice(-6)}
          </span>
        </div>

        {/* Messages */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "12px",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            scrollbarWidth: "thin",
            scrollbarColor: "#374151 transparent",
          }}
        >
          {messages.length === 0 && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                gap: "8px",
                userSelect: "none",
              }}
            >
              <span style={{ fontSize: "32px" }}>👋</span>
              <span style={{ fontSize: "12px", color: "#4b5563", textAlign: "center" }}>
                No messages yet. Please be respectful and avoid sharing personal
                information.
              </span>
            </div>
          )}

          {messages.map((msg) => {
            const isSystem = msg.sender === "system";
            const isAI = msg.sender === "ai";

            return (
              <div
                key={msg.id}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: isSystem
                    ? "center"
                    : msg.isOwn
                    ? "flex-end"
                    : "flex-start",
                }}
              >
                {/* 🟡 System message */}
                {isSystem ? (
                  <span
                    style={{
                      fontSize: "11px",
                      color: "#fbbf24",
                      fontStyle: "italic",
                      padding: "3px 12px",
                      background: "#2d1f0a",
                      borderRadius: "999px",
                      userSelect: "none",
                    }}
                  >
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </span>
                ) : (
                  <>
                    {/* 👤 Sender label (hide for own + AI) */}
                    {!msg.isOwn && !isAI && (
                      <span
                        style={{
                          fontSize: "10px",
                          color: "#4b5563",
                          fontWeight: 600,
                          marginBottom: "2px",
                          paddingLeft: "4px",
                        }}
                      >
                        <ReactMarkdown>{msg.sender}</ReactMarkdown>
                      </span>
                    )}

                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-end",
                        gap: "6px",
                        flexDirection: msg.isOwn ? "row-reverse" : "row",
                      }}
                    >
                      {/* 💬 Message Bubble */}
                      {isAI ? (
                        <div
                          style={{
                            overflow: "hidden",
                            padding: "8px 12px",
                            maxWidth: "260px",
                            wordBreak: "break-word",
                            background: "linear-gradient(135deg, #064e3b, #065f46)",
                            color: "#6ee7b7",
                            borderRadius: "14px 14px 14px 4px",
                            fontSize: "13px",
                            lineHeight: "1.45",
                            border: "1px solid #10b981",
                          }}
                        >
                          <span
                            style={{
                              fontSize: "10px",
                              color: "#34d399",
                              fontWeight: 600,
                              display: "block",
                              marginBottom: "4px",
                            }}
                          >
                            ✨ AI Assistant
                          </span>
                          <ReactMarkdown   remarkPlugins={[remarkGfm, remarkBreaks]}
                            components={{
                              pre: ({ children }) => (
                                <pre style={{
                                  overflowX: "auto",
                                  whiteSpace: "pre-wrap",
                                  wordBreak: "break-word",
                                  background: "#022c22",
                                  borderRadius: "6px",
                                  padding: "8px",
                                  fontSize: "11px",
                                  margin: "4px 0",
                                }}>
                                  {children}
                                </pre>
                              ),
                              code: ({ children }) => (
                                <code style={{
                                  whiteSpace: "pre-wrap",
                                  wordBreak: "break-word",
                                  fontSize: "11px",
                                }}>
                                  {children}
                                </code>
                              ),
                              p: ({ children }) => (
                                <p style={{ margin: "2px 0" }}>{children}</p>
                              ),
                            }}
                          >
                            {msg.content}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        <div
                          style={{
                            padding: "8px 12px",
                            maxWidth: "240px",
                            wordBreak: "break-word",
                            background: msg.isOwn
                              ? "linear-gradient(135deg, #6366f1, #8b5cf6)"
                              : "#1f2937",
                            color: msg.isOwn ? "#fff" : "#d1d5db",
                            borderRadius: msg.isOwn
                              ? "14px 14px 4px 14px"
                              : "14px 14px 14px 4px",
                            fontSize: "13px",
                            lineHeight: "1.45",
                            boxShadow: msg.isOwn
                              ? "0 2px 8px rgba(99,102,241,0.3)"
                              : "0 2px 4px rgba(0,0,0,0.2)",
                          }}
                        >
                          {msg.content}
                        </div>
                      )}

                      {/* 🕒 Timestamp */}
                      <span
                        style={{
                          fontSize: "10px",
                          color: "#4b5563",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {formatTime(msg.timestamp)}
                      </span>
                    </div>
                  </>
                )}
              </div>
            );
          })}

          <div ref={messagesEndRef} />
        </div>

        {/* Error banner */}
        {chatError && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 12px",
              background: "#2d1a1a",
              borderTop: "1px solid #7f1d1d",
              color: "#f87171",
              fontSize: "12px",
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: "14px" }}>⚠️</span>
            <span style={{ flex: 1 }}>{chatError}</span>
            <button
              onClick={dismissError}
              style={{
                background: "none",
                border: "none",
                color: "#f87171",
                cursor: "pointer",
                fontSize: "14px",
                padding: 0,
                lineHeight: 1,
              }}
              aria-label="Dismiss error"
            >
              ✕
            </button>
          </div>
        )}

        {/* Input */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "12px",
            borderTop: "1px solid #1f2937",
            background: "#0d1117",
            flexShrink: 0,
          }}
        >
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message…"
            style={{
              flex: 1,
              color: "#e5e7eb",
              fontSize: "13px",
              caretColor: "#6366f1",
              padding: "8px 12px",
              background: "#1f2937",
              border: "1px solid #374151",
              borderRadius: "10px",
              outline: "none",
              transition: "border-color 0.15s",
            }}
            onFocus={(e) => (e.target.style.borderColor = "#6366f1")}
            onBlur={(e) => (e.target.style.borderColor = "#374151")}
          />
          <button
            onClick={handleSend}
            disabled={!inputValue.trim()}
            style={{
              flexShrink: 0,
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: inputValue.trim()
                ? "linear-gradient(135deg, #6366f1, #8b5cf6)"
                : "#1f2937",
              border: "none",
              cursor: inputValue.trim() ? "pointer" : "default",
              opacity: inputValue.trim() ? 1 : 0.4,
              boxShadow: inputValue.trim()
                ? "0 2px 8px rgba(99,102,241,0.4)"
                : "none",
              transition: "all 0.15s",
            }}
            aria-label="Send message"
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
          <button
            onClick={handleAskAi}
            disabled={!inputValue.trim() || isAiThinking}
            title="Ask AI"
            style={{
                flexShrink: 0,
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: inputValue.trim() && !isAiThinking
                    ? "linear-gradient(135deg, #059669, #10b981)"
                    : "#1f2937",
                border: "none",
                cursor: inputValue.trim() && !isAiThinking ? "pointer" : "default",
                opacity: inputValue.trim() && !isAiThinking ? 1 : 0.4,
                fontSize: "16px",
                transition: "all 0.15s",
            }}
            aria-label="Ask AI">
            {isAiThinking ? "⏳" : "✨"}
          </button>
        </div>
      </div>
    </>
  );
}