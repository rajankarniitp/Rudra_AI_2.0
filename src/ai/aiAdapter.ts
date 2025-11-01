/**
 * AI Adapter: Generic interface to call LLMs (OpenAI, Gemini, etc.)
 * Usage: callAI({ prompt, model, stream, ... })
 * Reads API key from process.env.AI_API_KEY (via Electron preload bridge).
 */

type AIProvider = "openai" | "gemini";

export interface CallAIPayload {
  prompt: string;
  model?: string;
  stream?: boolean;
  max_tokens?: number;
  temperature?: number;
  signal?: AbortSignal;
  // Add more as needed
}

export interface AIResponse {
  text: string;
  sources?: { title: string; url: string }[];
  // Add more as needed
}

export async function callAI(payload: CallAIPayload): Promise<AIResponse> {
  // Determine mode and provider
  const aiMode = (await window.electronAPI.getEnv("AI_MODE")) || "best";
  let provider: AIProvider;
  if (aiMode === "best") {
    provider = "gemini";
  } else if (aiMode === "advance") {
    provider = "openai";
  } else {
    // fallback to AI_PROVIDER or default to openai
    provider = ((await window.electronAPI.getEnv("AI_PROVIDER")) as AIProvider) || "openai";
  }

  const openaiKey = await window.electronAPI.getEnv("OPEN_AI_API_KEY");
  const geminiKey = await window.electronAPI.getEnv("GEMINI_API_KEY");
  const geminiModel = (await window.electronAPI.getEnv("GEMINI_MODEL")) || "models/gemini-2.5-pro";

  if (provider === "openai") {
    if (!openaiKey) {
      throw new Error("OpenAI API key not set. Please check your .env file and restart the app.");
    }
    console.log("Renderer: Using OPEN_AI_API_KEY:", openaiKey ? "[set]" : "[not set]");
    return callOpenAI(payload, openaiKey);
  } else if (provider === "gemini") {
    if (!geminiKey) {
      throw new Error("Gemini API key not set. Please check your .env file and restart the app.");
    }
    console.log("Renderer: Using GEMINI_API_KEY:", geminiKey ? "[set]" : "[not set]");
    return callGemini(payload, geminiKey, geminiModel);
  } else {
    throw new Error("Unsupported AI provider: " + provider);
  }
}

// Example: OpenAI (ChatGPT) call
async function callOpenAI(payload: CallAIPayload, apiKey: string): Promise<AIResponse> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    signal: payload.signal,
    body: JSON.stringify({
      model: payload.model || "gpt-3.5-turbo",
      messages: [{ role: "user", content: payload.prompt }],
      max_tokens: payload.max_tokens || 512,
      temperature: payload.temperature || 0.7,
      stream: payload.stream || false
    })
  });
  const data = await res.json();
  return {
    text: data.choices?.[0]?.message?.content || "",
    // Optionally parse sources from response
  };
}

// Gemini Pro API call (text-only)
async function callGemini(payload: CallAIPayload, apiKey: string, model: string): Promise<AIResponse> {
  // Gemini API endpoint (text-only)
  const endpoint = `https://generativelanguage.googleapis.com/v1/${model}:generateContent?key=${apiKey}`;
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      signal: payload.signal,
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: payload.prompt }]
          }
        ]
      })
    });
    const data = await res.json();
    if (data.error) {
      // Show Gemini API error in chat
      let errorMsg = `Gemini API error: ${data.error.message || JSON.stringify(data.error)}`;
      // If model not found, list available models
      if (
        data.error.message &&
        data.error.message.includes("model") &&
        data.error.message.includes("not found")
      ) {
        // Try to list available models
        try {
          const listRes = await fetch(
            "https://generativelanguage.googleapis.com/v1/models?key=" + apiKey
          );
          const listData = await listRes.json();
          if (listData.models) {
            errorMsg +=
              "\nAvailable models:\n" +
              listData.models.map((m: any) => m.name).join("\n");
          }
        } catch (listErr: any) {
          errorMsg += "\nCould not list models: " + (listErr?.message || listErr);
        }
      }
      return {
        text: errorMsg
      };
    }
    // Gemini returns candidates[0].content.parts[0].text
    const text =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "No response from Gemini.";
    return {
      text
    };
  } catch (err: any) {
    return {
      text: "Gemini API error: " + (err.message || "Unknown error")
    };
  }
}
