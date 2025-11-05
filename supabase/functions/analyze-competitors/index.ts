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
    const { projectId } = await req.json();
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get your keywords
    const { data: yourKeywords, error: yourError } = await supabase
      .from("gsc_queries")
      .select("query, position, impressions")
      .eq("project_id", projectId);

    if (yourError) throw yourError;

    if (!yourKeywords || yourKeywords.length === 0) {
      return new Response(
        JSON.stringify({ error: "No keyword data available" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Aggregate your data
    const yourMap = new Map<string, { position: number; impressions: number }>();
    yourKeywords.forEach((row) => {
      const existing = yourMap.get(row.query);
      if (existing) {
        existing.position = Math.min(existing.position, row.position);
        existing.impressions += row.impressions;
      } else {
        yourMap.set(row.query, { position: row.position, impressions: row.impressions });
      }
    });

    // Identify gaps (keywords you're not ranking well for)
    const gaps = Array.from(yourMap.entries())
      .filter(([_, data]) => data.position > 10)
      .map(([keyword, data]) => ({
        keyword,
        yourPosition: data.position,
        opportunity: `Currently ranking at position ${data.position.toFixed(
          0
        )}. Potential to improve.`,
        impressions: data.impressions,
      }))
      .sort((a, b) => b.impressions - a.impressions)
      .slice(0, 50);

    // Add completely missing keywords (simulate with queries ranking > 50)
    const missingKeywords = Array.from(yourMap.entries())
      .filter(([_, data]) => data.position > 50)
      .map(([keyword, data]) => ({
        keyword,
        yourPosition: null,
        opportunity: "Not ranking for this keyword. High opportunity if related to your content.",
        impressions: data.impressions,
      }))
      .sort((a, b) => b.impressions - a.impressions)
      .slice(0, 25);

    const allGaps = [...gaps, ...missingKeywords].slice(0, 50);

    return new Response(
      JSON.stringify({
        success: true,
        gaps: allGaps,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in analyze-competitors:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
