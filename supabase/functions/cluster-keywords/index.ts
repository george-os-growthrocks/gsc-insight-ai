import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Simple TF-IDF and cosine similarity for clustering
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

function cosineSimilarity(vec1: number[], vec2: number[]): number {
  let dotProduct = 0;
  let mag1 = 0;
  let mag2 = 0;

  for (let i = 0; i < vec1.length; i++) {
    dotProduct += vec1[i] * vec2[i];
    mag1 += vec1[i] * vec1[i];
    mag2 += vec2[i] * vec2[i];
  }

  return dotProduct / (Math.sqrt(mag1) * Math.sqrt(mag2));
}

function clusterKeywords(
  queries: Array<{ query: string; impressions: number; clicks: number; position: number }>
): Array<{
  cluster_name: string;
  keywords: string[];
  topic_score: number;
  avg_position: number;
  total_impressions: number;
  total_clicks: number;
}> {
  if (queries.length === 0) return [];

  // Build vocabulary
  const vocabulary = new Set<string>();
  const queryTokens = queries.map((q) => {
    const tokens = tokenize(q.query);
    tokens.forEach((t) => vocabulary.add(t));
    return { ...q, tokens };
  });

  const vocabArray = Array.from(vocabulary);
  const vocabIndex = new Map(vocabArray.map((word, idx) => [word, idx]));

  // Create TF-IDF vectors
  const vectors = queryTokens.map((q) => {
    const vector = new Array(vocabArray.length).fill(0);
    q.tokens.forEach((token) => {
      const idx = vocabIndex.get(token)!;
      vector[idx]++;
    });
    return { ...q, vector };
  });

  // Limit queries to top 500 by impressions to avoid timeout
  const topQueries = queries
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 500);

  const limitedVectors = vectors
    .filter((v) => topQueries.some((q) => q.query === v.query))
    .slice(0, 500);

  // Simple agglomerative clustering with optimizations
  const clusters: Array<typeof limitedVectors> = limitedVectors.map((v) => [v]);
  const threshold = 0.5;
  const maxClusters = 50; // Stop early if we reach a reasonable number

  // Limit iterations to prevent timeout
  let iterations = 0;
  const maxIterations = 100;

  while (clusters.length > maxClusters && iterations < maxIterations) {
    iterations++;
    let maxSim = -1;
    let mergeIdx1 = -1;
    let mergeIdx2 = -1;

    // Find most similar clusters (limited search)
    for (let i = 0; i < Math.min(clusters.length, 50); i++) {
      for (let j = i + 1; j < Math.min(clusters.length, 50); j++) {
        // Sample-based similarity for speed
        const sampleSize = Math.min(3, Math.min(clusters[i].length, clusters[j].length));
        let totalSim = 0;
        
        for (let k = 0; k < sampleSize; k++) {
          const v1 = clusters[i][k % clusters[i].length];
          const v2 = clusters[j][k % clusters[j].length];
          totalSim += cosineSimilarity(v1.vector, v2.vector);
        }
        
        const avgSim = totalSim / sampleSize;

        if (avgSim > maxSim) {
          maxSim = avgSim;
          mergeIdx1 = i;
          mergeIdx2 = j;
        }
      }
    }

    if (maxSim < threshold) break;

    // Merge clusters
    clusters[mergeIdx1] = [...clusters[mergeIdx1], ...clusters[mergeIdx2]];
    clusters.splice(mergeIdx2, 1);
  }

  console.log(`Clustering completed in ${iterations} iterations`);

  // Format results
  return clusters
    .filter((c) => c.length >= 2)
    .map((cluster) => {
      const keywords = cluster.map((q) => q.query);
      const totalImpressions = cluster.reduce((sum, q) => sum + q.impressions, 0);
      const totalClicks = cluster.reduce((sum, q) => sum + q.clicks, 0);
      const avgPosition =
        cluster.reduce((sum, q) => sum + q.position, 0) / cluster.length;

      // Generate cluster name from most common words
      const wordFreq = new Map<string, number>();
      cluster.forEach((q) => {
        q.tokens.forEach((token) => {
          wordFreq.set(token, (wordFreq.get(token) || 0) + 1);
        });
      });

      const topWords = Array.from(wordFreq.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map((e) => e[0]);

      const clusterName = topWords.join(" + ");
      const topicScore = Math.min(100, (totalImpressions / 1000) * (cluster.length / 5));

      return {
        cluster_name: clusterName,
        keywords,
        topic_score: Math.round(topicScore * 100) / 100,
        avg_position: Math.round(avgPosition * 100) / 100,
        total_impressions: totalImpressions,
        total_clicks: totalClicks,
      };
    })
    .sort((a, b) => b.total_impressions - a.total_impressions);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { projectId } = await req.json();
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch GSC data
    const { data: gscData, error: gscError } = await supabase
      .from("gsc_queries")
      .select("query, impressions, clicks, position")
      .eq("project_id", projectId);

    if (gscError) {
      throw gscError;
    }

    if (!gscData || gscData.length === 0) {
      return new Response(
        JSON.stringify({ error: "No GSC data found for clustering" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Aggregate by query
    const queryMap = new Map<
      string,
      { impressions: number; clicks: number; positions: number[] }
    >();

    gscData.forEach((row) => {
      const existing = queryMap.get(row.query);
      if (existing) {
        existing.impressions += row.impressions;
        existing.clicks += row.clicks;
        existing.positions.push(row.position);
      } else {
        queryMap.set(row.query, {
          impressions: row.impressions,
          clicks: row.clicks,
          positions: [row.position],
        });
      }
    });

    const queries = Array.from(queryMap.entries()).map(([query, data]) => ({
      query,
      impressions: data.impressions,
      clicks: data.clicks,
      position: data.positions.reduce((sum, p) => sum + p, 0) / data.positions.length,
    }));

    console.log(`Clustering ${queries.length} unique queries...`);

    const clusters = clusterKeywords(queries);

    // Delete existing clusters
    await supabase.from("keyword_clusters").delete().eq("project_id", projectId);

    // Save clusters
    if (clusters.length > 0) {
      const { error: insertError } = await supabase.from("keyword_clusters").insert(
        clusters.map((c) => ({
          project_id: projectId,
          ...c,
        }))
      );

      if (insertError) {
        console.error("Error saving clusters:", insertError);
        throw insertError;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        clustersFound: clusters.length,
        clusters,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in cluster-keywords:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
