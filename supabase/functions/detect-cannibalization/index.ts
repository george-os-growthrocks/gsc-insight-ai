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

interface PageMetrics {
  url: string;
  clicks: number;
  impressions: number;
  position: number;
  ctr: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { projectId, minImpressions = 50 } = await req.json();

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

    console.log(`Detecting cannibalization for project: ${projectId}`);

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

    console.log(`Processing ${gscData.length} GSC rows for cannibalization...`);

    // Group by query
    const queryMap = new Map<string, Map<string, PageMetrics>>();

    (gscData as GscRow[]).forEach((row) => {
      const queryLower = row.query.toLowerCase();
      if (!queryMap.has(queryLower)) {
        queryMap.set(queryLower, new Map());
      }

      const pageMap = queryMap.get(queryLower)!;
      if (!pageMap.has(row.page)) {
        pageMap.set(row.page, {
          url: row.page,
          clicks: 0,
          impressions: 0,
          position: 0,
          ctr: 0,
        });
      }

      const metrics = pageMap.get(row.page)!;
      metrics.clicks += row.clicks;
      metrics.impressions += row.impressions;
      metrics.position = (metrics.position + row.position) / 2;
      metrics.ctr = metrics.clicks / metrics.impressions;
    });

    // Find cannibalization clusters
    const clusters: any[] = [];

    queryMap.forEach((pageMap, query) => {
      const pages = Array.from(pageMap.values());

      // Filter: must have 2+ pages and minimum impressions
      const totalImpressions = pages.reduce((sum, p) => sum + p.impressions, 0);
      if (pages.length < 2 || totalImpressions < minImpressions) {
        return;
      }

      // Calculate weighted position variance
      const weightedAvgPosition = pages.reduce(
        (sum, p) => sum + p.position * (p.impressions / totalImpressions),
        0
      );

      const variance = pages.reduce(
        (sum, p) =>
          sum +
          Math.pow(p.position - weightedAvgPosition, 2) * (p.impressions / totalImpressions),
        0
      );

      // Cannibalization score
      const cannibalizationScore = (pages.length - 1) * (1 + variance / 10);

      // Calculate scores for each page to select primary candidate
      const maxImpressions = Math.max(...pages.map((p) => p.impressions));
      const maxClicks = Math.max(...pages.map((p) => p.clicks));
      const minPosition = Math.min(...pages.map((p) => p.position));

      const scoredPages = pages.map((page) => ({
        ...page,
        score:
          0.5 * (page.impressions / maxImpressions) +
          0.7 * (page.clicks / maxClicks) +
          0.6 * (minPosition / page.position),
      }));

      // Sort by score
      scoredPages.sort((a, b) => b.score - a.score);

      const primaryPage = scoredPages[0];
      const supportingPages = scoredPages.slice(1).map((p) => ({
        url: p.url,
        clicks: p.clicks,
        impressions: p.impressions,
        position: p.position,
      }));

      // Calculate keyword difficulty (simplified)
      const difficulty = calculateKeywordDifficulty(totalImpressions);

      // Calculate expected CTR
      const expectedCtr = getBaseCTR(weightedAvgPosition);

      // Estimate traffic gain from consolidation
      const currentClicks = pages.reduce((sum, p) => sum + p.clicks, 0);
      const estimatedNewPosition = weightedAvgPosition * 0.6; // Assume 40% improvement
      const newExpectedCtr = getBaseCTR(estimatedNewPosition);
      const trafficGainEstimate = Math.round(totalImpressions * (newExpectedCtr - expectedCtr));

      clusters.push({
        project_id: projectId,
        query,
        cannibalization_score: Math.round(cannibalizationScore * 100) / 100,
        primary_page: primaryPage.url,
        supporting_pages: supportingPages,
        total_clicks: pages.reduce((sum, p) => sum + p.clicks, 0),
        total_impressions: totalImpressions,
        avg_position: weightedAvgPosition,
        keyword_difficulty: difficulty,
        expected_ctr: expectedCtr,
        traffic_gain_estimate: trafficGainEstimate,
      });
    });

    // Sort by cannibalization score
    clusters.sort((a, b) => b.cannibalization_score - a.cannibalization_score);

    console.log(`Found ${clusters.length} cannibalization clusters`);

    // Delete old clusters
    await supabaseClient
      .from("cannibalization_clusters")
      .delete()
      .eq("project_id", projectId);

    // Insert new clusters
    if (clusters.length > 0) {
      const { error: insertError } = await supabaseClient
        .from("cannibalization_clusters")
        .insert(clusters);

      if (insertError) {
        console.error("Error inserting clusters:", insertError);
        throw insertError;
      }
    }

    console.log("Cannibalization detection completed");

    return new Response(
      JSON.stringify({
        count: clusters.length,
        clusters: clusters.slice(0, 50), // Return top 50
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in detect-cannibalization function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

function calculateKeywordDifficulty(searchVolume: number): number {
  // Simplified difficulty calculation
  const volumeScore = Math.min(100, (searchVolume / 10000) * 100);
  return Math.round(volumeScore * 0.5); // Conservative estimate
}

function getBaseCTR(position: number): number {
  const baseCTR: { [key: number]: number } = {
    1: 0.316,
    2: 0.158,
    3: 0.108,
    4: 0.081,
    5: 0.066,
    6: 0.053,
    7: 0.044,
    8: 0.037,
    9: 0.032,
    10: 0.028,
  };

  if (position <= 10 && baseCTR[Math.floor(position)]) {
    return baseCTR[Math.floor(position)];
  }

  return 0.028 * Math.exp(-0.15 * (position - 10));
}
