import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Clock, Zap } from "lucide-react";

interface Props {
  projectId: string;
}

export const AutoSync = ({ projectId }: Props) => {
  const { toast } = useToast();
  const [enabled, setEnabled] = useState(false);
  const [frequency, setFrequency] = useState("daily");
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSchedule();
  }, [projectId]);

  const fetchSchedule = async () => {
    const { data } = await supabase
      .from("sync_schedules")
      .select("*")
      .eq("project_id", projectId)
      .maybeSingle();

    if (data) {
      setEnabled(data.enabled);
      setFrequency(data.frequency);
      setLastSync(data.last_sync);
    }
  };

  const handleToggle = async (checked: boolean) => {
    setLoading(true);
    setEnabled(checked);

    try {
      const { data: existing } = await supabase
        .from("sync_schedules")
        .select("id")
        .eq("project_id", projectId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("sync_schedules")
          .update({ enabled: checked })
          .eq("project_id", projectId);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("sync_schedules").insert([
          {
            project_id: projectId,
            enabled: checked,
            frequency,
          },
        ]);

        if (error) throw error;
      }

      toast({
        title: checked ? "Auto-sync enabled" : "Auto-sync disabled",
        description: checked
          ? `GSC data will sync ${frequency}`
          : "Automatic syncing has been disabled",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
      setEnabled(!checked);
    } finally {
      setLoading(false);
    }
  };

  const handleFrequencyChange = async (value: string) => {
    setFrequency(value);

    try {
      const { error } = await supabase
        .from("sync_schedules")
        .update({ frequency: value })
        .eq("project_id", projectId);

      if (error) throw error;

      toast({
        title: "Frequency updated",
        description: `Data will now sync ${value}`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  const handleManualSync = async () => {
    setLoading(true);

    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 28);

      const { data, error } = await supabase.functions.invoke("gsc-fetch-data", {
        body: {
          projectId,
          startDate: startDate.toISOString().split("T")[0],
          endDate: endDate.toISOString().split("T")[0],
        },
      });

      if (error) throw error;

      await supabase
        .from("sync_schedules")
        .update({ last_sync: new Date().toISOString() })
        .eq("project_id", projectId);

      setLastSync(new Date().toISOString());

      toast({
        title: "Manual sync complete",
        description: `Imported ${data.rowsImported} rows`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Sync failed",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Automated Data Sync</h3>
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="auto-sync">Enable Auto-Sync</Label>
            <p className="text-sm text-muted-foreground">
              Automatically import GSC data on schedule
            </p>
          </div>
          <Switch
            id="auto-sync"
            checked={enabled}
            onCheckedChange={handleToggle}
            disabled={loading}
          />
        </div>

        {enabled && (
          <div className="space-y-4">
            <div>
              <Label>Sync Frequency</Label>
              <Select value={frequency} onValueChange={handleFrequencyChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {lastSync && (
              <div className="text-sm text-muted-foreground">
                Last sync: {new Date(lastSync).toLocaleString()}
              </div>
            )}
          </div>
        )}

        <Button onClick={handleManualSync} disabled={loading} variant="outline" className="w-full">
          <Zap className="h-4 w-4 mr-2" />
          {loading ? "Syncing..." : "Manual Sync Now (Last 28 days)"}
        </Button>
      </div>
    </Card>
  );
};
