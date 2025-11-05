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
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();

  useEffect(() => {
    checkConnection();
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

        {!connected ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Connect your Google Search Console account to automatically import data. We'll detect all available properties after authentication.
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
