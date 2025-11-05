import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url, projectId, limit = 10, crawlEntireDomain = false } = await req.json();

    if (!url || !projectId) {
      throw new Error("url and projectId are required");
    }

    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    if (!FIRECRAWL_API_KEY) {
      throw new Error("FIRECRAWL_API_KEY not configured");
    }

    console.log(`Starting crawl for: ${url}`);

    // Call Firecrawl v2 crawl endpoint
    const crawlResponse = await fetch("https://api.firecrawl.dev/v2/crawl", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        sitemap: "include",
        crawlEntireDomain,
        limit,
        scrapeOptions: {
          onlyMainContent: false,
          maxAge: 172800000,
          parsers: ["pdf"],
          formats: ["markdown", "html"],
        },
      }),
    });

    if (!crawlResponse.ok) {
      const errorText = await crawlResponse.text();
      console.error("Firecrawl crawl error:", crawlResponse.status, errorText);
      throw new Error(`Firecrawl crawl error: ${crawlResponse.status}`);
    }

    const crawlData = await crawlResponse.json();
    console.log("Crawl initiated:", crawlData);

    // For async crawls, Firecrawl v2 returns a job ID
    // We'll need to poll for status, but for now return the initial response
    if (crawlData.id) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "Crawl job started",
          jobId: crawlData.id,
          status: "in_progress",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // If crawl completes immediately (small sites), save the data
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    const pages = crawlData.data || [];
    const savedPages = [];

    for (const page of pages) {
      const markdown = page.markdown || "";
      const html = page.html || "";
      const wordCount = markdown.split(/\s+/).length;

      const { data: savedContent, error: saveError } = await supabaseClient
        .from("scraped_content")
        .insert({
          project_id: projectId,
          url: page.url,
          content_markdown: markdown,
          content_html: html,
          word_count: wordCount,
          metadata: page.metadata || {},
        })
        .select()
        .single();

      if (!saveError && savedContent) {
        savedPages.push(savedContent);
      }
    }

    console.log(`Saved ${savedPages.length} crawled pages`);

    return new Response(
      JSON.stringify({
        success: true,
        data: savedPages,
        count: savedPages.length,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in firecrawl-crawl:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
