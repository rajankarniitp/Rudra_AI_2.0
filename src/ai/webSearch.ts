/**
 * Web Search + Article Scraper
 * Uses Tavily Search API for high-quality AI-optimised results, then scrapes articles for content and images.
 */

// ── Types ──
export interface WebSource {
  id: number;
  title: string;
  url: string;
  snippet: string;
  content: string;       // scraped article text
  image_url: string;     // og:image or largest img
  favicon: string;
}

export interface SearchResult {
  sources: WebSource[];
  query: string;
}

// ── Tavily Search API ──
const TAVILY_API_URL = "https://api.tavily.com/search";
const TAVILY_API_KEY = "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";

export async function searchWeb(query: string, count: number = 5, signal?: AbortSignal): Promise<SearchResult> {
  try {
    const res = await fetch(TAVILY_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        api_key: TAVILY_API_KEY,
        query: query,
        search_depth: "basic",
        include_images: true,
        include_answer: false,
        max_results: count
      }),
      signal
    });

    if (!res.ok) {
      console.warn("Tavily Search API failed:", res.status, res.statusText);
      return { sources: [], query };
    }

    const data = await res.json();
    const results = data.results || [];
    const images = data.images || [];

    const sources: WebSource[] = results.map((r: any, i: number) => ({
      id: i + 1,
      title: r.title || "Untitled",
      url: r.url || "",
      snippet: r.content || r.snippet || "",
      content: r.content || "", // Tavily gives good content directly
      // Assign an image from the images array to this source if available, matching by index
      image_url: images[i] || "",
      favicon: `https://www.google.com/s2/favicons?domain=${new URL(r.url || "https://example.com").hostname}&sz=32`
    }));

    return { sources, query };
  } catch (err: any) {
    console.warn("Search error:", err?.message);
    return { sources: [], query };
  }
}

// ── Article Scraper ──
export async function scrapeArticle(url: string, signal?: AbortSignal): Promise<{ content: string; image_url: string }> {
  try {
    const res = await fetch(url, {
      signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; RudraAI/2.0; +https://rudra.ai)"
      }
    });

    if (!res.ok) return { content: "", image_url: "" };

    const html = await res.text();
    return parseArticle(html, url);
  } catch (err: any) {
    // console.warn(`Scrape failed for ${url}:`, err?.message);
    return { content: "", image_url: "" };
  }
}

function parseArticle(html: string, baseUrl: string): { content: string; image_url: string } {
  // Parse using DOMParser (available in renderer process)
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  // ── Extract Image ──
  let image_url = "";

  // 1. Try og:image
  const ogImage = doc.querySelector('meta[property="og:image"]');
  if (ogImage) {
    image_url = ogImage.getAttribute("content") || "";
  }

  // 2. Try twitter:image
  if (!image_url) {
    const twitterImage = doc.querySelector('meta[name="twitter:image"]');
    if (twitterImage) {
      image_url = twitterImage.getAttribute("content") || "";
    }
  }

  // 3. Fallback: find largest img inside article/main
  if (!image_url) {
    const container = doc.querySelector("article") || doc.querySelector("main") || doc.body;
    const images = container.querySelectorAll("img");
    let bestImg = "";
    let bestSize = 0;

    images.forEach((img) => {
      const src = img.getAttribute("src") || "";
      const width = parseInt(img.getAttribute("width") || "0", 10);
      const height = parseInt(img.getAttribute("height") || "0", 10);
      const size = width * height;

      // Filter small icons, logos, ads
      if (width > 0 && width < 300) return;
      if (/logo|icon|avatar|ad|banner|sponsor/i.test(src)) return;
      if (/\.svg$/i.test(src)) return;

      if (size > bestSize || (!bestSize && src)) {
        bestImg = src;
        bestSize = size || 1;
      }
    });

    if (bestImg) {
      image_url = bestImg;
    }
  }

  // Resolve relative URLs
  if (image_url && !image_url.startsWith("http")) {
    try {
      image_url = new URL(image_url, baseUrl).href;
    } catch { /* ignore */ }
  }

  // ── Extract Text Content ──
  // Remove scripts, styles, nav, footer, aside
  const removeSelectors = ["script", "style", "nav", "footer", "aside", "header", "iframe", "form", ".ad", ".advertisement", ".sidebar"];
  removeSelectors.forEach(sel => {
    doc.querySelectorAll(sel).forEach(el => el.remove());
  });

  // Get main content
  const mainEl = doc.querySelector("article") || doc.querySelector("main") || doc.querySelector(".content") || doc.body;
  let text = (mainEl?.textContent || "").replace(/\s+/g, " ").trim();

  // Limit to ~3000 chars
  text = text.slice(0, 3000);

  return { content: text, image_url };
}

// ── Enrich Sources with Scraped Data ──
export async function enrichSources(sources: WebSource[], signal?: AbortSignal): Promise<WebSource[]> {
  // Scrape top 3 sources in parallel (to avoid timeout)
  const scrapeLimit = Math.min(sources.length, 3);
  const scrapePromises = sources.slice(0, scrapeLimit).map(async (source) => {
    try {
      const scraped = await scrapeArticle(source.url, signal);
      return {
        ...source,
        content: scraped.content || source.snippet, // Prefer scraped content, fallback to Tavily snippet
        image_url: scraped.image_url || source.image_url // Prefer scraped og:image, fallback to Tavily image
      };
    } catch {
      return { ...source, content: source.snippet };
    }
  });

  const enriched = await Promise.all(scrapePromises);

  // Keep remaining sources with just snippets
  const remaining = sources.slice(scrapeLimit).map(s => ({
    ...s,
    content: s.snippet
  }));

  return [...enriched, ...remaining];
}
