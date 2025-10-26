import React from "react";
import AddressBar from "./AddressBar";

/**
 * NewTabPage component.
 * - Shows a custom background image and a centered AddressBar.
 * - Mimics the look of Chrome/Comet new tab page.
 */
interface NewTabPageProps {
  value: string;
  onNavigate: (input: string) => void;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  variant?: "hero" | "compact";
  suggestions?: string[];
}

export const quickLinks = [
  { label: "AI News Roundup", query: "Latest breakthroughs in artificial intelligence" },
  { label: "Compare models", query: "Compare GPT-4o with Gemini 2.0" },
  { label: "Market insights", query: "What happened in global markets today?" },
  { label: "Explain a topic", query: "Explain quantum computing like I'm new to it" }
];

const NewTabPage: React.FC<NewTabPageProps> = ({ value, onNavigate, onChange, variant = "hero", suggestions }) => {
  return (
    <div className="new-tab">
      <div className="new-tab__halo" aria-hidden="true" />
      <div className="new-tab__content">
        <div className="new-tab__badge">Rudra AI</div>
        <h1 className="new-tab__headline">Ask anything, explore everything.</h1>
        <p className="new-tab__tagline">Live browsing with next-gen inspired intelligence — stay curious without leaving the page.</p>
        <AddressBar
          value={value}
          onNavigate={onNavigate}
          onChange={onChange}
          variant={variant === "hero" ? "hero" : "default"}
          suggestions={suggestions}
        />
        <div className="new-tab__chips">
          {quickLinks.map(link => (
            <button
              type="button"
              key={link.label}
              className="new-tab__chip"
              onClick={() => onNavigate(link.query)}
            >
              {link.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default NewTabPage;
