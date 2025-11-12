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

    console.log('Fetching GA4 referral traffic for project:', projectId);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get GA4 tokens
    const { data: tokenData, error: tokenError } = await supabase
      .from('ga4_tokens')
      .select('*')
      .eq('project_id', projectId)
      .single();

    if (tokenError || !tokenData) {
      console.error('GA4 token not found:', tokenError);
      return new Response(
        JSON.stringify({ error: 'GA4 not connected. Please connect GA4 first.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if token is expired
    let accessToken = tokenData.access_token;
    const expiresAt = new Date(tokenData.expires_at);
    if (expiresAt <= new Date()) {
      console.log('Token expired, refreshing...');
      const refreshResponse = await fetch(
        `${supabaseUrl}/functions/v1/ga4-oauth`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'refresh_token', projectId }),
        }
      );
      const refreshData = await refreshResponse.json();
      accessToken = refreshData.access_token;
    }

    // Fetch referral traffic from GA4
    const propertyId = tokenData.property_id;
    const ga4Response = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dateRanges: [{ startDate, endDate }],
          dimensions: [
            { name: 'sessionSource' },
            { name: 'landingPage' },
            { name: 'date' }
          ],
          metrics: [
            { name: 'sessions' },
            { name: 'engagedSessions' },
            { name: 'averageSessionDuration' },
            { name: 'bounceRate' }
          ],
          dimensionFilter: {
            filter: {
              fieldName: 'sessionMedium',
              stringFilter: {
                matchType: 'EXACT',
                value: 'referral'
              }
            }
          },
          limit: 10000,
        }),
      }
    );

    if (!ga4Response.ok) {
      const errorText = await ga4Response.text();
      console.error('GA4 API error:', errorText);
      throw new Error(`GA4 API error: ${errorText}`);
    }

    const ga4Data = await ga4Response.json();
    console.log('GA4 response rows:', ga4Data.rows?.length || 0);

    // Delete existing data for this date range
    await supabase
      .from('backlink_traffic')
      .delete()
      .eq('project_id', projectId)
      .gte('date', startDate)
      .lte('date', endDate);

    // Process and insert data
    const rows = ga4Data.rows || [];
    const trafficData = [];
    const domainsMap = new Map();

    for (const row of rows) {
      const referringDomain = row.dimensionValues[0].value;
      const landingPage = row.dimensionValues[1].value;
      const date = row.dimensionValues[2].value;
      const sessions = parseInt(row.metricValues[0].value) || 0;
      const engagedSessions = parseInt(row.metricValues[1].value) || 0;
      const avgSessionDuration = parseFloat(row.metricValues[2].value) || 0;
      const bounceRate = parseFloat(row.metricValues[3].value) || 0;

      trafficData.push({
        project_id: projectId,
        referring_domain: referringDomain,
        landing_page: landingPage,
        date: date.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3'),
        sessions,
        engaged_sessions: engagedSessions,
        avg_session_duration: avgSessionDuration,
        bounce_rate: bounceRate,
      });

      // Aggregate domain stats
      if (!domainsMap.has(referringDomain)) {
        domainsMap.set(referringDomain, { sessions: 0, engagedSessions: 0 });
      }
      const domainStats = domainsMap.get(referringDomain);
      domainStats.sessions += sessions;
      domainStats.engagedSessions += engagedSessions;
    }

    // Insert traffic data in batches
    if (trafficData.length > 0) {
      const batchSize = 1000;
      for (let i = 0; i < trafficData.length; i += batchSize) {
        const batch = trafficData.slice(i, i + batchSize);
        const { error } = await supabase.from('backlink_traffic').insert(batch);
        if (error) {
          console.error('Error inserting batch:', error);
        }
      }
    }

    // Update referring_domains table
    for (const [domain, stats] of domainsMap.entries()) {
      const { data: existing } = await supabase
        .from('referring_domains')
        .select('*')
        .eq('project_id', projectId)
        .eq('domain', domain)
        .single();

      if (existing) {
        await supabase
          .from('referring_domains')
          .update({
            last_seen: new Date().toISOString(),
            total_sessions: existing.total_sessions + stats.sessions,
            total_engaged_sessions: existing.total_engaged_sessions + stats.engagedSessions,
            status: 'active',
          })
          .eq('id', existing.id);
      } else {
        await supabase.from('referring_domains').insert({
          project_id: projectId,
          domain,
          total_sessions: stats.sessions,
          total_engaged_sessions: stats.engagedSessions,
          status: 'active',
        });
      }
    }

    console.log('Successfully imported', trafficData.length, 'traffic records');

    return new Response(
      JSON.stringify({
        success: true,
        rowsImported: trafficData.length,
        uniqueDomains: domainsMap.size,
        dateRange: { startDate, endDate },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in ga4-fetch-referral-traffic:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
