declare module "@testing-library/react";

interface RudraElectronAPI {
  getEnv: (key: string) => Promise<string | undefined>;
  readSession?: () => Promise<string | null>;
  writeSession?: (snapshot: string) => Promise<void>;
  clearSession?: () => Promise<void>;
}

declare global {
  interface Window {
    electronAPI?: RudraElectronAPI;
    SpeechRecognition?: any;
    webkitSpeechRecognition?: any;
  }
}
