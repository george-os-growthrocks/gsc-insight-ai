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
    const { url, projectId } = await req.json();

    if (!url || !projectId) {
      throw new Error("url and projectId are required");
    }

    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    if (!FIRECRAWL_API_KEY) {
      throw new Error("FIRECRAWL_API_KEY not configured");
    }

    console.log(`Scraping URL: ${url}`);

    // Call Firecrawl v2 scrape endpoint
    const scrapeResponse = await fetch("https://api.firecrawl.dev/v2/scrape", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        onlyMainContent: false,
        maxAge: 172800000,
        parsers: ["pdf"],
        formats: ["markdown", "html"],
      }),
    });

    if (!scrapeResponse.ok) {
      const errorText = await scrapeResponse.text();
      console.error("Firecrawl error:", scrapeResponse.status, errorText);
      throw new Error(`Firecrawl error: ${scrapeResponse.status}`);
    }

    const scrapeData = await scrapeResponse.json();
    console.log("Scrape successful");

    // Extract content
    const markdown = scrapeData.data?.markdown || "";
    const html = scrapeData.data?.html || "";
    const metadata = scrapeData.data?.metadata || {};
    const wordCount = markdown.split(/\s+/).length;

    // Save to database
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    const { data: savedContent, error: saveError } = await supabaseClient
      .from("scraped_content")
      .insert({
        project_id: projectId,
        url,
        content_markdown: markdown,
        content_html: html,
        word_count: wordCount,
        metadata,
      })
      .select()
      .single();

    if (saveError) {
      console.error("Error saving scraped content:", saveError);
      throw saveError;
    }

    console.log("Content saved to database");

    return new Response(
      JSON.stringify({
        success: true,
        data: savedContent,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in firecrawl-scrape:", error);
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
