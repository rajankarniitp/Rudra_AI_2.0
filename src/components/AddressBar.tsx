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
}

const AddressBar: React.FC<AddressBarProps> = ({ onNavigate, value = "", onChange }) => {
  const [input, setInput] = useState(value);

  // Keep local state in sync with value prop
  React.useEffect(() => {
    setInput(value);
  }, [value]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNavigate(input.trim());
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    if (onChange) onChange(e);
  };

  return (
    <form className="address-bar" onSubmit={handleSubmit}>
      <input
        type="text"
        className="address-input"
        placeholder="Ask anything or navigate…"
        value={input}
        onChange={handleChange}
        autoFocus
        spellCheck
      />
      <button type="submit" className="go-btn" aria-label="Go">
        ➔
      </button>
    </form>
  );
};

export default AddressBar;
