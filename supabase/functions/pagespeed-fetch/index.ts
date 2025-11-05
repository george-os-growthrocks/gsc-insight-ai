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
    let { url, strategy = "mobile", projectId } = await req.json();
    const PAGESPEED_API_KEY = Deno.env.get("PAGESPEED_API_KEY");

    if (!PAGESPEED_API_KEY) {
      throw new Error("PAGESPEED_API_KEY is not configured");
    }

    // Normalize URL - add https:// if no protocol specified
    if (url && !url.match(/^https?:\/\//i)) {
      url = `https://${url}`;
    }

    // Validate URL format
    try {
      new URL(url);
    } catch (e) {
      throw new Error("Invalid URL format. Please provide a valid URL.");
    }

    console.log("Fetching PageSpeed metrics for:", url, strategy);

    const apiUrl = new URL("https://www.googleapis.com/pagespeedonline/v5/runPagespeed");
    apiUrl.searchParams.set("url", url);
    apiUrl.searchParams.set("key", PAGESPEED_API_KEY);
    apiUrl.searchParams.set("strategy", strategy);
    apiUrl.searchParams.set("category", "PERFORMANCE");

    const response = await fetch(apiUrl.toString());

    if (!response.ok) {
      const error = await response.text();
      console.error("PageSpeed API error:", response.status, error);
      throw new Error(`PageSpeed API error: ${response.status}`);
    }

    const data = await response.json();
    const lighthouseResult = data.lighthouseResult;
    const audits = lighthouseResult.audits;

    const metrics = {
      performance_score: Math.round(lighthouseResult.categories.performance.score * 100),
      fcp: audits["first-contentful-paint"]?.numericValue || null,
      lcp: audits["largest-contentful-paint"]?.numericValue || null,
      cls: audits["cumulative-layout-shift"]?.numericValue || null,
      tbt: audits["total-blocking-time"]?.numericValue || null,
      si: audits["speed-index"]?.numericValue || null,
    };

    // Save to database if projectId provided
    if (projectId) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      const { error: insertError } = await supabase.from("pagespeed_metrics").insert([
        {
          project_id: projectId,
          page: url,
          ...metrics,
        },
      ]);

      if (insertError) {
        console.error("Error saving metrics:", insertError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        metrics,
        url,
        strategy,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in pagespeed-fetch:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
