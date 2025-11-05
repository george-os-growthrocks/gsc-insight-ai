import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Zap, Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Props {
  projectId: string;
  domain: string | null;
}

interface MetricsResult {
  performance_score: number;
  fcp: number | null;
  lcp: number | null;
  cls: number | null;
  tbt: number | null;
  si: number | null;
}

export const AutoPageSpeed = ({ projectId, domain }: Props) => {
  const { toast } = useToast();
  const [url, setUrl] = useState(domain || "");
  const [strategy, setStrategy] = useState<"mobile" | "desktop">("mobile");
  const [loading, setLoading] = useState(false);
  const [metrics, setMetrics] = useState<MetricsResult | null>(null);

  const handleFetch = async () => {
    if (!url) {
      toast({
        variant: "destructive",
        title: "URL required",
        description: "Please enter a URL to analyze",
      });
      return;
    }

    // Normalize URL - add https:// if no protocol
    let normalizedUrl = url.trim();
    if (!normalizedUrl.match(/^https?:\/\//i)) {
      normalizedUrl = `https://${normalizedUrl}`;
    }

    setLoading(true);
    setMetrics(null);

    try {
      const { data, error } = await supabase.functions.invoke("pagespeed-fetch", {
        body: {
          url: normalizedUrl,
          strategy,
          projectId,
        },
      });

      if (error) throw error;

      setMetrics(data.metrics);
      toast({
        title: "Metrics fetched!",
        description: `Performance score: ${data.metrics.performance_score}`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Fetch failed",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return "default";
    if (score >= 50) return "secondary";
    return "destructive";
  };

  const formatMetric = (value: number | null) => {
    if (value === null) return "N/A";
    if (value < 1000) return `${value.toFixed(0)}ms`;
    return `${(value / 1000).toFixed(2)}s`;
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="h-5 w-5 text-warning" />
          <h3 className="text-lg font-semibold">Auto PageSpeed Analysis</h3>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="url">Page URL</Label>
            <Input
              id="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/page"
            />
          </div>

          <div>
            <Label>Device</Label>
            <Select value={strategy} onValueChange={(v: any) => setStrategy(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mobile">Mobile</SelectItem>
                <SelectItem value="desktop">Desktop</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button onClick={handleFetch} disabled={loading} className="w-full">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-2" />
                Analyze Page
              </>
            )}
          </Button>
        </div>
      </Card>

      {metrics && (
        <Card className="p-6">
          <h4 className="font-semibold mb-4">Performance Metrics</h4>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Performance Score</span>
              <Badge variant={getScoreColor(metrics.performance_score)}>
                {metrics.performance_score}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">First Contentful Paint</p>
                <p className="text-lg font-semibold">{formatMetric(metrics.fcp)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Largest Contentful Paint</p>
                <p className="text-lg font-semibold">{formatMetric(metrics.lcp)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Cumulative Layout Shift</p>
                <p className="text-lg font-semibold">
                  {metrics.cls !== null ? metrics.cls.toFixed(3) : "N/A"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Blocking Time</p>
                <p className="text-lg font-semibold">{formatMetric(metrics.tbt)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Speed Index</p>
                <p className="text-lg font-semibold">{formatMetric(metrics.si)}</p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Metrics automatically saved to database
            </p>
          </div>
        </Card>
      )}
    </div>
  );
};
