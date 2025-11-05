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
    const { query, primaryPage, supportingPages, metrics } = await req.json();

    if (!query || !primaryPage || !supportingPages) {
      throw new Error("Missing required fields");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    console.log(`Generating cannibalization action plan for query: "${query}"`);

    const systemPrompt = `You are an EXPERT SEO CONSULTANT specializing in keyword cannibalization resolution and 301 redirect strategies.

Your task is to create a comprehensive, step-by-step action plan for consolidating multiple pages ranking for the same query into a single, authoritative page.

CRITICAL REQUIREMENTS:
- Provide specific, actionable steps with exact implementation details
- Include 301 redirect configuration (Apache .htaccess, Nginx, or platform-specific)
- Explain content merger strategy to preserve best elements from each page
- Include timeline estimates (2-8 weeks) for implementation and results
- Calculate expected traffic gain with specific numbers
- Provide monitoring checklist to track consolidation success

FORMAT YOUR RESPONSE AS A DETAILED ACTION PLAN WITH:
1. Executive Summary (2-3 sentences)
2. Current Situation Analysis
3. Step-by-Step Implementation Plan
4. 301 Redirect Configuration (code snippets)
5. Content Consolidation Strategy
6. Timeline & Milestones
7. Expected Results & KPIs
8. Post-Implementation Monitoring

Use professional SEO language but remain practical and implementable.`;

    const supportingPagesInfo = supportingPages
      .map(
        (p: any, idx: number) =>
          `${idx + 1}. ${p.url}\n   - Position: ${p.position?.toFixed(1) || "N/A"}\n   - Clicks: ${p.clicks || 0}\n   - Impressions: ${p.impressions || 0}`
      )
      .join("\n");

    const userPrompt = `Generate a comprehensive cannibalization consolidation action plan for:

**Query:** "${query}"

**Primary Page (Keep & Strengthen):**
- URL: ${primaryPage}
- Position: ${metrics?.primaryPosition?.toFixed(1) || "N/A"}
- Clicks: ${metrics?.primaryClicks || 0}
- Impressions: ${metrics?.primaryImpressions || 0}

**Supporting Pages (Redirect to Primary):**
${supportingPagesInfo}

**Current Metrics:**
- Total Clicks: ${metrics?.totalClicks || 0}
- Total Impressions: ${metrics?.totalImpressions || 0}
- Average Position: ${metrics?.avgPosition?.toFixed(1) || "N/A"}
- Cannibalization Score: ${metrics?.cannibalizationScore?.toFixed(2) || "N/A"}

**Expected Improvement:**
- Target Position: ${metrics?.targetPosition?.toFixed(1) || "N/A"}
- Traffic Gain Estimate: +${metrics?.trafficGain || 0} clicks/month

Create a detailed, professional action plan that an SEO manager can implement immediately.`;

    console.log("Calling Gemini for action plan...");

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
        max_tokens: 8192,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI Gateway error:", aiResponse.status, errorText);
      throw new Error(`AI Gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const actionPlan = aiData.choices?.[0]?.message?.content;

    if (!actionPlan) {
      throw new Error("No action plan generated");
    }

    console.log("Action plan generated successfully");

    return new Response(
      JSON.stringify({
        actionPlan,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in gemini-cannibalization function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
