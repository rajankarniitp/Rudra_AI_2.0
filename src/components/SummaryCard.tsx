import React from "react";

/**
 * SummaryCard component.
 * - Displays AI output: summary, bullets, and sources.
 */
interface SummaryCardProps {
  summary: string;
  bullets?: string[];
  sources?: { title: string; url: string }[];
}

const SummaryCard: React.FC<SummaryCardProps> = ({ summary, bullets = [], sources = [] }) => (
  <div className="summary-card">
    <div className="summary-main">
      <p>{summary}</p>
      {bullets.length > 0 && (
        <ul>
          {bullets.map((b, i) => (
            <li key={i}>{b}</li>
          ))}
        </ul>
      )}
    </div>
    {sources.length > 0 && (
      <div className="summary-sources">
        <strong>Sources:</strong>
        <ul>
          {sources.map((src, i) => (
            <li key={i}>
              <a href={src.url} target="_blank" rel="noopener noreferrer">
                {src.title || src.url}
              </a>
            </li>
          ))}
        </ul>
      </div>
    )}
  </div>
);

export default SummaryCard;
