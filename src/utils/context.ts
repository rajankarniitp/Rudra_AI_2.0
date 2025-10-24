/**
 * Utility to extract selected text from an Electron webview.
 * Returns a Promise<string> with the selected text, or empty string if none.
 */
export async function getWebviewSelectedText(webview: any): Promise<string> {
  if (!webview) return "";
  try {
    // Execute JS in the webview to get the selected text
    const selected = await webview.executeJavaScript("window.getSelection().toString()");
    return selected || "";
  } catch {
    return "";
  }
}
