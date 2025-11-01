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
  variant?: "default" | "hero";
  onBack?: () => void;
  onForward?: () => void;
  onRefresh?: () => void;
  canGoBack?: boolean;
  canGoForward?: boolean;
  showNavigation?: boolean;
}

const SearchIcon: React.FC = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    aria-hidden="true"
    focusable="false"
  >
    <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" fill="none" />
    <line x1="10.8" y1="10.8" x2="14" y2="14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const ArrowIcon: React.FC = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 18 18"
    aria-hidden="true"
    focusable="false"
  >
    <path
      d="M4 9h8.5l-3.2-3.2 1.1-1.1L15.2 9l-4.8 4.3-1.1-1.1L12.5 10H4z"
      fill="currentColor"
    />
  </svg>
);

const BackIcon: React.FC = () => (
  <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true" focusable="false">
    <path d="M14.5 3l-7 8 7 8" stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const ForwardIcon: React.FC = () => (
  <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true" focusable="false">
    <path d="M7.5 3l7 8-7 8" stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const RefreshIcon: React.FC = () => (
  <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true" focusable="false">
    <path
      d="M11 3.5a7.5 7.5 0 1 0 7.2 6h-1.9a5.6 5.6 0 1 1-1.6-3.8l-2 2h4.8V2l-1.9 1.9A7.5 7.5 0 0 0 11 3.5z"
      fill="currentColor"
    />
  </svg>
);

const AddressBar: React.FC<AddressBarProps> = ({
  onNavigate,
  value = "",
  onChange,
  suggestions = [],
  variant = "default",
  onBack,
  onForward,
  onRefresh,
  canGoBack = true,
  canGoForward = true,
  showNavigation = true
}) => {
  const [input, setInput] = useState(value);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filtered, setFiltered] = useState<string[]>([]);
  const [highlight, setHighlight] = useState(-1);

  const suggestionUniverse = React.useMemo(() => {
    const seen = new Set<string>();
    const ordered: string[] = [];
    suggestions.forEach(option => {
      const trimmed = option.trim();
      const key = trimmed.toLowerCase();
      if (trimmed && !seen.has(key)) {
        seen.add(key);
        ordered.push(trimmed);
      }
    });
    return ordered;
  }, [suggestions]);

  // Keep local state in sync with value prop
  React.useEffect(() => {
    setInput(value);
  }, [value]);

  const updateSuggestions = React.useCallback((raw: string) => {
    if (suggestionUniverse.length === 0) {
      setShowSuggestions(false);
      setFiltered([]);
      setHighlight(-1);
      return;
    }
    const trimmed = raw.trim();
    const lowerQuery = trimmed.toLowerCase();

    if (!trimmed) {
      setFiltered(suggestionUniverse.slice(0, 7));
      setShowSuggestions(true);
      setHighlight(-1);
      return;
    }

    const tokens = trimmed.split(/\s+/).filter(Boolean);
    const lastToken = tokens[tokens.length - 1] || "";
    const lastTokenLower = lastToken.toLowerCase();

    const dynamic = new Set<string>();

    suggestionUniverse.forEach(seed => {
      const seedLower = seed.toLowerCase();
      if (seedLower.includes(lowerQuery)) {
        dynamic.add(seed);
      }
      if (tokens.length >= 2 && seedLower.startsWith(lowerQuery) && seedLower !== lowerQuery) {
        dynamic.add(seed);
      }
    });

    if (lastToken.length >= 2) {
      suggestionUniverse.forEach(seed => {
        seed.split(/\s+/).forEach(word => {
          const wordLower = word.toLowerCase();
          if (wordLower.startsWith(lastTokenLower) && wordLower !== lastTokenLower) {
            const completed = [...tokens.slice(0, -1), word].join(" ");
            dynamic.add(completed);
          }
        });
      });
    }

    const templates = [
      `Latest ${trimmed} updates`,
      `Explain ${trimmed} in simple terms`,
      `How does ${trimmed} work`,
      `Best resources for ${trimmed}`,
      `Compare ${trimmed} alternatives`,
      `Research on ${trimmed}`,
      `Impact of ${trimmed}`
    ];
    templates.forEach(template => dynamic.add(template));

    const suffixes = [
      "news",
      "pricing",
      "market size",
      "case studies",
      "tutorial",
      "roadmap",
      "API integration"
    ];
    suffixes.forEach(suffix => dynamic.add(`${trimmed} ${suffix}`));

    const scored = Array.from(dynamic).map(value => {
      const valLower = value.toLowerCase();
      const rank =
        valLower === lowerQuery ? -1 :
        valLower.startsWith(lowerQuery) ? 0 :
        valLower.includes(lowerQuery) ? 1 : 2;
      const overlapScore = tokens.reduce((score, token) => {
        return valLower.includes(token.toLowerCase()) ? score + 1 : score;
      }, 0);
      const lengthScore = Math.abs(value.length - trimmed.length);
      return { value, rank, overlapScore, lengthScore };
    }).sort((a, b) =>
      a.rank - b.rank ||
      b.overlapScore - a.overlapScore ||
      a.lengthScore - b.lengthScore ||
      a.value.localeCompare(b.value)
    );

    const next = scored.map(entry => entry.value);
    const fallback = suggestionUniverse.filter(seed =>
      seed.toLowerCase().startsWith(lowerQuery)
    );

    const merged = [...next, ...fallback];
    const unique: string[] = [];
    const seenMerge = new Set<string>();
    merged.forEach(option => {
      const key = option.toLowerCase();
      if (!seenMerge.has(key)) {
        seenMerge.add(key);
        unique.push(option);
      }
    });

    setFiltered(unique.slice(0, 7));
    setShowSuggestions(unique.length > 0);
    setHighlight(-1);
  }, [suggestionUniverse]);

  React.useEffect(() => {
    if (showSuggestions) {
      updateSuggestions(input);
    }
  }, [suggestionUniverse, showSuggestions, input, updateSuggestions]);

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
    updateSuggestions(val);
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

  return (
    <div className={`address-shell address-shell--${variant}`}>
      <form className={`address-bar address-bar--${variant}`} onSubmit={handleSubmit} autoComplete="off">
        {showNavigation && (
          <>
            <button
              type="button"
              className="address-nav-btn"
              aria-label="Back"
              onClick={onBack}
              disabled={!canGoBack}
              style={{ opacity: canGoBack ? 1 : 0.4 }}
            >
              <BackIcon />
            </button>
            <button
              type="button"
              className="address-nav-btn"
              aria-label="Forward"
              onClick={onForward}
              disabled={!canGoForward}
              style={{ opacity: canGoForward ? 1 : 0.4 }}
            >
              <ForwardIcon />
            </button>
            <button
              type="button"
              className="address-nav-btn address-nav-btn--refresh"
              aria-label="Refresh"
              onClick={onRefresh}
            >
              <RefreshIcon />
            </button>
          </>
        )}
        <span className="address-icon">
          <SearchIcon />
        </span>
        <input
          type="text"
          className="address-input"
          placeholder="Ask anything or navigate..."
          value={input}
          onChange={handleChange}
          onFocus={() => updateSuggestions(input)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 120)}
          onKeyDown={handleKeyDown}
          autoFocus={variant === "hero"}
          spellCheck
          autoComplete="off"
        />
        <button type="submit" className="address-submit" aria-label="Search">
          <ArrowIcon />
        </button>
      </form>
      {showSuggestions && (
        <div className="address-suggestions">
          {(filtered.length > 0 ? filtered : suggestionUniverse.slice(0, 7)).map((s, i) => (
            <button
              type="button"
              key={s}
              className={`address-suggestion ${highlight === i ? "is-active" : ""}`}
              onMouseDown={() => handleSuggestionClick(s)}
              onMouseEnter={() => setHighlight(i)}
            >
              <span className="address-suggestion__text">{s}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default AddressBar;
