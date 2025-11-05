import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Link2, Download, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

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
  const getDefaultDates = () => {
    const today = new Date();
    const end = new Date(today);
    end.setDate(end.getDate() - 3); // GSC has ~3 day delay
    const start = new Date(end);
    start.setDate(start.getDate() - 28);
    return { start, end };
  };
  const defaultDates = getDefaultDates();
  const [startDate, setStartDate] = useState<Date>(defaultDates.start);
  const [endDate, setEndDate] = useState<Date>(defaultDates.end);
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
    if (!startDate || !endDate) {
      toast({
        variant: "destructive",
        title: "Date range required",
        description: "Please select start and end dates",
      });
      return;
    }

    setFetching(true);

    try {
      const { data, error } = await supabase.functions.invoke("gsc-fetch-data", {
        body: {
          projectId,
          startDate: format(startDate, "yyyy-MM-dd"),
          endDate: format(endDate, "yyyy-MM-dd"),
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={startDate} onSelect={setStartDate} />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Label>End Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !endDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={endDate} onSelect={setEndDate} />
                  </PopoverContent>
                </Popover>
              </div>
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
