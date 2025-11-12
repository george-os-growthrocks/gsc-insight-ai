import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, Globe } from "lucide-react";
import { DateRangePicker } from "./DateRangePicker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Props {
  projectId: string;
}

export const GA4Connector = ({ projectId }: Props) => {
  const [connected, setConnected] = useState(false);
  const [propertyId, setPropertyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [dateRange, setDateRange] = useState<{ startDate: string; endDate: string }>({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });
  const [pendingConnection, setPendingConnection] = useState<any>(null);

  useEffect(() => {
    checkConnection();
    checkPendingConnection();
  }, [projectId]);

  const checkConnection = async () => {
    try {
      const { data, error } = await supabase
        .from('ga4_tokens')
        .select('*')
        .eq('project_id', projectId)
        .maybeSingle();

      if (!error && data) {
        setConnected(true);
        setPropertyId(data.property_id);
      }
    } catch (error) {
      console.error('Error checking GA4 connection:', error);
    }
  };

  const checkPendingConnection = () => {
    const pendingData = localStorage.getItem('ga4_pending_connection');
    if (pendingData) {
      const pending = JSON.parse(pendingData);
      if (pending.projectId === projectId) {
        setPendingConnection(pending);
      }
    }
  };

  const handleConnect = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please log in to connect GA4');
        return;
      }

      const { data, error } = await supabase.functions.invoke('ga4-oauth', {
        body: { action: 'get_auth_url' },
      });

      if (error) throw error;

      localStorage.setItem('ga4_pending_connection', JSON.stringify({
        projectId,
        userId: user.id,
      }));

      window.location.href = data.authUrl;
    } catch (error: any) {
      console.error('Error connecting GA4:', error);
      toast.error(error.message || 'Failed to connect GA4');
    } finally {
      setLoading(false);
    }
  };

  const handlePropertySelect = async (selectedPropertyId: string) => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not found');

      const { error } = await supabase.functions.invoke('ga4-oauth', {
        body: {
          action: 'save_connection',
          projectId,
          userId: user.id,
          propertyId: selectedPropertyId,
          access_token: pendingConnection.tokens.access_token,
          refresh_token: pendingConnection.tokens.refresh_token,
          expires_in: pendingConnection.tokens.expires_in,
        },
      });

      if (error) throw error;

      localStorage.removeItem('ga4_pending_connection');
      setConnected(true);
      setPropertyId(selectedPropertyId);
      setPendingConnection(null);
      toast.success('GA4 connected successfully');
    } catch (error: any) {
      console.error('Error saving GA4 connection:', error);
      toast.error(error.message || 'Failed to save GA4 connection');
    } finally {
      setLoading(false);
    }
  };

  const handleFetchData = async () => {
    try {
      setFetching(true);
      toast.info('Fetching GA4 referral traffic data...');

      const { data, error } = await supabase.functions.invoke('ga4-fetch-referral-traffic', {
        body: {
          projectId,
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
        },
      });

      if (error) throw error;

      toast.success(`Imported ${data.rowsImported} referral traffic records from ${data.uniqueDomains} domains`);
    } catch (error: any) {
      console.error('Error fetching GA4 data:', error);
      toast.error(error.message || 'Failed to fetch GA4 data');
    } finally {
      setFetching(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          Google Analytics 4
        </CardTitle>
        <CardDescription>
          Connect GA4 to track referral traffic and backlink performance
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {pendingConnection ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Select your GA4 property to complete the connection:
            </p>
            <Select onValueChange={handlePropertySelect}>
              <SelectTrigger>
                <SelectValue placeholder="Select a property" />
              </SelectTrigger>
              <SelectContent>
                {pendingConnection.properties.map((prop: any) => (
                  <SelectItem key={prop.propertyId} value={prop.propertyId}>
                    {prop.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : connected ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-success" />
              <span>Connected to property: {propertyId}</span>
            </div>
            <div className="space-y-3">
              <DateRangePicker
                value={{
                  from: new Date(dateRange.startDate),
                  to: new Date(dateRange.endDate)
                }}
                onChange={(range) => setDateRange({
                  startDate: range.from.toISOString().split('T')[0],
                  endDate: range.to.toISOString().split('T')[0]
                })}
              />
              <Button
                onClick={handleFetchData}
                disabled={fetching}
                className="w-full"
              >
                {fetching ? 'Fetching Data...' : 'Import Referral Traffic'}
              </Button>
            </div>
          </div>
        ) : (
          <Button onClick={handleConnect} disabled={loading} className="w-full">
            {loading ? 'Connecting...' : 'Connect Google Analytics 4'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
