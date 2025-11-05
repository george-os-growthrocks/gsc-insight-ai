import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url, query } = await req.json();
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!FIRECRAWL_API_KEY) {
      throw new Error("FIRECRAWL_API_KEY is not configured");
    }

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Scrape page with Firecrawl
    console.log("Fetching page content from:", url);
    const scrapeResponse = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        formats: ["markdown", "html"],
      }),
    });

    if (!scrapeResponse.ok) {
      const error = await scrapeResponse.text();
      console.error("Firecrawl error:", scrapeResponse.status, error);
      throw new Error("Failed to fetch page content");
    }

    const scrapeData = await scrapeResponse.json();
    const pageContent = scrapeData.markdown || scrapeData.html || "";

    // Analyze with AI
    const systemPrompt = `You are an expert SEO content analyst. Analyze the provided page content and generate optimized SEO elements.

Based on the target keyword and page content:
1. Generate 3 optimized title tag options (50-60 chars)
2. Generate an optimized H1 heading
3. Generate 3-5 FAQ items with questions and answers
4. Provide brief on-page SEO recommendations

Focus on:
- Search intent alignment
- Keyword optimization
- User engagement
- Technical SEO best practices`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Target Keyword: "${query}"\n\nPage URL: ${url}\n\nPage Content:\n${pageContent.substring(
              0,
              4000
            )}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!aiResponse.ok) {
      const error = await aiResponse.text();
      console.error("AI Gateway error:", aiResponse.status, error);
      throw new Error("AI analysis failed");
    }

    const aiData = await aiResponse.json();
    const analysis = aiData.choices?.[0]?.message?.content;

    return new Response(
      JSON.stringify({
        analysis,
        pageContent: pageContent.substring(0, 1000), // Preview
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in analyze-page:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
