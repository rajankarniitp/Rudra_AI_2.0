import React from "react";
import ReactMarkdown from "react-markdown";

/**
 * SidebarChat component.
 * - Displays chat UI and action buttons for AI features.
 * - Handles user input and triggers AI actions.
 */
interface SidebarChatProps {
  onAction: (action: "summarize" | "translate" | "explain" | "linkedin" | "custom", payload?: any) => void;
  chatHistory: { role: "user" | "ai"; content: string }[];
  loading?: boolean;
  provider: "openai" | "gemini";
  onProviderChange: (provider: "openai" | "gemini") => void;
  onClose?: () => void;
}

const SidebarChat: React.FC<SidebarChatProps> = ({ onAction, chatHistory, loading, provider, onProviderChange, onClose }) => {
  // Chat input state
  const [input, setInput] = React.useState("");

  const handleSend = () => {
    if (input.trim()) {
      onAction("custom", { text: input.trim() });
      setInput("");
    }
  };

  return (
    <div
      className="sidebar-chat"
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "radial-gradient(circle at 60% 20%, #23272f 60%, #181a20 100%)",
        position: "relative",
        overflow: "hidden"
      }}
    >
      {/* Curved SVG background at the top */}
      <svg
        width="100%"
        height="80"
        viewBox="0 0 340 80"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          zIndex: 0,
          pointerEvents: "none"
        }}
      >
        <path
          d="M0,80 Q170,-40 340,80"
          stroke="#00bcd4"
          strokeWidth="3"
          fill="none"
          opacity="0.18"
        />
      </svg>
      <div className="sidebar-header" style={{ paddingBottom: 8, position: "relative" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 22, color: "#00bcd4" }}>🤖</span>
          <h2 style={{ margin: 0, fontSize: "1.3rem" }}>Assistant</h2>
          {typeof onClose === "function" && (
            <button
              onClick={onClose}
              aria-label="Close Assistant"
              style={{
                position: "absolute",
                top: 8,
                right: 8,
                background: "none",
                border: "none",
                color: "#888",
                fontSize: 22,
                cursor: "pointer",
                padding: 4,
                zIndex: 2
              }}
            >
              ×
            </button>
          )}
        </div>
        <div style={{ marginTop: 10, marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
          <select
            value={provider}
            onChange={e => onProviderChange(e.target.value as "openai" | "gemini")}
            style={{
              background: "#23272f",
              color: "#00bcd4",
              border: "1px solid #00bcd4",
              borderRadius: 16,
              fontSize: 14,
              padding: "4px 18px",
              cursor: "pointer",
              fontWeight: 600,
              outline: "none",
              boxShadow: "0 1px 4px #00bcd422"
            }}
            aria-label="Select AI Provider"
          >
            <option value="openai">OpenAI</option>
            <option value="gemini">Gemini</option>
          </select>
        </div>
        <div className="sidebar-actions" style={{ marginTop: 0, marginBottom: 8 }}>
          <button onClick={() => onAction("summarize")}>Summarize page</button>
          <button onClick={() => onAction("translate")}>Translate page</button>
          <button onClick={() => onAction("explain")}>Explain selected</button>
          <button onClick={() => onAction("linkedin")}>Generate LinkedIn post</button>
        </div>
      </div>
      <div
        className="chat-history"
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "8px 0 8px 0",
          background: "url('/backgrounds/rudra-ai-bg.png') center center / 60% no-repeat",
          opacity: 0.95,
          position: "relative"
        }}
      >
        {/* Large faded RUDRA watermark */}
        <div
          style={{
            position: "absolute",
            top: "30%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            fontSize: "5rem",
            fontWeight: 900,
            color: "#00bcd4",
            opacity: 0.08,
            letterSpacing: 8,
            pointerEvents: "none",
            userSelect: "none",
            zIndex: 0,
            fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif"
          }}
        >
          RUDRA
        </div>
        {chatHistory.length === 0 && (
          <div className="empty-chat" style={{ color: "#aaa", textAlign: "center", marginTop: 32 }}>
            <span style={{ fontSize: 18 }}>No messages yet.</span>
          </div>
        )}
        {chatHistory.map((msg, i) => (
          <div
            key={i}
            className={`chat-msg ${msg.role}`}
            style={{
              background: msg.role === "user" ? "#23272f" : "#1a1d23",
              color: msg.role === "user" ? "#fff" : "#b2faff",
              alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
              borderRadius: 16,
              padding: "10px 16px",
              margin: "8px 0",
              maxWidth: "80%",
              fontSize: 15,
              boxShadow: msg.role === "ai" ? "0 2px 8px #00bcd4aa" : "none",
              overflowWrap: "anywhere"
            }}
          >
            {msg.role === "ai" ? (
              <ReactMarkdown
                components={{
                  h1: ({ node, ...props }) => <h1 style={{ fontSize: 20, margin: "12px 0 8px 0", color: "#00bcd4" }} {...props} />,
                  h2: ({ node, ...props }) => <h2 style={{ fontSize: 17, margin: "10px 0 6px 0", color: "#00bcd4" }} {...props} />,
                  h3: ({ node, ...props }) => <h3 style={{ fontSize: 15, margin: "8px 0 4px 0", color: "#00bcd4" }} {...props} />,
                  ul: ({ node, ...props }) => <ul style={{ margin: "8px 0 8px 18px" }} {...props} />,
                  ol: ({ node, ...props }) => <ol style={{ margin: "8px 0 8px 18px" }} {...props} />,
                  li: ({ node, ...props }) => <li style={{ marginBottom: 4 }} {...props} />,
                  code: ({ node, ...props }) => <code style={{ background: "#222", padding: "2px 6px", borderRadius: 6, fontSize: 13 }} {...props} />,
                  pre: ({ node, ...props }) => <pre style={{ background: "#222", padding: 12, borderRadius: 8, fontSize: 13, overflowX: "auto" }} {...props} />,
                  a: ({ node, ...props }) => <a style={{ color: "#00bcd4" }} target="_blank" rel="noopener noreferrer" {...props} />
                }}
              >
                {msg.content}
              </ReactMarkdown>
            ) : (
              msg.content
            )}
          </div>
        ))}
        {loading && (
          <div className="chat-msg ai loading" style={{ fontStyle: "italic", color: "#b2faff" }}>
            AI is thinking…
          </div>
        )}
      </div>
      <div
        className="chat-input"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "12px 8px 8px 8px",
          borderTop: "1px solid #222",
          background: "rgba(24,26,32,0.95)"
        }}
      >
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter") handleSend();
          }}
          placeholder="Ask anything…"
          style={{
            flex: 1,
            background: "#23272f",
            color: "#e6e6e6",
            border: "1px solid #333",
            borderRadius: 12,
            padding: "10px 16px",
            fontSize: 15,
            outline: "none"
          }}
        />
        <button
          onClick={handleSend}
          style={{
            background: "#00bcd4",
            color: "#181a20",
            border: "none",
            borderRadius: 12,
            padding: "8px 16px",
            fontWeight: 700,
            fontSize: 18,
            cursor: "pointer",
            transition: "background 0.2s"
          }}
          aria-label="Send"
        >
          <span style={{ fontSize: 20 }}>➤</span>
        </button>
      </div>
    </div>
  );
};

export default SidebarChat;
