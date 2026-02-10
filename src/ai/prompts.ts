/**
 * Prompt templates for AI actions.
 * These functions return prompt strings for LLM calls.
 */

export function summarizePagePrompt(pageText: string, url: string, title: string) {
  return `Summarize the following web page for a general audience. Keep the response concise and medium-length (avoid excessive tokens). Use a short bullet list for key points. suggest 3 related articles or topics at the end as "Related Content". Page title: "${title}". URL: ${url}\n\nContent:\n${pageText}`;
}

export function translatePagePrompt(pageText: string, url: string, title: string, targetLang: string = "en") {
  return `Translate the following web page content into ${targetLang}. Keep the translation accurate but concise if the content is very long. Page title: "${title}". URL: ${url}\n\nContent:\n${pageText}`;
}

export function explainSelectedTextPrompt(selectedText: string, url: string, title: string) {
  return `Explain the following selected text. Be concise, direct, and avoid unnecessary filler. Only specific detailed breakdown if explicitly asked. suggest 3 related topics at the end as "Related Content". Page title: "${title}". URL: ${url}\n\nSelected text:\n${selectedText}`;
}


export function detectIntentPrompt(input: string) {
  return `Classify the user's intent for the following input. Respond with ONE word: "navigate", "search", "summarize", "translate", or "explain". Input: "${input}"`;
}
