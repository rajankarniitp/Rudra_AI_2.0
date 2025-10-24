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
}

const NewTabPage: React.FC<NewTabPageProps> = ({ value, onNavigate, onChange }) => {
  return (
    <div
      style={{
        flex: 1,
        height: "100%",
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "url('backgrounds/rudra-ai-bg.png') center center / cover no-repeat, #181a20"
      }}
    >
      <div style={{
        background: "rgba(24,26,32,0.85)",
        borderRadius: 16,
        boxShadow: "0 4px 32px #0008",
        padding: "48px 32px",
        minWidth: 400,
        maxWidth: 600,
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center"
      }}>
        <h1 style={{
          color: "#00bcd4",
          fontSize: "2.2rem",
          fontWeight: 700,
          marginBottom: 32,
          letterSpacing: 1
        }}>
          Rudra AI
        </h1>
        <AddressBar
          value={value}
          onNavigate={onNavigate}
          onChange={onChange}
        />
      </div>
    </div>
  );
};

export default NewTabPage;
