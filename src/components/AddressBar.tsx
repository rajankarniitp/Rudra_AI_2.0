import React, { useState } from "react";

/**
 * AddressBar component.
 * - Accepts URLs or natural language queries.
 * - On submit, triggers navigation or search.
 */
interface AddressBarProps {
  onNavigate: (input: string) => void;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  suggestions?: string[];
}

const AddressBar: React.FC<AddressBarProps> = ({ onNavigate, value = "", onChange, suggestions = [] }) => {
  const [input, setInput] = useState(value);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filtered, setFiltered] = useState<string[]>([]);
  const [highlight, setHighlight] = useState(-1);

  // Keep local state in sync with value prop
  React.useEffect(() => {
    setInput(value);
  }, [value]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNavigate(input.trim());
    setShowSuggestions(false);
    setHighlight(-1);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInput(val);
    if (onChange) onChange(e);
    // Filter suggestions (case-insensitive, contains)
    if (val.length > 0) {
      const filtered = suggestions.filter(s =>
        s.toLowerCase().includes(val.toLowerCase())
      );
      setFiltered(filtered.slice(0, 6));
      setShowSuggestions(filtered.length > 0);
    } else {
      setShowSuggestions(false);
      setFiltered([]);
    }
    setHighlight(-1);
  };

  const handleSuggestionClick = (s: string) => {
    setInput(s);
    setShowSuggestions(false);
    setHighlight(-1);
    onNavigate(s);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || filtered.length === 0) return;
    if (e.key === "ArrowDown") {
      setHighlight(h => (h + 1) % filtered.length);
      e.preventDefault();
    } else if (e.key === "ArrowUp") {
      setHighlight(h => (h - 1 + filtered.length) % filtered.length);
      e.preventDefault();
    } else if (e.key === "Enter" && highlight >= 0) {
      handleSuggestionClick(filtered[highlight]);
      e.preventDefault();
    }
  };

  // Example static suggestions (replace with API or recent searches for advanced)
  const staticSuggestions = [
    "OpenAI GPT-4",
    "Gemini AI",
    "Perplexity AI",
    "Latest AI news",
    "How to use Rudra AI",
    "AI browser extensions",
    "Best AI tools 2025",
    "AI for research",
    "AI for students",
    "AI for productivity"
  ];

  return (
    <div style={{ position: "relative", width: "100%" }}>
      <form className="address-bar" onSubmit={handleSubmit} autoComplete="off">
        <input
          type="text"
          className="address-input"
          placeholder="Ask anything or navigate…"
          value={input}
          onChange={handleChange}
          onFocus={handleChange}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 120)}
          onKeyDown={handleKeyDown}
          autoFocus
          spellCheck
          autoComplete="off"
        />
        <button type="submit" className="go-btn" aria-label="Go">
          ➔
        </button>
      </form>
      {showSuggestions && (
        <div
          style={{
            position: "absolute",
            top: "110%",
            left: 0,
            width: "100%",
            background: "#23272f",
            border: "1.5px solid #00bcd4",
            borderRadius: 10,
            boxShadow: "0 4px 24px #00bcd422",
            zIndex: 10,
            maxHeight: 220,
            overflowY: "auto"
          }}
        >
          {(filtered.length > 0 ? filtered : staticSuggestions).map((s, i) => (
            <div
              key={s}
              onMouseDown={() => handleSuggestionClick(s)}
              style={{
                padding: "10px 18px",
                color: "#00bcd4",
                background: highlight === i ? "#181a20" : "transparent",
                fontWeight: highlight === i ? 700 : 500,
                fontSize: 15,
                cursor: "pointer",
                borderBottom: "1px solid #222"
              }}
              onMouseEnter={() => setHighlight(i)}
            >
              {s}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AddressBar;
