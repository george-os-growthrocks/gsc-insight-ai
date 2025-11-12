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
    const { action, code, projectId, userId, propertyId } = await req.json();

    const googleClientId = Deno.env.get('GOOGLE_CLIENT_ID');
    const googleClientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
    const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/ga4-oauth`;

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (action === 'get_auth_url') {
      const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      authUrl.searchParams.set('client_id', googleClientId!);
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('scope', 'https://www.googleapis.com/auth/analytics.readonly');
      authUrl.searchParams.set('access_type', 'offline');
      authUrl.searchParams.set('prompt', 'consent');

      return new Response(
        JSON.stringify({ authUrl: authUrl.toString() }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'exchange_code') {
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: googleClientId!,
          client_secret: googleClientSecret!,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      });

      if (!tokenResponse.ok) {
        throw new Error(`Token exchange failed: ${await tokenResponse.text()}`);
      }

      const tokens = await tokenResponse.json();

      // Fetch GA4 properties
      const propertiesResponse = await fetch(
        'https://analyticsadmin.googleapis.com/v1beta/accountSummaries',
        {
          headers: { Authorization: `Bearer ${tokens.access_token}` },
        }
      );

      if (!propertiesResponse.ok) {
        throw new Error(`Failed to fetch properties: ${await propertiesResponse.text()}`);
      }

      const propertiesData = await propertiesResponse.json();
      const properties = propertiesData.accountSummaries?.flatMap((account: any) =>
        account.propertySummaries?.map((prop: any) => ({
          propertyId: prop.property.replace('properties/', ''),
          displayName: prop.displayName,
        })) || []
      ) || [];

      return new Response(
        JSON.stringify({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_in: tokens.expires_in,
          properties,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'save_connection') {
      const { access_token, refresh_token, expires_in } = await req.json();

      const expiresAt = new Date(Date.now() + expires_in * 1000).toISOString();

      const { error } = await supabase.from('ga4_tokens').upsert({
        user_id: userId,
        project_id: projectId,
        access_token,
        refresh_token,
        expires_at: expiresAt,
        property_id: propertyId,
      });

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'refresh_token') {
      const { data: tokenData, error: fetchError } = await supabase
        .from('ga4_tokens')
        .select('*')
        .eq('project_id', projectId)
        .single();

      if (fetchError || !tokenData) {
        throw new Error('Token not found');
      }

      const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          refresh_token: tokenData.refresh_token,
          client_id: googleClientId!,
          client_secret: googleClientSecret!,
          grant_type: 'refresh_token',
        }),
      });

      if (!refreshResponse.ok) {
        throw new Error(`Token refresh failed: ${await refreshResponse.text()}`);
      }

      const newTokens = await refreshResponse.json();
      const newExpiresAt = new Date(Date.now() + newTokens.expires_in * 1000).toISOString();

      const { error: updateError } = await supabase
        .from('ga4_tokens')
        .update({
          access_token: newTokens.access_token,
          expires_at: newExpiresAt,
        })
        .eq('project_id', projectId);

      if (updateError) throw updateError;

      return new Response(
        JSON.stringify({ access_token: newTokens.access_token }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in ga4-oauth:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
