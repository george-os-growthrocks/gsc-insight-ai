import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { projectId, startDate, endDate } = await req.json();

    console.log('Analyzing backlink intelligence for project:', projectId);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Step 1: Get all backlink traffic data
    const { data: trafficData, error: trafficError } = await supabase
      .from('backlink_traffic')
      .select('*')
      .eq('project_id', projectId)
      .gte('date', startDate)
      .lte('date', endDate);

    if (trafficError) throw trafficError;

    console.log('Fetched', trafficData?.length || 0, 'traffic records');

    // Step 2: Get organic data from GSC for the same landing pages
    const landingPages = [...new Set(trafficData?.map(t => t.landing_page) || [])];
    const { data: gscData, error: gscError } = await supabase
      .from('gsc_queries')
      .select('*')
      .eq('project_id', projectId)
      .in('page', landingPages)
      .gte('date', startDate)
      .lte('date', endDate);

    if (gscError) throw gscError;

    console.log('Fetched', gscData?.length || 0, 'GSC records');

    // Step 3: Correlate data and compute scores
    const correlationData = [];
    const domainScores = new Map();

    // Group traffic by domain and landing page
    const trafficByDomainPage = new Map();
    for (const traffic of trafficData || []) {
      const key = `${traffic.referring_domain}|${traffic.landing_page}`;
      if (!trafficByDomainPage.has(key)) {
        trafficByDomainPage.set(key, {
          domain: traffic.referring_domain,
          page: traffic.landing_page,
          sessions: 0,
          engagedSessions: 0,
        });
      }
      const entry = trafficByDomainPage.get(key);
      entry.sessions += traffic.sessions;
      entry.engagedSessions += traffic.engaged_sessions;
    }

    // Group GSC by landing page
    const gscByPage = new Map();
    for (const gsc of gscData || []) {
      if (!gscByPage.has(gsc.page)) {
        gscByPage.set(gsc.page, []);
      }
      gscByPage.get(gsc.page).push(gsc);
    }

    // Correlate and compute scores
    for (const [key, traffic] of trafficByDomainPage.entries()) {
      const gscRecords = gscByPage.get(traffic.page) || [];

      // Calculate organic metrics
      const totalClicks = gscRecords.reduce((sum: number, r: any) => sum + r.clicks, 0);
      const totalImpressions = gscRecords.reduce((sum: number, r: any) => sum + r.impressions, 0);
      const avgPosition = gscRecords.length > 0
        ? gscRecords.reduce((sum: number, r: any) => sum + r.position, 0) / gscRecords.length
        : 0;
      const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

      // Calculate expected CTR based on position (simplified model)
      const expectedCtr = avgPosition > 0 ? Math.max(0, 100 / (avgPosition + 1)) : 0;
      const ctrImprovement = avgCtr - expectedCtr;

      // Compute component scores (0-100 scale)
      const referralScore = Math.min(100, (traffic.sessions / 10) * 10); // 10 sessions = 10 points
      const organicImpactScore = Math.min(100, Math.max(0, ctrImprovement * 5)); // CTR improvement
      const positionScore = avgPosition > 0 ? Math.max(0, 100 - avgPosition * 5) : 0;

      // Overall value score (weighted average)
      const overallValueScore = (
        referralScore * 0.5 +
        organicImpactScore * 0.3 +
        positionScore * 0.2
      );

      // Store keyword correlation
      for (const gsc of gscRecords) {
        correlationData.push({
          project_id: projectId,
          landing_page: traffic.page,
          referring_domain: traffic.domain,
          query: gsc.query,
          clicks: gsc.clicks,
          impressions: gsc.impressions,
          ctr: gsc.ctr,
          position: gsc.position,
          analysis_date: new Date().toISOString().split('T')[0],
        });
      }

      // Store domain score
      const topKeywords = gscRecords
        .sort((a: any, b: any) => b.clicks - a.clicks)
        .slice(0, 5)
        .map((r: any) => r.query);

      if (!domainScores.has(traffic.domain)) {
        domainScores.set(traffic.domain, {
          project_id: projectId,
          referring_domain: traffic.domain,
          landing_page: traffic.page,
          referral_score: referralScore,
          organic_impact_score: organicImpactScore,
          keyword_relevance_score: positionScore,
          overall_value_score: overallValueScore,
          top_keywords: topKeywords,
          traffic_contribution: traffic.sessions,
          position_improvement: ctrImprovement,
          ai_insights: null,
          computed_at: new Date().toISOString(),
        });
      } else {
        // Update if this page has a higher score
        const existing = domainScores.get(traffic.domain);
        if (overallValueScore > existing.overall_value_score) {
          domainScores.set(traffic.domain, {
            ...existing,
            landing_page: traffic.page,
            referral_score: Math.max(existing.referral_score, referralScore),
            organic_impact_score: Math.max(existing.organic_impact_score, organicImpactScore),
            keyword_relevance_score: Math.max(existing.keyword_relevance_score, positionScore),
            overall_value_score: Math.max(existing.overall_value_score, overallValueScore),
            top_keywords: [...new Set([...existing.top_keywords, ...topKeywords])].slice(0, 10),
            traffic_contribution: existing.traffic_contribution + traffic.sessions,
          });
        }
      }
    }

    console.log('Computed scores for', domainScores.size, 'domains');

    // Step 4: Generate AI insights for top backlinks
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    const topDomains = Array.from(domainScores.values())
      .sort((a, b) => b.overall_value_score - a.overall_value_score)
      .slice(0, 20);

    if (lovableApiKey && topDomains.length > 0) {
      const aiPrompt = `Analyze these backlink performance metrics and provide SEO insights:

${topDomains.map((d, i) => `${i + 1}. ${d.referring_domain}
   - Value Score: ${d.overall_value_score.toFixed(1)}/100
   - Sessions: ${d.traffic_contribution}
   - Top Keywords: ${d.top_keywords.join(', ')}
   - Landing Page: ${d.landing_page}`).join('\n\n')}

Provide:
1. Which backlinks are most valuable and why
2. Keyword themes associated with high-value backlinks
3. Recommendations for link building strategy`;

      try {
        const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${lovableApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              {
                role: 'system',
                content: 'You are an SEO backlink analyst. Provide concise, actionable insights about backlink performance and keyword correlation.'
              },
              { role: 'user', content: aiPrompt }
            ],
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const insights = aiData.choices[0].message.content;

          // Add AI insights to top domains
          for (const domain of topDomains) {
            domain.ai_insights = insights;
          }

          console.log('Generated AI insights');
        }
      } catch (aiError) {
        console.error('AI analysis error:', aiError);
        // Continue without AI insights
      }
    }

    // Step 5: Delete old correlation data and insert new
    await supabase
      .from('backlink_keyword_correlation')
      .delete()
      .eq('project_id', projectId)
      .eq('analysis_date', new Date().toISOString().split('T')[0]);

    if (correlationData.length > 0) {
      const batchSize = 1000;
      for (let i = 0; i < correlationData.length; i += batchSize) {
        const batch = correlationData.slice(i, i + batchSize);
        await supabase.from('backlink_keyword_correlation').insert(batch);
      }
    }

    // Step 6: Delete old scores and insert new
    await supabase
      .from('backlink_value_scores')
      .delete()
      .eq('project_id', projectId);

    if (domainScores.size > 0) {
      await supabase
        .from('backlink_value_scores')
        .insert(Array.from(domainScores.values()));
    }

    console.log('Analysis complete');

    return new Response(
      JSON.stringify({
        success: true,
        domainsAnalyzed: domainScores.size,
        correlationsFound: correlationData.length,
        topBacklinks: topDomains.slice(0, 5).map(d => ({
          domain: d.referring_domain,
          score: d.overall_value_score.toFixed(1),
          sessions: d.traffic_contribution,
        })),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in analyze-backlink-intelligence:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
