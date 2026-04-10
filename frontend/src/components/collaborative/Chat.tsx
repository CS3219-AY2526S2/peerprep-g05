import { useEffect, useRef, useState, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";

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
const PANEL_GAP = 12; // gap between button and panel

export function Chat({ roomId, username = "You" }: ChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);
  const { user } = useAuth();
  const userId = user?.id ?? "";

  // Button position (top-left corner), defaults to bottom-right
  const [pos, setPos] = useState(() => ({
    x: window.innerWidth - BUTTON_SIZE - 20,
    y: window.innerHeight - BUTTON_SIZE - 20,
  }));

  const isDragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const dragMoved = useRef(false); // distinguish click vs drag
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Clamp position within viewport
  const clamp = useCallback((x: number, y: number) => ({
    x: Math.max(0, Math.min(x, window.innerWidth - BUTTON_SIZE)),
    y: Math.max(0, Math.min(y, window.innerHeight - BUTTON_SIZE)),
  }), []);

  // Re-clamp on window resize
  useEffect(() => {
    const onResize = () => setPos((p) => clamp(p.x, p.y));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [clamp]);

  // Global mouse/touch move & up listeners (attached only while dragging)
  useEffect(() => {
    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging.current) return;
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
      const newX = clientX - dragOffset.current.x;
      const newY = clientY - dragOffset.current.y;
      const moved =
        Math.abs(newX - (pos.x)) > 4 || Math.abs(newY - (pos.y)) > 4;
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

  // Decide which side to open the panel (above/below, left/right of button)
  const panelBelow = pos.y + BUTTON_SIZE + PANEL_GAP + PANEL_HEIGHT < window.innerHeight;
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
    transition: "transform 0.2s cubic-bezier(0.34,1.56,0.64,1), opacity 0.15s ease",
  };

  // Scroll to bottom on new messages
  useEffect(() => {
    if (isOpen) messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  useEffect(() => {
    const ws = new WebSocket(`${import.meta.env.VITE_CHAT_WS_URL}`);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("[Chat WS] onopen | readyState:", ws.readyState);
      ws.send(JSON.stringify({ type: "CHAT_JOIN", roomId }));
      console.log("[Chat WS] CHAT_JOIN sent for room:", roomId);
    };

    ws.onmessage = (event) => {
      const payload = JSON.parse(event.data);

      if (payload.type === "CHAT_HISTORY") {
        setMessages(payload.messages.map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp),
          isOwn: m.sender === userId,
        })));
      }
      if (payload.type === "CHAT_MESSAGE") {
        setMessages((prev) => [...prev, {
          ...payload,
          timestamp: new Date(payload.timestamp),
          isOwn: payload.sender === userId,
        }]);
        if (!isOpen) setUnreadCount((prev) => prev + 1);
      }
    };

    ws.onerror = (err) => console.error("[Chat WS] Error:", err);
    ws.onclose = (e) => console.log("[Chat WS] Disconnected | code:", e.code);

    return () => {
      wsRef.current = null;
      ws.onopen = null;
      ws.onmessage = null;
      ws.onerror = null;
      ws.onclose = null;
      ws.close();
    };
  }, [roomId, userId]);

  const handleSend = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    setInputValue("");
    wsRef.current?.send(JSON.stringify({ type: "CHAT_MESSAGE", roomId, content: trimmed }));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
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
              <span style={{ fontSize: "12px", color: "#4b5563" }}>
                No messages yet. Please be respectful and avoid sharing personal information.
              </span>
            </div>
          )}
          {messages.map((msg) => (
            <div
              key={msg.id}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: msg.isOwn ? "flex-end" : "flex-start",
              }}
            >
              {!msg.isOwn && (
                <span
                  style={{
                    fontSize: "10px",
                    color: "#33347e",
                    fontWeight: 600,
                    marginBottom: "2px",
                    paddingLeft: "4px",
                  }}
                >
                  {msg.sender}
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
                <span style={{ fontSize: "10px", color: "#4b5563", whiteSpace: "nowrap" }}>
                  {formatTime(msg.timestamp)}
                </span>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

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
              boxShadow: inputValue.trim() ? "0 2px 8px rgba(99,102,241,0.4)" : "none",
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
        </div>
      </div>
    </>
  );
}