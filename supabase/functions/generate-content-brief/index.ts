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
    const { projectId, targetKeyword, clusterId } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get related keywords from cluster if available
    let relatedKeywords: string[] = [];
    if (clusterId) {
      const { data: clusterData } = await supabase
        .from("keyword_clusters")
        .select("keywords")
        .eq("id", clusterId)
        .single();

      if (clusterData) {
        relatedKeywords = clusterData.keywords;
      }
    }

    // Get competitor data
    const { data: competitors } = await supabase
      .from("competitors")
      .select("domain, name")
      .eq("project_id", projectId)
      .limit(5);

    const systemPrompt = `You are an expert SEO content strategist. Generate a comprehensive content brief for the target keyword.

Output must be valid JSON with this structure:
{
  "title": "SEO-optimized title (50-60 chars)",
  "outline": {
    "sections": [
      {
        "heading": "H2 heading",
        "subheadings": ["H3 subheading 1", "H3 subheading 2"],
        "wordCount": 400
      }
    ]
  },
  "wordCount": 2500,
  "seoRecommendations": "Bullet points of SEO best practices",
  "competitorAnalysis": "Analysis of what competitors are doing well"
}`;

    const userPrompt = `Create a content brief for:
Target Keyword: "${targetKeyword}"
${relatedKeywords.length > 0 ? `Related Keywords: ${relatedKeywords.slice(0, 10).join(", ")}` : ""}
${competitors && competitors.length > 0 ? `Competitors: ${competitors.map((c) => c.name).join(", ")}` : ""}

Focus on:
- Search intent alignment
- Comprehensive topic coverage
- Competitive differentiation
- User engagement optimization
- Technical SEO best practices`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
        temperature: 0.7,
        max_tokens: 3000,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("AI Gateway error:", response.status, error);
      throw new Error("AI generation failed");
    }

    const data = await response.json();
    let brief = data.choices?.[0]?.message?.content;

    // Parse JSON if it's a string
    if (typeof brief === "string") {
      brief = JSON.parse(brief);
    }

    return new Response(
      JSON.stringify({
        success: true,
        brief,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in generate-content-brief:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
