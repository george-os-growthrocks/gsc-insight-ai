import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Zap } from "lucide-react";

interface Props {
  projectId: string;
  domain: string | null;
}

export const PageSpeedAnalyzer = ({ projectId, domain }: Props) => {
  const { toast } = useToast();
  const [page, setPage] = useState(domain || "");
  const [performanceScore, setPerformanceScore] = useState("");
  const [fcp, setFcp] = useState("");
  const [lcp, setLcp] = useState("");
  const [cls, setCls] = useState("");
  const [tbt, setTbt] = useState("");
  const [si, setSi] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const { error } = await supabase.from("pagespeed_metrics").insert([
      {
        project_id: projectId,
        page,
        performance_score: performanceScore ? parseInt(performanceScore) : null,
        fcp: fcp ? parseFloat(fcp) : null,
        lcp: lcp ? parseFloat(lcp) : null,
        cls: cls ? parseFloat(cls) : null,
        tbt: tbt ? parseFloat(tbt) : null,
        si: si ? parseFloat(si) : null,
      },
    ]);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error saving metrics",
        description: error.message,
      });
    } else {
      toast({
        title: "Metrics saved",
        description: "PageSpeed metrics saved successfully",
      });
      // Reset form
      setPerformanceScore("");
      setFcp("");
      setLcp("");
      setCls("");
      setTbt("");
      setSi("");
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="h-5 w-5 text-warning" />
          <h3 className="text-lg font-semibold">PageSpeed Metrics</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          Paste your PageSpeed Insights metrics to track performance over time.
        </p>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <Label htmlFor="page">Page URL</Label>
            <Input
              id="page"
              value={page}
              onChange={(e) => setPage(e.target.value)}
              placeholder="https://example.com/page"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="performance">Performance Score (0-100)</Label>
              <Input
                id="performance"
                type="number"
                min="0"
                max="100"
                value={performanceScore}
                onChange={(e) => setPerformanceScore(e.target.value)}
                placeholder="85"
              />
            </div>

            <div>
              <Label htmlFor="fcp">FCP (ms)</Label>
              <Input
                id="fcp"
                type="number"
                step="0.01"
                value={fcp}
                onChange={(e) => setFcp(e.target.value)}
                placeholder="1200"
              />
            </div>

            <div>
              <Label htmlFor="lcp">LCP (ms)</Label>
              <Input
                id="lcp"
                type="number"
                step="0.01"
                value={lcp}
                onChange={(e) => setLcp(e.target.value)}
                placeholder="2500"
              />
            </div>

            <div>
              <Label htmlFor="cls">CLS</Label>
              <Input
                id="cls"
                type="number"
                step="0.001"
                value={cls}
                onChange={(e) => setCls(e.target.value)}
                placeholder="0.1"
              />
            </div>

            <div>
              <Label htmlFor="tbt">TBT (ms)</Label>
              <Input
                id="tbt"
                type="number"
                step="0.01"
                value={tbt}
                onChange={(e) => setTbt(e.target.value)}
                placeholder="300"
              />
            </div>

            <div>
              <Label htmlFor="si">Speed Index (ms)</Label>
              <Input
                id="si"
                type="number"
                step="0.01"
                value={si}
                onChange={(e) => setSi(e.target.value)}
                placeholder="3000"
              />
            </div>
          </div>

          <Button type="submit" disabled={saving} className="w-full">
            {saving ? "Saving..." : "Save Metrics"}
          </Button>
        </form>
      </Card>

      <Card className="p-6 bg-muted/50">
        <h4 className="font-semibold mb-2">How to use:</h4>
        <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
          <li>Visit <a href="https://pagespeed.web.dev/" target="_blank" rel="noopener" className="text-primary hover:underline">PageSpeed Insights</a></li>
          <li>Enter your page URL and run the analysis</li>
          <li>Copy the performance metrics from the results</li>
          <li>Paste them into the form above to track performance over time</li>
        </ol>
      </Card>
    </div>
  );
};
