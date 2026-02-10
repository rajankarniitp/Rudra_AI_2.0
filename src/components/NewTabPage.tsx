import React from "react";
import ReactMarkdown from "react-markdown";

/**
 * NewTabPage – Perplexity/Comet-style AI chatbot interface.
 */
interface NewTabPageProps {
  value?: string;
  onNavigate: (input: string) => void;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  variant?: "hero" | "compact";
  suggestions?: string[];
  onAIChat?: (query: string) => void;
  chatHistory?: { role: "user" | "ai"; content: string }[];
  aiLoading?: boolean;
}

export const quickLinks = [
  { label: "Explain quantum computing", icon: "atom", query: "Explain quantum computing in simple terms" },
  { label: "Compare AI models", icon: "compare", query: "Compare GPT-4o with Gemini 2.5" },
  { label: "Market insights", icon: "chart", query: "What happened in global markets today?" },
  { label: "Latest in tech", icon: "bulb", query: "What are the latest breakthroughs in technology?" },
  { label: "How does AI work", icon: "brain", query: "How does artificial intelligence actually work?" },
  { label: "Space exploration", icon: "rocket", query: "What are the latest space exploration missions?" }
];

/* ── SVG Icon Components ── */

const ChipIcon: React.FC<{ icon: string }> = ({ icon }) => {
  switch (icon) {
    case "atom":
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="2" fill="currentColor" opacity="0.8" /><ellipse cx="8" cy="8" rx="7" ry="3" stroke="currentColor" strokeWidth="1.2" fill="none" opacity="0.5" /><ellipse cx="8" cy="8" rx="7" ry="3" stroke="currentColor" strokeWidth="1.2" fill="none" opacity="0.5" transform="rotate(60 8 8)" /><ellipse cx="8" cy="8" rx="7" ry="3" stroke="currentColor" strokeWidth="1.2" fill="none" opacity="0.5" transform="rotate(120 8 8)" /></svg>
      );
    case "compare":
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="4" width="5" height="8" rx="1.2" stroke="currentColor" strokeWidth="1.2" opacity="0.6" /><rect x="10" y="4" width="5" height="8" rx="1.2" stroke="currentColor" strokeWidth="1.2" opacity="0.6" /><path d="M6 8h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.8" /></svg>
      );
    case "chart":
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 14L6 8L9 10.5L14 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" /><circle cx="14" cy="3" r="1.5" fill="currentColor" opacity="0.6" /></svg>
      );
    case "bulb":
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2a4.5 4.5 0 0 0-2.5 8.2V12a1.5 1.5 0 0 0 1.5 1.5h2A1.5 1.5 0 0 0 10.5 12v-1.8A4.5 4.5 0 0 0 8 2z" stroke="currentColor" strokeWidth="1.2" opacity="0.7" /><path d="M6.5 14.5h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.5" /></svg>
      );
    case "brain":
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 3C6.5 3 5 4 5 5.5c0 1-.5 1.5-1 2s-.5 2 .5 3 3 1 3.5 1V3z" stroke="currentColor" strokeWidth="1.2" opacity="0.6" /><path d="M8 3c1.5 0 3 1 3 2.5 0 1 .5 1.5 1 2s.5 2-.5 3-3 1-3.5 1V3z" stroke="currentColor" strokeWidth="1.2" opacity="0.6" /></svg>
      );
    case "rocket":
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2C6 5.5 6 8 6.5 10.5L8 12.5l1.5-2C10 8 10 5.5 8 2z" stroke="currentColor" strokeWidth="1.2" opacity="0.7" /><path d="M6.5 10.5L4 12.5M9.5 10.5l2.5 2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.5" /><circle cx="8" cy="7" r="1.2" fill="currentColor" opacity="0.6" /></svg>
      );
    default:
      return null;
  }
};

// ── Rudra AI Icon Logo ──
const RudraLogo: React.FC<{ size?: number }> = ({ size = 44 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
    <defs>
      <linearGradient id="rudra-outer" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#1fd1ff" />
        <stop offset="50%" stopColor="#148bff" />
        <stop offset="100%" stopColor="#8b5cf6" />
      </linearGradient>
      <linearGradient id="rudra-inner" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#1fd1ff" />
        <stop offset="100%" stopColor="#148bff" />
      </linearGradient>
      <filter id="rudra-glow">
        <feGaussianBlur in="SourceGraphic" stdDeviation="2" />
      </filter>
    </defs>
    {/* Outer glow ring */}
    <circle cx="24" cy="24" r="22" stroke="url(#rudra-outer)" strokeWidth="1.5" fill="none" opacity="0.3" filter="url(#rudra-glow)" />
    {/* Main circle */}
    <circle cx="24" cy="24" r="20" fill="rgba(8,18,32,0.85)" stroke="url(#rudra-outer)" strokeWidth="2" />
    {/* Inner ring */}
    <circle cx="24" cy="24" r="15" fill="none" stroke="url(#rudra-inner)" strokeWidth="1" opacity="0.25" />
    {/* Center eye/trident motif */}
    <path d="M24 12 L24 36" stroke="url(#rudra-inner)" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
    <path d="M18 16 Q24 10 30 16" stroke="url(#rudra-inner)" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.5" />
    <circle cx="24" cy="24" r="5" fill="url(#rudra-outer)" opacity="0.9" />
    <circle cx="24" cy="24" r="2.5" fill="rgba(8,18,32,0.9)" />
    <circle cx="24" cy="24" r="1.2" fill="#1fd1ff" />
    {/* Side prongs */}
    <path d="M15 20 Q12 24 15 28" stroke="url(#rudra-inner)" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.4" />
    <path d="M33 20 Q36 24 33 28" stroke="url(#rudra-inner)" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.4" />
    {/* Orbiting dots */}
    <circle cx="24" cy="5" r="1.5" fill="#1fd1ff" opacity="0.7">
      <animateTransform attributeName="transform" type="rotate" from="0 24 24" to="360 24 24" dur="12s" repeatCount="indefinite" />
    </circle>
    <circle cx="24" cy="43" r="1" fill="#8b5cf6" opacity="0.5">
      <animateTransform attributeName="transform" type="rotate" from="180 24 24" to="540 24 24" dur="18s" repeatCount="indefinite" />
    </circle>
  </svg>
);

const SendIcon: React.FC = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M3.5 2L17 10L3.5 18L6.5 10.5L3.5 2Z" fill="currentColor" /></svg>
);

const SearchIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.6" fill="none" /><line x1="12" y1="12" x2="15.5" y2="15.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
);

const NewTabPage: React.FC<NewTabPageProps> = ({
  value,
  onNavigate,
  onChange,
  variant = "hero",
  suggestions,
  onAIChat,
  chatHistory = [],
  aiLoading = false,
}) => {
  const [input, setInput] = React.useState("");
  const chatEndRef = React.useRef<HTMLDivElement>(null);
  const hasChatContent = chatHistory.length > 0 || aiLoading;

  React.useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory.length, aiLoading]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;
    if (onAIChat) onAIChat(trimmed);
    setInput("");
  };

  const handleChipClick = (query: string) => {
    if (onAIChat) onAIChat(query);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };



  // ── Landing View ──
  if (!hasChatContent) {
    return (
      <div className="ntp">
        <div className="ntp__halo" aria-hidden="true" />
        <div className="ntp__particles" aria-hidden="true">
          <span className="ntp__particle ntp__particle--1" />
          <span className="ntp__particle ntp__particle--2" />
          <span className="ntp__particle ntp__particle--3" />
          <span className="ntp__particle ntp__particle--4" />
        </div>
        <div className="ntp__landing">
          <div className="ntp__brand">
            <RudraLogo size={52} />
            <div className="ntp__brand-info">
              <span className="ntp__brand-text">Rudra AI</span>
              <span className="ntp__brand-version">v2.0</span>
            </div>
          </div>
          <h1 className="ntp__headline">
            What do you want to<br />
            <span className="ntp__headline-accent">know today?</span>
          </h1>
          <p className="ntp__tagline">
            Ask anything — get intelligent, instant answers powered by AI.
          </p>

          <form className="ntp__searchbox" onSubmit={handleSubmit} autoComplete="off">
            <span className="ntp__searchbox-icon"><SearchIcon /></span>
            <input
              type="text"
              className="ntp__searchbox-input"
              placeholder="Ask anything..."
              value={input}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
            />

            <button type="submit" className="ntp__searchbox-submit" disabled={!input.trim()} aria-label="Ask AI">
              <SendIcon />
            </button>
          </form>

          <div className="ntp__chips">
            {quickLinks.map(link => (
              <button type="button" key={link.label} className="ntp__chip" onClick={() => handleChipClick(link.query)}>
                <span className="ntp__chip-icon"><ChipIcon icon={link.icon} /></span>
                <span>{link.label}</span>
              </button>
            ))}
          </div>

          <div className="ntp__footer">
            <RudraLogo size={16} />
            <span className="ntp__footer-text">Powered by <strong>Rudra 2.0</strong></span>
          </div>
        </div>

      </div>
    );
  }

  // ── Chat View ──
  return (
    <div className="ntp ntp--chat-active">
      <div className="ntp__halo" aria-hidden="true" />
      <div className="ntp__chat-container">
        <div className="ntp__chat-messages">
          {chatHistory.map((msg, i) => (
            <div key={i} className={`ntp__chat-bubble ntp__chat-bubble--${msg.role}`}>
              <div className="ntp__chat-avatar">
                {msg.role === "user" ? (
                  <div className="ntp__chat-avatar-user">You</div>
                ) : (
                  <div className="ntp__chat-avatar-ai"><RudraLogo size={28} /></div>
                )}
              </div>
              <div className="ntp__chat-content">
                <div className="ntp__chat-sender">{msg.role === "user" ? "You" : "Rudra AI"}</div>
                {msg.role === "ai" ? (
                  <div className="ntp__chat-markdown">
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
                    >{msg.content}</ReactMarkdown>
                  </div>
                ) : (
                  <div className="ntp__chat-text">{msg.content}</div>
                )}
              </div>
            </div>
          ))}
          {aiLoading && (
            <div className="ntp__chat-bubble ntp__chat-bubble--ai">
              <div className="ntp__chat-avatar">
                <div className="ntp__chat-avatar-ai"><RudraLogo size={28} /></div>
              </div>
              <div className="ntp__chat-content">
                <div className="ntp__chat-sender">Rudra AI</div>
                <div className="ntp__chat-thinking">
                  <span className="ntp__thinking-dot" /><span className="ntp__thinking-dot" /><span className="ntp__thinking-dot" />
                  <span className="ntp__thinking-label">Thinking...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
        <div className="ntp__chat-inputbar">
          <form className="ntp__chat-input-form" onSubmit={handleSubmit} autoComplete="off">
            <span className="ntp__chat-input-icon"><SearchIcon /></span>
            <input
              type="text"
              className="ntp__chat-input"
              placeholder="Ask a follow-up..."
              value={input}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
            />
            <button type="submit" className="ntp__chat-send" disabled={!input.trim() || aiLoading} aria-label="Send">
              <SendIcon />
            </button>
          </form>
          <div className="ntp__chat-footer">
            <RudraLogo size={14} />
            <span>Powered by <strong>Rudra 2.0</strong></span>
          </div>
        </div>
      </div>

    </div>
  );
};

export default NewTabPage;
