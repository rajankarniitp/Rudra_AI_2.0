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

const SparkIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" focusable="false">
    <path
      d="M9 1l1.3 3.8 3.7 1.3-3.7 1.3L9 11l-1.3-3.6-3.7-1.3 3.7-1.3L9 1zM4.4 10.8l0.9 2.6 2.6 0.9-2.6 0.9-0.9 2.6-0.9-2.6-2.6-0.9 2.6-0.9 0.9-2.6zm9.2 0l0.9 2.6 2.6 0.9-2.6 0.9-0.9 2.6-0.9-2.6-2.6-0.9 2.6-0.9 0.9-2.6z"
      fill="currentColor"
      fillRule="evenodd"
    />
  </svg>
);

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
    >
      <div className="sidebar-header">
        <div className="sidebar-header__row">
          <span className="sidebar-header__icon">
            <SparkIcon />
          </span>
          <div className="sidebar-header__titles">
            <h2 className="sidebar-header__title">Assistant</h2>
            <span className="sidebar-header__subtitle">Next-gen context on demand</span>
          </div>
          {typeof onClose === "function" && (
            <button
              onClick={onClose}
              aria-label="Close Assistant"
              className="sidebar-header__close"
            >
              ×
            </button>
          )}
        </div>
        <div className="sidebar-controls">
          <label className="sidebar-provider">
            <span className="sidebar-provider__label">Model</span>
            <select
              value={provider}
              onChange={e => onProviderChange(e.target.value as "openai" | "gemini")}
              className="sidebar-provider__select"
              aria-label="Select AI Provider"
            >
              <option value="openai">Advanced</option>
              <option value="gemini">Best</option>
            </select>
          </label>
        </div>
        <div className="sidebar-actions">
          <button onClick={() => onAction("summarize")}>Summarize page</button>
          <button onClick={() => onAction("translate")}>Translate page</button>
          <button onClick={() => onAction("explain")}>Explain selected</button>
          <button onClick={() => onAction("linkedin")}>Generate LinkedIn post</button>
        </div>
      </div>
      <div className="chat-history">
        {chatHistory.length === 0 && (
          <div className="empty-chat">
            <span>No messages yet. Ask anything about the page.</span>
          </div>
        )}
        {chatHistory.map((msg, i) => (
          <div
            key={i}
            className={`chat-msg ${msg.role}`}
          >
            {msg.role === "ai" ? (
              <AIResponseWithRelated content={msg.content} />
            ) : (
              msg.content
            )}
          </div>
        ))}
        {loading && (
          <div className="chat-msg ai loading">
            AI is thinking…
          </div>
        )}
      </div>
      <div className="chat-input">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter") handleSend();
          }}
          placeholder="Ask anything..."
        />
        <button
          onClick={handleSend}
          aria-label="Send"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" focusable="false">
            <path d="M3 2l12 7-12 7 3-7-3-7z" fill="currentColor" />
          </svg>
        </button>
      </div>
    </div>
  );
};

/**
 * Renders AI response with a "Related Content" section if present.
 */
const AIResponseWithRelated: React.FC<{ content: string }> = ({ content }) => {
  // Try to extract "Related Content" section (markdown heading or bold)
  const relatedRegex = /(?:^|\n)#+\s*Related Content[\s\S]*?((?:\n[-*].+)+)/i;
  const match = content.match(relatedRegex);
  let mainContent = content;
  let relatedContent = "";

  if (match) {
    mainContent = content.slice(0, match.index).trim();
    relatedContent = match[1].trim();
  } else {
    // Try with bold or plain text
    const altRegex = /(?:^|\n)(?:\*\*|__)?Related Content(?:\*\*|__)?[\s\S]*?((?:\n[-*].+)+)/i;
    const altMatch = content.match(altRegex);
    if (altMatch) {
      mainContent = content.slice(0, altMatch.index).trim();
      relatedContent = altMatch[1].trim();
    }
  }

  return (
    <div>
      <ReactMarkdown
        components={{
          h1: ({ node, ...props }) => <h1 style={{ fontSize: 20, margin: "12px 0 8px 0", color: "var(--accent)" }} {...props} />,
          h2: ({ node, ...props }) => <h2 style={{ fontSize: 17, margin: "10px 0 6px 0", color: "var(--accent)" }} {...props} />,
          h3: ({ node, ...props }) => <h3 style={{ fontSize: 15, margin: "8px 0 4px 0", color: "var(--accent)" }} {...props} />,
          ul: ({ node, ...props }) => <ul style={{ margin: "8px 0 8px 18px" }} {...props} />,
          ol: ({ node, ...props }) => <ol style={{ margin: "8px 0 8px 18px" }} {...props} />,
          li: ({ node, ...props }) => <li style={{ marginBottom: 4 }} {...props} />,
          code: ({ node, ...props }) => <code style={{ background: "rgba(12,22,34,0.85)", padding: "2px 6px", borderRadius: 6, fontSize: 13 }} {...props} />,
          pre: ({ node, ...props }) => <pre style={{ background: "rgba(12,22,34,0.9)", padding: 12, borderRadius: 8, fontSize: 13, overflowX: "auto" }} {...props} />,
          a: ({ node, ...props }) => <a style={{ color: "var(--accent)" }} target="_blank" rel="noopener noreferrer" {...props} />
        }}
      >
        {mainContent}
      </ReactMarkdown>
      {relatedContent && (
        <div
          style={{
            marginTop: 16,
            padding: "12px 16px",
            background: "rgba(31, 209, 255, 0.08)",
            borderRadius: 12,
            border: "1.5px solid rgba(31, 209, 255, 0.35)",
            boxShadow: "0 12px 30px rgba(12, 32, 48, 0.35)"
          }}
        >
          <div style={{ color: "var(--accent)", fontWeight: 700, marginBottom: 6, fontSize: 15 }}>
            Related Content
          </div>
          <ReactMarkdown
            components={{
              ul: ({ node, ...props }) => <ul style={{ margin: "0 0 0 18px" }} {...props} />,
              ol: ({ node, ...props }) => <ol style={{ margin: "0 0 0 18px" }} {...props} />,
              li: ({ node, ...props }) => <li style={{ marginBottom: 3 }} {...props} />,
              a: ({ node, ...props }) => <a style={{ color: "var(--accent)" }} target="_blank" rel="noopener noreferrer" {...props} />
            }}
          >
            {relatedContent}
          </ReactMarkdown>
        </div>
      )}
    </div>
  );
};

export default SidebarChat;
