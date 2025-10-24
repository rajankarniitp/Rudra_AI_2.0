import React, { useEffect, useRef } from "react";

/**
 * PageView component.
 * - Renders the current web page using Electron's <webview>.
 * - Handles navigation, injects scripts for context extraction.
 */
interface PageViewProps {
  url: string;
  onTitleChange?: (title: string) => void;
  onDomExtract?: (text: string) => void;
  webviewRef?: React.RefObject<any>;
}

const PageView: React.FC<PageViewProps> = ({ url, onTitleChange, onDomExtract, webviewRef }) => {
  const localWebviewRef = useRef<any>(null);
  const ref = webviewRef || localWebviewRef;

  useEffect(() => {
    const webview = ref.current;
    if (!webview) return;

    // Listen for title updates
    const handlePageTitleUpdated = (e: any) => {
      if (onTitleChange) onTitleChange(e.title);
    };
    webview.addEventListener("page-title-updated", handlePageTitleUpdated);

    // Listen for DOM ready to extract text
    const handleDomReady = () => {
      if (onDomExtract) {
        webview.executeJavaScript("document.body.innerText").then((text: string) => {
          onDomExtract(text);
        });
      }
    };
    webview.addEventListener("dom-ready", handleDomReady);

    // Debug: Listen for did-finish-load
    const handleDidFinishLoad = () => {
      // @ts-ignore
      console.log("Webview loaded:", url);
    };
    webview.addEventListener("did-finish-load", handleDidFinishLoad);

    return () => {
      webview.removeEventListener("page-title-updated", handlePageTitleUpdated);
      webview.removeEventListener("dom-ready", handleDomReady);
      webview.removeEventListener("did-finish-load", handleDidFinishLoad);
    };
  }, [url, onTitleChange, onDomExtract, ref]);

  return (
    <webview
      ref={ref}
      src={url}
      style={{
        flex: "1 1 0%",
        width: "100%",
        height: "100%",
        border: "2px solid #00bcd4",
        background: "#111",
        zIndex: 1,
        display: "flex",
        minHeight: 0,
        minWidth: 0,
        boxSizing: "border-box"
      }}
      allowpopups={true}
      webpreferences="contextIsolation, nativeWindowOpen, javascript=yes"
      // onDidFinishLoad removed; handled in useEffect below
    />
  );
};

export default PageView;
