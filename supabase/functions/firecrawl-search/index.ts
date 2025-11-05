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
    const { query, projectId, limit = 10 } = await req.json();

    if (!query || !projectId) {
      throw new Error("query and projectId are required");
    }

    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    if (!FIRECRAWL_API_KEY) {
      throw new Error("FIRECRAWL_API_KEY not configured");
    }

    console.log(`Searching SERP for query: ${query}`);

    // Call Firecrawl v2 search endpoint with proper error handling
    const searchResponse = await fetch("https://api.firecrawl.dev/v2/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        limit,
      }),
    });

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      console.error("Firecrawl search API error:", searchResponse.status, errorText);
      
      let errorMessage = `Firecrawl search error (${searchResponse.status})`;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error || errorJson.message || errorMessage;
      } catch (e) {
        errorMessage = errorText || errorMessage;
      }
      
      throw new Error(errorMessage);
    }

    const searchData = await searchResponse.json();
    console.log(`Search response:`, JSON.stringify(searchData).substring(0, 200));
    console.log(`Found ${searchData.data?.length || 0} SERP results`);

    // Save SERP results to database
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    const serpResults = (searchData.data || []).map((result: any, index: number) => ({
      project_id: projectId,
      query,
      position: index + 1,
      url: result.url,
      title: result.title,
      description: result.description || result.snippet,
      content_markdown: result.markdown,
      metadata: {
        score: result.score,
        language: result.language,
      },
    }));

    // Delete old SERP results for this query
    await supabaseClient
      .from("serp_results")
      .delete()
      .eq("project_id", projectId)
      .eq("query", query);

    // Insert new results
    const { data: savedResults, error: saveError } = await supabaseClient
      .from("serp_results")
      .insert(serpResults)
      .select();

    if (saveError) {
      console.error("Error saving SERP results:", saveError);
      throw saveError;
    }

    console.log("SERP results saved to database");

    return new Response(
      JSON.stringify({
        success: true,
        data: savedResults,
        count: savedResults?.length || 0,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in firecrawl-search:", error);
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
