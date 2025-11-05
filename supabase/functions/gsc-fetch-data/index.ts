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
    const { projectId, startDate, endDate, rowLimit = 25000 } = await req.json();
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get tokens from database
    const { data: tokenData, error: tokenError } = await supabase
      .from("google_tokens")
      .select("*")
      .eq("project_id", projectId)
      .maybeSingle();

    if (tokenError || !tokenData) {
      return new Response(
        JSON.stringify({ error: "No Google Search Console connection found" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check if token is expired
    const expiresAt = new Date(tokenData.expires_at);
    let accessToken = tokenData.access_token;

    if (expiresAt <= new Date()) {
      // Refresh token
      const refreshResponse = await supabase.functions.invoke("gsc-oauth", {
        body: { action: "refresh_token", projectId },
      });

      if (refreshResponse.error) {
        throw new Error("Failed to refresh access token");
      }

      accessToken = refreshResponse.data.access_token;
    }

    // Fetch data from Search Console API
    const apiUrl = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(
      tokenData.property_url
    )}/searchAnalytics/query`;

    const requestBody = {
      startDate,
      endDate,
      dimensions: ["date", "query", "page"],
      rowLimit,
      startRow: 0,
    };

    console.log("Fetching GSC data:", apiUrl, requestBody);

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("GSC API error:", response.status, error);
      throw new Error(`GSC API error: ${response.status}`);
    }

    const data = await response.json();
    const rows = data.rows || [];

    console.log(`Fetched ${rows.length} rows from GSC`);

    // Clear existing data for date range
    const { error: deleteError } = await supabase
      .from("gsc_queries")
      .delete()
      .eq("project_id", projectId)
      .gte("date", startDate)
      .lte("date", endDate);

    if (deleteError) {
      console.error("Error deleting old data:", deleteError);
    }

    // Insert new data in batches
    const batchSize = 1000;
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize).map((row: any) => ({
        project_id: projectId,
        date: row.keys[0],
        query: row.keys[1],
        page: row.keys[2],
        clicks: row.clicks,
        impressions: row.impressions,
        ctr: row.ctr,
        position: row.position,
      }));

      const { error: insertError } = await supabase.from("gsc_queries").insert(batch);

      if (insertError) {
        console.error("Error inserting batch:", insertError);
        throw insertError;
      }

      console.log(`Inserted batch ${i / batchSize + 1} of ${Math.ceil(rows.length / batchSize)}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        rowsImported: rows.length,
        startDate,
        endDate,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in gsc-fetch-data:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
