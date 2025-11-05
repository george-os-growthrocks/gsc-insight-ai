import { useState, useMemo } from "react";
import Papa from "papaparse";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Download, Sparkles } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface GscRow {
  date?: string;
  query: string;
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface SeoAction {
  id: string;
  type: string;
  priority: number;
  page: string;
  query?: string;
  reason: string;
  recommendation: string;
  metrics?: {
    clicks?: number;
    impressions?: number;
    ctr?: number;
    position?: number;
    expected_ctr?: number;
    potential_click_gain?: number;
    change_28d?: number;
  };
}

interface Props {
  projectId: string;
  onActionsGenerated?: (actions: SeoAction[]) => void;
}

export const GscActionizer = ({ projectId, onActionsGenerated }: Props) => {
  const { toast } = useToast();
  const [csvText, setCsvText] = useState("");
  const [rows, setRows] = useState<GscRow[]>([]);
  const [actions, setActions] = useState<SeoAction[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [quickWinThresh, setQuickWinThresh] = useState(7);
  const [cannibThresh, setCannibalThresh] = useState(2);

  const expectedCtrCurve = (pos: number): number => {
    if (pos <= 1) return 0.35;
    if (pos <= 3) return 0.15;
    if (pos <= 5) return 0.08;
    if (pos <= 10) return 0.04;
    return 0.02;
  };

  const parseData = () => {
    if (!csvText.trim()) {
      toast({
        variant: "destructive",
        title: "No data",
        description: "Please paste CSV data first",
      });
      return;
    }

    const parsed = Papa.parse<any>(csvText, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
    });

    const cleaned: GscRow[] = parsed.data
      .map((r: any) => ({
        date: r.Date || r.date || "",
        query: r.Query || r.query || r["Top queries"] || "",
        page: r.Page || r.page || r["Top pages"] || "",
        clicks: Number(r.Clicks || r.clicks || 0),
        impressions: Number(r.Impressions || r.impressions || 0),
        ctr: Number(r.CTR || r.ctr || 0),
        position: Number(r.Position || r.position || r["Average position"] || 0),
      }))
      .filter((x) => x.query && x.page);

    if (cleaned.length === 0) {
      toast({
        variant: "destructive",
        title: "No valid data",
        description: "Could not parse CSV. Check format.",
      });
      return;
    }

    setRows(cleaned);
    toast({
      title: "Data parsed",
      description: `Loaded ${cleaned.length} rows`,
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      complete: (results) => {
        const cleaned: GscRow[] = results.data
          .map((r: any) => ({
            date: r.Date || r.date || "",
            query: r.Query || r.query || r["Top queries"] || "",
            page: r.Page || r.page || r["Top pages"] || "",
            clicks: Number(r.Clicks || r.clicks || 0),
            impressions: Number(r.Impressions || r.impressions || 0),
            ctr: Number(r.CTR || r.ctr || 0),
            position: Number(r.Position || r.position || r["Average position"] || 0),
          }))
          .filter((x) => x.query && x.page);

        if (cleaned.length === 0) {
          toast({
            variant: "destructive",
            title: "No valid data",
            description: "Could not parse CSV. Check format.",
          });
          return;
        }

        setRows(cleaned);
        toast({
          title: "File uploaded",
          description: `Loaded ${cleaned.length} rows`,
        });
      },
    });
  };

  const analyzeData = async () => {
    if (rows.length === 0) {
      toast({
        variant: "destructive",
        title: "No data to analyze",
        description: "Please parse CSV data first",
      });
      return;
    }

    setAnalyzing(true);
    const newActions: SeoAction[] = [];

    // 1. Quick wins (pos 4-15)
    rows.forEach((r) => {
      if (r.position >= 4 && r.position <= 15 && r.impressions >= 100) {
        const eCtr = expectedCtrCurve(r.position);
        const gain = r.impressions * eCtr - r.clicks;
        if (gain > quickWinThresh) {
          newActions.push({
            id: `qw-${r.page}-${r.query}`,
            type: "Quick Win (Pos 4-15)",
            priority: 90,
            page: r.page,
            query: r.query,
            reason: `Position ${r.position.toFixed(1)} with ${r.impressions} impressions`,
            recommendation: "Optimize title/meta, add FAQ schema, build internal links",
            metrics: {
              clicks: r.clicks,
              impressions: r.impressions,
              ctr: r.ctr,
              position: r.position,
              expected_ctr: eCtr,
              potential_click_gain: gain,
            },
          });
        }
      }
    });

    // 2. Low CTR vs Expected
    rows.forEach((r) => {
      const eCtr = expectedCtrCurve(r.position);
      if (r.ctr < eCtr * 0.6 && r.impressions >= 50) {
        newActions.push({
          id: `ctr-${r.page}-${r.query}`,
          type: "Low CTR vs Expected",
          priority: 75,
          page: r.page,
          query: r.query,
          reason: `CTR ${(r.ctr * 100).toFixed(2)}% vs expected ${(eCtr * 100).toFixed(1)}%`,
          recommendation: "A/B test new title tags, add power words, improve meta description",
          metrics: {
            clicks: r.clicks,
            impressions: r.impressions,
            ctr: r.ctr,
            position: r.position,
            expected_ctr: eCtr,
          },
        });
      }
    });

    // 3. Cannibalization detection
    const queryPageMap: Record<string, Set<string>> = {};
    rows.forEach((r) => {
      if (!queryPageMap[r.query]) queryPageMap[r.query] = new Set();
      queryPageMap[r.query].add(r.page);
    });

    Object.entries(queryPageMap).forEach(([query, pages]) => {
      if (pages.size >= cannibThresh) {
        const pagesArray = Array.from(pages);
        const topPage = pagesArray[0];
        newActions.push({
          id: `cannibal-${query}`,
          type: "Cannibalization",
          priority: 85,
          page: topPage,
          query,
          reason: `Query ranks on ${pages.size} pages: ${pagesArray.join(", ")}`,
          recommendation: `Consolidate content or set canonical to ${topPage}`,
        });
      }
    });

    // 4. Featured snippet opportunities
    rows.forEach((r) => {
      const isQuestion = /^(who|what|where|when|why|how|is|are|can|do|does)/i.test(r.query);
      if (isQuestion && r.position >= 2 && r.position <= 5) {
        newActions.push({
          id: `snippet-${r.page}-${r.query}`,
          type: "Featured Snippet",
          priority: 80,
          page: r.page,
          query: r.query,
          reason: `Question query at position ${r.position.toFixed(1)}`,
          recommendation: "Add concise paragraph answer at top, use lists/tables, implement FAQ schema",
          metrics: {
            impressions: r.impressions,
            position: r.position,
          },
        });
      }
    });

    setActions(newActions);
    onActionsGenerated?.(newActions);

    toast({
      title: "Analysis complete",
      description: `Generated ${newActions.length} actionable insights`,
    });
    setAnalyzing(false);
  };

  const saveTasks = async () => {
    if (actions.length === 0) return;

    const tasksToInsert = actions.map((a) => ({
      project_id: projectId,
      type: a.type,
      priority: a.priority,
      page: a.page,
      query: a.query,
      reason: a.reason,
      recommendation: a.recommendation,
      impressions: a.metrics?.impressions,
      clicks: a.metrics?.clicks,
      ctr: a.metrics?.ctr,
      position: a.metrics?.position,
      expected_ctr: a.metrics?.expected_ctr,
      potential_click_gain: a.metrics?.potential_click_gain,
    }));

    const { error } = await supabase.from("seo_tasks").insert(tasksToInsert);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error saving tasks",
        description: error.message,
      });
    } else {
      toast({
        title: "Tasks saved",
        description: `${actions.length} tasks saved to database`,
      });
    }
  };

  const exportCsv = () => {
    const csv = Papa.unparse(
      actions.map((a) => ({
        Priority: a.priority,
        Type: a.type,
        Page: a.page,
        Query: a.query || "",
        Reason: a.reason,
        Recommendation: a.recommendation,
        Impressions: a.metrics?.impressions || "",
        Clicks: a.metrics?.clicks || "",
        CTR: a.metrics?.ctr ? (a.metrics.ctr * 100).toFixed(2) + "%" : "",
        Position: a.metrics?.position?.toFixed(1) || "",
      }))
    );

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `seo-actions-${Date.now()}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <Tabs defaultValue="paste" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="paste">Paste Data</TabsTrigger>
            <TabsTrigger value="upload">Upload CSV</TabsTrigger>
          </TabsList>
          <TabsContent value="paste" className="space-y-4">
            <div>
              <Label>Paste GSC Data</Label>
              <Textarea
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                placeholder="Paste CSV data from Google Search Console..."
                className="min-h-[200px] font-mono text-sm"
              />
            </div>
            <Button onClick={parseData} className="w-full">
              Parse Data
            </Button>
          </TabsContent>
          <TabsContent value="upload" className="space-y-4">
            <div>
              <Label>Upload CSV File</Label>
              <Input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="cursor-pointer"
              />
            </div>
          </TabsContent>
        </Tabs>

        {rows.length > 0 && (
          <div className="mt-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Quick Win Threshold (clicks)</Label>
                <Input
                  type="number"
                  value={quickWinThresh}
                  onChange={(e) => setQuickWinThresh(Number(e.target.value))}
                  min="0"
                />
              </div>
              <div>
                <Label>Cannibalization Threshold (pages)</Label>
                <Input
                  type="number"
                  value={cannibThresh}
                  onChange={(e) => setCannibalThresh(Number(e.target.value))}
                  min="2"
                />
              </div>
            </div>
            <Button onClick={analyzeData} disabled={analyzing} className="w-full">
              <Sparkles className="h-4 w-4 mr-2" />
              {analyzing ? "Analyzing..." : "Analyze & Generate Actions"}
            </Button>
          </div>
        )}
      </Card>

      {actions.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">SEO Actions ({actions.length})</h3>
            <div className="flex gap-2">
              <Button onClick={saveTasks} variant="outline" size="sm">
                Save to Database
              </Button>
              <Button onClick={exportCsv} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>
          <div className="overflow-auto max-h-[600px]">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted">
                <tr>
                  <th className="p-3 text-left font-semibold">Priority</th>
                  <th className="p-3 text-left font-semibold">Type</th>
                  <th className="p-3 text-left font-semibold">Page</th>
                  <th className="p-3 text-left font-semibold">Query</th>
                  <th className="p-3 text-left font-semibold">Reason</th>
                  <th className="p-3 text-left font-semibold">Recommendation</th>
                  <th className="p-3 text-left font-semibold">Metrics</th>
                </tr>
              </thead>
              <tbody>
                {actions.map((a) => (
                  <tr key={a.id} className="border-t border-border hover:bg-muted/50">
                    <td className="p-3 font-semibold">{a.priority}</td>
                    <td className="p-3">{a.type}</td>
                    <td className="p-3 max-w-[360px] truncate" title={a.page}>
                      {a.page}
                    </td>
                    <td className="p-3 max-w-[280px] truncate" title={a.query}>
                      {a.query}
                    </td>
                    <td className="p-3 max-w-[420px] truncate" title={a.reason}>
                      {a.reason}
                    </td>
                    <td className="p-3 max-w-[420px] truncate" title={a.recommendation}>
                      {a.recommendation}
                    </td>
                    <td className="p-3 text-xs whitespace-nowrap">
                      {a.metrics?.impressions != null && (
                        <span className="mr-2">Imp: {a.metrics.impressions}</span>
                      )}
                      {a.metrics?.clicks != null && (
                        <span className="mr-2">Clk: {a.metrics.clicks}</span>
                      )}
                      {a.metrics?.ctr != null && (
                        <span className="mr-2">CTR: {(a.metrics.ctr * 100).toFixed(1)}%</span>
                      )}
                      {a.metrics?.position != null && (
                        <span className="mr-2">Pos: {a.metrics.position.toFixed(1)}</span>
                      )}
                      {a.metrics?.expected_ctr != null && (
                        <span className="mr-2">
                          eCTR: {(a.metrics.expected_ctr * 100).toFixed(1)}%
                        </span>
                      )}
                      {a.metrics?.potential_click_gain != null && (
                        <span>ΔClicks: {a.metrics.potential_click_gain.toFixed(0)}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};
