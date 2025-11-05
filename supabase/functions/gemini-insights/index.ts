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

    console.log(`Fetching GSC data for project: ${projectId}`);

    // Fetch top 50 queries with page dimension
    const { data: gscData, error: fetchError } = await supabaseClient
      .from("gsc_queries")
      .select("*")
      .eq("project_id", projectId)
      .order("impressions", { ascending: false })
      .limit(50);

    if (fetchError) {
      console.error("Error fetching GSC data:", fetchError);
      throw fetchError;
    }

    if (!gscData || gscData.length === 0) {
      return new Response(
        JSON.stringify({
          insights: [],
          message: "No GSC data available. Please sync data first.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Fetched ${gscData.length} queries for analysis`);

    // Prepare data summary for Gemini
    const dataSummary = gscData
      .slice(0, 20)
      .map(
        (row) =>
          `Query: "${row.query}" | Page: ${row.page} | Position: ${row.position} | CTR: ${(row.ctr * 100).toFixed(1)}% | Clicks: ${row.clicks} | Impressions: ${row.impressions}`
      )
      .join("\n");

    // Call Lovable AI Gateway (Gemini 2.5)
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const systemPrompt = `You are the WORLD'S BEST SEO MANAGER with 20+ years of experience at top agencies (Moz, SEMrush, Ahrefs).

CRITICAL REQUIREMENTS:
- Provide 8-12 detailed, actionable SEO insights
- Every insight MUST include specific traffic gain calculations
- Use formulas: "+X monthly visits", "Expected CTR lift: +X%"
- Focus on ROI and business impact
- Provide specific, actionable next steps
- Include realistic timeline estimates (weeks/months)

INSIGHT TYPES TO DETECT:
1. CTR Opportunities: Position 1-10, CTR below expected benchmark
2. Content Gaps: Position 11-30, high impressions, optimization potential
3. Quick Wins: Position 4-7, one push needed to reach top 3
4. Cannibalization: Same query ranking on multiple pages
5. Internal Linking: High-authority pages that can boost struggling pages

FORMAT EACH INSIGHT AS JSON:
{
  "type": "ctr_opportunity|content_gap|quick_win|cannibalization|internal_linking",
  "title": "Short, impactful title",
  "description": "Detailed explanation with specific calculations",
  "query": "target keyword",
  "page": "URL",
  "impact_score": 0-100,
  "expected_traffic_gain": number,
  "effort_level": "low|medium|high",
  "priority_score": 0-100,
  "current_position": number,
  "expected_position": number,
  "current_ctr": number,
  "expected_ctr": number
}

Return ONLY a JSON array of insights, no other text.`;

    const userPrompt = `Analyze this Google Search Console data and provide actionable SEO insights:

${dataSummary}

CALCULATION GUIDELINES:
- Expected CTR by position: Pos 1: 31.6%, Pos 2: 15.8%, Pos 3: 10.8%, Pos 4: 8.1%, Pos 5: 6.6%
- Traffic Gain = Impressions × (Expected CTR - Current CTR)
- Priority = (Impact × Value) / Effort
- Position improvement estimate: Current Position × 0.6 for consolidation

Provide 8-12 insights with specific calculations.`;

    console.log("Calling Gemini for insights...");

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
          { role: "user", content: userPrompt },
        ],
        temperature: 0.4,
        max_tokens: 16384,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI Gateway error:", aiResponse.status, errorText);
      throw new Error(`AI Gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content;

    if (!aiContent) {
      throw new Error("No content from AI");
    }

    console.log("Received AI response, parsing insights...");

    // Parse JSON from AI response
    let insights = [];
    try {
      // Try to extract JSON array from response
      const jsonMatch = aiContent.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        insights = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON array found in response");
      }
    } catch (parseError) {
      console.error("Failed to parse AI response, using fallback:", parseError);
      // Fallback: generate deterministic insights
      insights = generateFallbackInsights(gscData as GscRow[]);
    }

    // Save insights to database
    console.log(`Saving ${insights.length} insights to database...`);

    // Delete old insights for this project
    await supabaseClient
      .from("ai_insights")
      .delete()
      .eq("project_id", projectId);

    // Insert new insights
    const insightsToInsert = insights.map((insight: any) => ({
      project_id: projectId,
      insight_type: insight.type || "quick_win",
      query: insight.query,
      page: insight.page,
      title: insight.title,
      description: insight.description,
      impact_score: insight.impact_score || 50,
      expected_traffic_gain: insight.expected_traffic_gain || 0,
      effort_level: insight.effort_level || "medium",
      priority_score: insight.priority_score || 50,
      current_position: insight.current_position,
      expected_position: insight.expected_position,
      current_ctr: insight.current_ctr,
      expected_ctr: insight.expected_ctr,
      metadata: insight.metadata || {},
    }));

    const { error: insertError } = await supabaseClient
      .from("ai_insights")
      .insert(insightsToInsert);

    if (insertError) {
      console.error("Error inserting insights:", insertError);
      throw insertError;
    }

    console.log("Insights saved successfully");

    return new Response(
      JSON.stringify({
        insights: insightsToInsert,
        count: insightsToInsert.length,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in gemini-insights function:", error);
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
 * Generate fallback insights if AI fails
 */
function generateFallbackInsights(gscData: GscRow[]): any[] {
  const insights: any[] = [];

  // Low CTR Quick Wins
  const lowCtrOpportunities = gscData
    .filter(
      (row) =>
        row.position < 12 && row.impressions > 100 && row.ctr < 0.1
    )
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 5);

  lowCtrOpportunities.forEach((row) => {
    const expectedCtr = getBaseCTR(row.position);
    const trafficGain = Math.round(row.impressions * (expectedCtr - row.ctr));

    insights.push({
      type: "ctr_opportunity",
      title: `Low CTR for "${row.query}"`,
      description: `This keyword ranks at position ${row.position.toFixed(1)} but has a CTR of only ${(row.ctr * 100).toFixed(1)}%. Expected CTR for this position is ${(expectedCtr * 100).toFixed(1)}%. Optimize title tag and meta description to gain approximately ${trafficGain} additional clicks per month.`,
      query: row.query,
      page: row.page,
      impact_score: Math.min(100, trafficGain / 10),
      expected_traffic_gain: trafficGain,
      effort_level: "low",
      priority_score: Math.min(100, trafficGain / 5),
      current_position: row.position,
      expected_position: row.position,
      current_ctr: row.ctr,
      expected_ctr: expectedCtr,
    });
  });

  // Content Gap Opportunities
  const contentGaps = gscData
    .filter(
      (row) =>
        row.position >= 11 && row.position <= 30 && row.impressions > 50
    )
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 5);

  contentGaps.forEach((row) => {
    const targetPosition = 5;
    const currentCtr = row.ctr;
    const expectedCtr = getBaseCTR(targetPosition);
    const trafficGain = Math.round(row.impressions * (expectedCtr - currentCtr));

    insights.push({
      type: "content_gap",
      title: `Content Gap: "${row.query}"`,
      description: `This keyword is ranking at position ${row.position.toFixed(1)} with ${row.impressions} monthly impressions. With comprehensive content optimization, you could reach position ${targetPosition} and gain approximately ${trafficGain} additional clicks per month.`,
      query: row.query,
      page: row.page,
      impact_score: Math.min(100, trafficGain / 8),
      expected_traffic_gain: trafficGain,
      effort_level: "medium",
      priority_score: Math.min(100, trafficGain / 6),
      current_position: row.position,
      expected_position: targetPosition,
      current_ctr: currentCtr,
      expected_ctr: expectedCtr,
    });
  });

  return insights;
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
