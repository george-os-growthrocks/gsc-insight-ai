import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GscRow {
  query: string;
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface PageAnalysis {
  project_id: string;
  page_url: string;
  total_clicks: number;
  total_impressions: number;
  avg_ctr: number;
  avg_position: number;
  performance_score: number;
  queries: Array<{
    query: string;
    clicks: number;
    impressions: number;
    position: number;
    ctr: number;
  }>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { projectId } = await req.json();

    if (!projectId) {
      throw new Error("projectId is required");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    console.log(`Analyzing pages for project: ${projectId}`);

    // Fetch GSC data
    const { data: gscData, error: fetchError } = await supabaseClient
      .from("gsc_queries")
      .select("*")
      .eq("project_id", projectId);

    if (fetchError) {
      console.error("Error fetching GSC data:", fetchError);
      throw fetchError;
    }

    if (!gscData || gscData.length === 0) {
      return new Response(
        JSON.stringify({
          message: "No GSC data available. Please sync data first.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing ${gscData.length} GSC rows...`);

    // Group by page
    const pageMap = new Map<string, PageAnalysis>();

    (gscData as GscRow[]).forEach((row) => {
      if (!pageMap.has(row.page)) {
        pageMap.set(row.page, {
          project_id: projectId,
          page_url: row.page,
          total_clicks: 0,
          total_impressions: 0,
          avg_ctr: 0,
          avg_position: 0,
          performance_score: 0,
          queries: [],
        });
      }

      const page = pageMap.get(row.page)!;
      page.total_clicks += row.clicks;
      page.total_impressions += row.impressions;

      // Add or update query
      const existingQuery = page.queries.find((q) => q.query === row.query);
      if (existingQuery) {
        existingQuery.clicks += row.clicks;
        existingQuery.impressions += row.impressions;
        existingQuery.position = (existingQuery.position + row.position) / 2;
        existingQuery.ctr = existingQuery.clicks / existingQuery.impressions;
      } else {
        page.queries.push({
          query: row.query,
          clicks: row.clicks,
          impressions: row.impressions,
          position: row.position,
          ctr: row.ctr,
        });
      }
    });

    // Calculate scores for each page
    pageMap.forEach((page) => {
      // Calculate averages
      page.avg_ctr = page.total_impressions > 0 ? page.total_clicks / page.total_impressions : 0;
      page.avg_position =
        page.queries.reduce((sum, q) => sum + q.position * q.impressions, 0) /
        page.total_impressions;

      // Sort queries by impressions
      page.queries.sort((a, b) => b.impressions - a.impressions);

      // Calculate performance score (0-100)
      page.performance_score = calculatePerformanceScore(
        page.total_clicks,
        page.total_impressions,
        page.avg_ctr,
        page.avg_position
      );
    });

    // Convert to array and sort by performance score
    const pageAnalyses = Array.from(pageMap.values()).sort(
      (a, b) => b.performance_score - a.performance_score
    );

    console.log(`Analyzed ${pageAnalyses.length} pages`);

    // Delete old analyses
    await supabaseClient
      .from("page_analysis")
      .delete()
      .eq("project_id", projectId);

    // Insert new analyses
    const { error: insertError } = await supabaseClient
      .from("page_analysis")
      .insert(pageAnalyses);

    if (insertError) {
      console.error("Error inserting page analyses:", insertError);
      throw insertError;
    }

    console.log("Page analyses saved successfully");

    return new Response(
      JSON.stringify({
        count: pageAnalyses.length,
        pages: pageAnalyses,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in analyze-pages function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

/**
 * Calculate page performance score (0-100)
 */
function calculatePerformanceScore(
  clicks: number,
  impressions: number,
  ctr: number,
  position: number
): number {
  // Position score (better position = higher score)
  const positionScore = Math.max(0, 100 - position * 5);

  // CTR score
  const ctrScore = Math.min(100, ctr * 100 * 5);

  // Click score
  const clickScore = Math.min(100, (clicks / 10) * 2);

  // Weighted formula
  const score = positionScore * 0.4 + ctrScore * 0.4 + clickScore * 0.2;

  return Math.round(score);
}
