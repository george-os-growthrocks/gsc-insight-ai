import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { format, subDays, startOfDay } from "date-fns";
import { Link2, Download, CheckCircle2 } from "lucide-react";
import { DateRangePicker, DateRange } from "@/components/DateRangePicker";

interface Props {
  projectId: string;
}

export const GscConnector = ({ projectId }: Props) => {
  const { toast } = useToast();
  const [connected, setConnected] = useState(false);
  const [propertyUrl, setPropertyUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  // Default to last 28 days (with 3 day delay for GSC data availability)
  const getDefaultRange = (): DateRange => {
    const today = startOfDay(new Date());
    const to = subDays(today, 3); // GSC has ~3 day delay
    const from = subDays(to, 28);
    return { from, to };
  };
  const [dateRange, setDateRange] = useState<DateRange>(getDefaultRange());
  const [pendingConnection, setPendingConnection] = useState<any>(null);
  const [selectedProperty, setSelectedProperty] = useState("");

  useEffect(() => {
    checkConnection();
    checkPendingConnection();
  }, [projectId]);

  const checkConnection = async () => {
    const { data } = await supabase
      .from("google_tokens")
      .select("property_url")
      .eq("project_id", projectId)
      .maybeSingle();

    if (data) {
      setConnected(true);
      setPropertyUrl(data.property_url);
    }
  };

  const checkPendingConnection = () => {
    const pending = sessionStorage.getItem("gsc_pending_connection");
    if (pending) {
      const data = JSON.parse(pending);
      if (data.projectId === projectId) {
        setPendingConnection(data);
      }
    }
  };

  const handlePropertySelect = async () => {
    if (!selectedProperty || !pendingConnection) return;

    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke("gsc-oauth", {
        body: {
          action: "save_connection",
          projectId: pendingConnection.projectId,
          userId: pendingConnection.userId,
          propertyUrl: selectedProperty,
          accessToken: pendingConnection.tokens.access_token,
          refreshToken: pendingConnection.tokens.refresh_token,
          expiresIn: pendingConnection.tokens.expires_in,
        },
      });

      if (error) throw error;

      sessionStorage.removeItem("gsc_pending_connection");
      setPendingConnection(null);
      setSelectedProperty("");
      
      toast({
        title: "Connection saved!",
        description: `Connected to ${selectedProperty}`,
      });

      await checkConnection();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to save connection",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const redirectUri = `${window.location.origin}/gsc-callback`;

      // Get auth URL
      const { data, error } = await supabase.functions.invoke("gsc-oauth", {
        body: {
          action: "get_auth_url",
          redirectUri,
        },
      });

      if (error) throw error;

      // Store project info in session storage for callback
      sessionStorage.setItem(
        "gsc_oauth_state",
        JSON.stringify({
          projectId,
          userId: user.id,
          redirectUri,
        })
      );

      // Redirect to Google OAuth
      window.location.href = data.authUrl;
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Connection failed",
        description: error.message,
      });
      setLoading(false);
    }
  };

  const handleFetchData = async () => {
    if (!dateRange.from || !dateRange.to) {
      toast({
        variant: "destructive",
        title: "Date range required",
        description: "Please select a valid date range",
      });
      return;
    }

    setFetching(true);

    try {
      const { data, error } = await supabase.functions.invoke("gsc-fetch-data", {
        body: {
          projectId,
          startDate: format(dateRange.from, "yyyy-MM-dd"),
          endDate: format(dateRange.to, "yyyy-MM-dd"),
        },
      });

      if (error) throw error;

      toast({
        title: "Data imported!",
        description: `Imported ${data.rowsImported} rows from Google Search Console`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Import failed",
        description: error.message,
      });
    } finally {
      setFetching(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Link2 className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Google Search Console</h3>
          {connected && <CheckCircle2 className="h-5 w-5 text-green-500 ml-auto" />}
        </div>

        {pendingConnection ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Select which property you want to connect:
            </p>
            <div className="space-y-2">
              {pendingConnection.properties.map((prop: any) => (
                <label key={prop.siteUrl} className="flex items-center space-x-2 p-3 border rounded-lg cursor-pointer hover:bg-muted">
                  <input
                    type="radio"
                    name="property"
                    value={prop.siteUrl}
                    checked={selectedProperty === prop.siteUrl}
                    onChange={(e) => setSelectedProperty(e.target.value)}
                    className="h-4 w-4"
                  />
                  <div className="flex-1">
                    <p className="font-medium">{prop.siteUrl}</p>
                    <p className="text-xs text-muted-foreground">{prop.permissionLevel}</p>
                  </div>
                </label>
              ))}
            </div>
            <Button onClick={handlePropertySelect} disabled={!selectedProperty || loading} className="w-full">
              {loading ? "Connecting..." : "Connect Selected Property"}
            </Button>
          </div>
        ) : !connected ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Connect your Google Search Console account to automatically import data. You'll be able to select from all available properties.
            </p>
            <Button onClick={handleConnect} disabled={loading} className="w-full">
              {loading ? "Connecting..." : "Connect Google Search Console"}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm">
                <span className="font-medium">Connected:</span> {propertyUrl}
              </p>
            </div>

            <div className="space-y-2">
              <DateRangePicker
                value={dateRange}
                onChange={setDateRange}
                mode="filter"
              />
              <p className="text-xs text-muted-foreground">
                Selected: {format(dateRange.from, "MMM d, yyyy")} - {format(dateRange.to, "MMM d, yyyy")}
              </p>
            </div>

            <Button onClick={handleFetchData} disabled={fetching} className="w-full">
              <Download className="h-4 w-4 mr-2" />
              {fetching ? "Importing..." : "Import GSC Data"}
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
};
