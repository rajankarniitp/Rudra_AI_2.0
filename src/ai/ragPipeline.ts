/**
 * RAG Pipeline: Search → Scrape → Structured LLM Prompt → Structured JSON Response
 * Produces Perplexity-style answers with inline citations, images, and sections.
 */

import { searchWeb, enrichSources, WebSource } from "./webSearch";
import { callAI } from "./aiAdapter";

// ── Structured Response Types ──
export interface RAGImage {
  source_id: number;
  image_url: string;
  caption: string;
  placement_hint: string;  // e.g., "after_section_0"
}

export interface RAGSection {
  heading: string;
  content: string;   // Markdown with inline [1], [2] citations
}

export interface RAGCitation {
  id: number;
  title: string;
  url: string;
  favicon: string;
}

export interface RAGResponse {
  title: string;
  answer_sections: RAGSection[];
  images: RAGImage[];
  citations: RAGCitation[];
  summary_points: string[];
  raw_text?: string;    // Fallback if JSON parsing fails
  error?: string;
}

// ── Build RAG Prompt ──
function buildRAGPrompt(query: string, sources: WebSource[]): string {
  const sourcesBlock = sources.map((s, i) => {
    return `[Source ${s.id}] Title: ${s.title}\nURL: ${s.url}\nImage: ${s.image_url}\nContent: ${s.content.slice(0, 1500)}\n`;
  }).join("\n---\n");

  return `You are Rudra AI, created by Rajan Kumar Karn (founder of DocMateX, IIT Patna).
You are a research assistant that provides accurate, well-cited answers based ONLY on the provided sources.

RULES:
1. Use ONLY information from the provided sources
2. Add inline citations like [1], [2] etc. after each claim
3. If sources conflict, mention the conflict
4. Never hallucinate or make up information
5. Be concise but thorough
6. Include relevant images from sources when available

SOURCES:
${sourcesBlock}

USER QUERY: ${query}

Respond in this EXACT JSON format (no additional text, just the JSON):
{
  "title": "Short descriptive title for the answer",
  "answer_sections": [
    {
      "heading": "Section heading",
      "content": "Markdown text with inline citations like [1]. Keep it informative."
    }
  ],
  "images": [
    {
      "source_id": 1,
      "image_url": "URL from the source's image if relevant",
      "caption": "Brief descriptive caption",
      "placement_hint": "after_section_0"
    }
  ],
  "citations": [
    {
      "id": 1,
      "title": "Source title",
      "url": "Source URL"
    }
  ],
  "summary_points": [
    "Key insight 1",
    "Key insight 2",
    "Key insight 3"
  ]
}

IMPORTANT: Return ONLY valid JSON, no markdown fences, no explanation.`;
}

// ── Parse LLM Response ──
function parseRAGResponse(text: string, sources: WebSource[]): RAGResponse {
  // Try to extract JSON from the response
  let jsonStr = text.trim();

  // Remove markdown code fences if present
  if (jsonStr.startsWith("```json")) {
    jsonStr = jsonStr.slice(7);
  } else if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.slice(3);
  }
  if (jsonStr.endsWith("```")) {
    jsonStr = jsonStr.slice(0, -3);
  }
  jsonStr = jsonStr.trim();

  try {
    const parsed = JSON.parse(jsonStr);

    // Inject favicons into citations from our source data
    const citations: RAGCitation[] = (parsed.citations || []).map((c: any) => {
      const matchingSource = sources.find(s => s.id === c.id);
      return {
        id: c.id,
        title: c.title || matchingSource?.title || "Source",
        url: c.url || matchingSource?.url || "",
        favicon: matchingSource?.favicon || `https://www.google.com/s2/favicons?domain=${new URL(c.url || "https://example.com").hostname}&sz=32`
      };
    });

    // Inject source images into images array if LLM didn't include them
    let images: RAGImage[] = parsed.images || [];
    if (images.length === 0) {
      // Auto-generate image entries from scraped sources
      sources.forEach((s, idx) => {
        if (s.image_url && idx < 2) {
          images.push({
            source_id: s.id,
            image_url: s.image_url,
            caption: s.title,
            placement_hint: `after_section_${Math.min(idx, (parsed.answer_sections?.length || 1) - 1)}`
          });
        }
      });
    }

    return {
      title: parsed.title || "Research Results",
      answer_sections: parsed.answer_sections || [{ heading: "", content: text }],
      images,
      citations,
      summary_points: parsed.summary_points || [],
    };
  } catch (err) {
    // JSON parsing failed — return as raw markdown
    console.warn("RAG JSON parse failed, using raw text");

    // Build citations from sources
    const citations: RAGCitation[] = sources.map(s => ({
      id: s.id,
      title: s.title,
      url: s.url,
      favicon: s.favicon
    }));

    // Build images from sources
    const images: RAGImage[] = sources
      .filter(s => s.image_url)
      .slice(0, 2)
      .map((s, idx) => ({
        source_id: s.id,
        image_url: s.image_url,
        caption: s.title,
        placement_hint: `after_section_${idx}`
      }));

    return {
      title: "Research Results",
      answer_sections: [{ heading: "", content: text }],
      images,
      citations,
      summary_points: [],
      raw_text: text
    };
  }
}

// ── Main RAG Pipeline ──
export async function runRAGPipeline(
  query: string,
  signal?: AbortSignal
): Promise<RAGResponse> {
  try {
    // Step 1: Search the web
    const searchResult = await searchWeb(query, 5, signal);

    if (searchResult.sources.length === 0) {
      // No web results — fall back to direct AI
      // No web results — fall back to structured internal knowledge
      const prompt = `You are Rudra AI. The user asked: "${query}".
      Since no web search results are available, answer from your own internal knowledge.
      
      Respond in this EXACT JSON format:
      {
        "title": "Descriptive Title",
        "answer_sections": [
          { "heading": "Section Title", "content": "Detailed explanation..." }
        ],
        "summary_points": [ "Key takeaway 1", "Key takeaway 2" ]
      }
      
      IMPORTANT: Return ONLY valid JSON. Do not include images or citations if you don't have sources.`;

      const aiRes = await callAI({
        prompt,
        max_tokens: 2048,
        temperature: 0.7,
        signal
      });

      try {
        const parsed = JSON.parse(aiRes.text.replace(/```json|```/g, "").trim());
        return {
          title: parsed.title || "AI Response",
          answer_sections: parsed.answer_sections || [{ heading: "", content: aiRes.text }],
          images: [],
          citations: [],
          summary_points: parsed.summary_points || [],
          raw_text: undefined
        };
      } catch {
        return {
          title: "AI Response",
          answer_sections: [{ heading: "", content: aiRes.text }],
          images: [],
          citations: [],
          summary_points: [],
          raw_text: aiRes.text
        };
      }
    }

    // Step 2: Enrich sources with scraped content
    const enriched = await enrichSources(searchResult.sources, signal);

    // Step 3: Build RAG prompt and call LLM
    const ragPrompt = buildRAGPrompt(query, enriched);
    const aiRes = await callAI({
      prompt: ragPrompt,
      max_tokens: 2048,
      temperature: 0.4,
      signal
    });

    if (signal?.aborted) {
      return { title: "", answer_sections: [], images: [], citations: [], summary_points: [], error: "Aborted" };
    }

    // Step 4: Parse structured response
    const response = parseRAGResponse(aiRes.text, enriched);
    return response;

  } catch (err: any) {
    if (err?.name === "AbortError") {
      return { title: "", answer_sections: [], images: [], citations: [], summary_points: [], error: "Aborted" };
    }
    console.error("RAG Pipeline error:", err);
    return {
      title: "Error",
      answer_sections: [{ heading: "", content: `Research error: ${err?.message || "Unknown error"}` }],
      images: [],
      citations: [],
      summary_points: [],
      error: err?.message
    };
  }
}
