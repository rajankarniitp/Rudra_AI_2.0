/**
 * Prompt templates for AI actions.
 * These functions return prompt strings for LLM calls.
 */

export function summarizePagePrompt(pageText: string, url: string, title: string) {
  return `Summarize the following web page for a general audience. Include key points and, if possible, a short bullet list. Page title: "${title}". URL: ${url}\n\nContent:\n${pageText}`;
}

export function translatePagePrompt(pageText: string, url: string, title: string, targetLang: string = "en") {
  return `Translate the following web page content into ${targetLang}. Page title: "${title}". URL: ${url}\n\nContent:\n${pageText}`;
}

export function explainSelectedTextPrompt(selectedText: string, url: string, title: string) {
  return `Explain the following selected text from a web page. Be concise and clear. Page title: "${title}". URL: ${url}\n\nSelected text:\n${selectedText}`;
}

export function generateLinkedInPostPrompt(pageText: string, url: string, title: string) {
  return `Write a LinkedIn post summarizing the following article. Make it engaging and professional. Page title: "${title}". URL: ${url}\n\nContent:\n${pageText}`;
}

export function detectIntentPrompt(input: string) {
  return `Classify the user's intent for the following input. Respond with one of: "navigate", "search", "summarize", "translate", "explain", "linkedin". Input: "${input}"`;
}
