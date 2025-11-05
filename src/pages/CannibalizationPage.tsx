import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertTriangle,
  RefreshCw,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Eye,
  MousePointer,
  Target,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Props {
  projectId: string;
}

interface CannibalizationCluster {
  id: string;
  query: string;
  cannibalization_score: number;
  primary_page: string;
  supporting_pages: Array<{
    url: string;
    clicks: number;
    impressions: number;
    position: number;
  }>;
  total_clicks: number;
  total_impressions: number;
  avg_position: number;
  keyword_difficulty: number | null;
  expected_ctr: number | null;
  traffic_gain_estimate: number | null;
  action_plan: string | null;
  created_at: string;
}

export default function CannibalizationPage({ projectId }: Props) {
  const [clusters, setClusters] = useState<CannibalizationCluster[]>([]);
  const [loading, setLoading] = useState(true);
  const [detecting, setDetecting] = useState(false);
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [selectedCluster, setSelectedCluster] = useState<CannibalizationCluster | null>(null);
  const [actionPlanDialog, setActionPlanDialog] = useState(false);
  const [expandedClusters, setExpandedClusters] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  useEffect(() => {
    fetchClusters();
  }, [projectId]);

  const fetchClusters = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("cannibalization_clusters")
        .select("*")
        .eq("project_id", projectId)
        .order("cannibalization_score", { ascending: false });

      if (error) throw error;

      // Parse supporting_pages from JSONB
      const parsedData = (data || []).map((cluster: any) => ({
        ...cluster,
        supporting_pages: Array.isArray(cluster.supporting_pages)
          ? cluster.supporting_pages
          : [],
      }));

      setClusters(parsedData);
    } catch (error) {
      console.error("Error fetching clusters:", error);
      toast({
        title: "Error",
        description: "Failed to fetch cannibalization data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDetectCannibalization = async () => {
    try {
      setDetecting(true);
      toast({
        title: "Detecting Cannibalization",
        description: "Analyzing queries for multi-page ranking...",
      });

      const { data, error } = await supabase.functions.invoke("detect-cannibalization", {
        body: { projectId, minImpressions: 50 },
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Found ${data.count} cannibalization issues`,
      });

      fetchClusters();
    } catch (error) {
      console.error("Error detecting cannibalization:", error);
      toast({
        title: "Error",
        description: "Failed to detect cannibalization",
        variant: "destructive",
      });
    } finally {
      setDetecting(false);
    }
  };

  const handleGenerateActionPlan = async (cluster: CannibalizationCluster) => {
    try {
      setGeneratingPlan(true);
      setSelectedCluster(cluster);

      toast({
        title: "Generating Action Plan",
        description: "AI is creating your consolidation strategy...",
      });

      const primaryPageData = {
        position: cluster.avg_position,
        clicks: cluster.total_clicks - cluster.supporting_pages.reduce((sum, p) => sum + p.clicks, 0),
        impressions:
          cluster.total_impressions -
          cluster.supporting_pages.reduce((sum, p) => sum + p.impressions, 0),
      };

      const { data, error } = await supabase.functions.invoke("gemini-cannibalization", {
        body: {
          query: cluster.query,
          primaryPage: cluster.primary_page,
          supportingPages: cluster.supporting_pages,
          metrics: {
            primaryPosition: primaryPageData.position,
            primaryClicks: primaryPageData.clicks,
            primaryImpressions: primaryPageData.impressions,
            totalClicks: cluster.total_clicks,
            totalImpressions: cluster.total_impressions,
            avgPosition: cluster.avg_position,
            cannibalizationScore: cluster.cannibalization_score,
            targetPosition: cluster.avg_position * 0.6,
            trafficGain: cluster.traffic_gain_estimate,
          },
        },
      });

      if (error) throw error;

      // Update cluster with action plan
      const { error: updateError } = await supabase
        .from("cannibalization_clusters")
        .update({ action_plan: data.actionPlan })
        .eq("id", cluster.id);

      if (updateError) throw updateError;

      // Update local state
      setClusters((prev) =>
        prev.map((c) => (c.id === cluster.id ? { ...c, action_plan: data.actionPlan } : c))
      );

      setSelectedCluster((prev) =>
        prev ? { ...prev, action_plan: data.actionPlan } : null
      );

      setActionPlanDialog(true);

      toast({
        title: "Success",
        description: "Action plan generated successfully",
      });
    } catch (error) {
      console.error("Error generating action plan:", error);
      toast({
        title: "Error",
        description: "Failed to generate action plan",
        variant: "destructive",
      });
    } finally {
      setGeneratingPlan(false);
    }
  };

  const toggleClusterExpand = (clusterId: string) => {
    const newExpanded = new Set(expandedClusters);
    if (newExpanded.has(clusterId)) {
      newExpanded.delete(clusterId);
    } else {
      newExpanded.add(clusterId);
    }
    setExpandedClusters(newExpanded);
  };

  const getSeverityColor = (score: number): string => {
    if (score >= 10) return "text-red-600";
    if (score >= 5) return "text-amber-600";
    return "text-yellow-600";
  };

  const getSeverityLabel = (score: number): string => {
    if (score >= 10) return "Severe";
    if (score >= 5) return "Moderate";
    return "Mild";
  };

  const getSeverityBadge = (score: number): "destructive" | "secondary" | "outline" => {
    if (score >= 10) return "destructive";
    if (score >= 5) return "secondary";
    return "outline";
  };

  const stats = useMemo(() => {
    return {
      totalIssues: clusters.length,
      severeIssues: clusters.filter((c) => c.cannibalization_score >= 10).length,
      totalTrafficAtRisk: clusters.reduce((sum, c) => sum + c.total_clicks, 0),
      potentialGain: clusters.reduce((sum, c) => sum + (c.traffic_gain_estimate || 0), 0),
    };
  }, [clusters]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Cannibalization Detection</h2>
          <p className="text-muted-foreground">
            Identify and resolve queries ranking on multiple pages
          </p>
        </div>
        <Button onClick={handleDetectCannibalization} disabled={detecting}>
          {detecting ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Detecting...
            </>
          ) : (
            <>
              <AlertTriangle className="mr-2 h-4 w-4" />
              Detect Issues
            </>
          )}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Issues</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              <p className="text-2xl font-bold">{stats.totalIssues}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Severe Issues</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <p className="text-2xl font-bold text-red-600">{stats.severeIssues}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Traffic at Risk</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <MousePointer className="h-4 w-4 text-muted-foreground" />
              <p className="text-2xl font-bold">{stats.totalTrafficAtRisk.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Potential Gain</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-green-600" />
              <p className="text-2xl font-bold text-green-600">
                +{stats.potentialGain.toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Clusters Table */}
      {clusters.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <CheckCircle2 className="h-16 w-16 text-green-600 mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Cannibalization Detected</h3>
            <p className="text-muted-foreground mb-4">
              Great! No queries are ranking on multiple pages.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[300px]">Query</TableHead>
                    <TableHead className="text-center">Severity</TableHead>
                    <TableHead className="text-center">Pages</TableHead>
                    <TableHead className="text-right">Position</TableHead>
                    <TableHead className="text-right">Clicks</TableHead>
                    <TableHead className="text-right">Traffic Gain</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clusters.map((cluster) => (
                    <Collapsible
                      key={cluster.id}
                      open={expandedClusters.has(cluster.id)}
                      onOpenChange={() => toggleClusterExpand(cluster.id)}
                      asChild
                    >
                      <>
                        <TableRow className="cursor-pointer hover:bg-muted/50">
                          <CollapsibleTrigger asChild>
                            <TableCell className="font-medium">
                              <span className="truncate max-w-[250px] block">{cluster.query}</span>
                            </TableCell>
                          </CollapsibleTrigger>
                          <TableCell className="text-center">
                            <div className="flex flex-col items-center gap-1">
                              <span
                                className={`text-xl font-bold ${getSeverityColor(
                                  cluster.cannibalization_score
                                )}`}
                              >
                                {cluster.cannibalization_score.toFixed(1)}
                              </span>
                              <Badge variant={getSeverityBadge(cluster.cannibalization_score)}>
                                {getSeverityLabel(cluster.cannibalization_score)}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline">{cluster.supporting_pages.length + 1}</Badge>
                          </TableCell>
                          <TableCell className="text-right">{cluster.avg_position.toFixed(1)}</TableCell>
                          <TableCell className="text-right">{cluster.total_clicks.toLocaleString()}</TableCell>
                          <TableCell className="text-right text-green-600 font-semibold">
                            +{cluster.traffic_gain_estimate || 0}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant={cluster.action_plan ? "outline" : "default"}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (cluster.action_plan) {
                                  setSelectedCluster(cluster);
                                  setActionPlanDialog(true);
                                } else {
                                  handleGenerateActionPlan(cluster);
                                }
                              }}
                              disabled={generatingPlan}
                            >
                              {generatingPlan && selectedCluster?.id === cluster.id ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                              ) : cluster.action_plan ? (
                                <>
                                  <Eye className="h-4 w-4 mr-1" />
                                  View
                                </>
                              ) : (
                                <>
                                  <Sparkles className="h-4 w-4 mr-1" />
                                  Plan
                                </>
                              )}
                            </Button>
                          </TableCell>
                        </TableRow>
                        <CollapsibleContent asChild>
                          <TableRow>
                            <TableCell colSpan={7} className="bg-muted/30 p-6">
                              <div className="space-y-4">
                                <div>
                                  <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                                    Primary Page (Keep & Strengthen):
                                  </h4>
                                  <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded p-3">
                                    <p className="text-sm font-mono truncate">{cluster.primary_page}</p>
                                  </div>
                                </div>

                                <div>
                                  <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                                    <ArrowRight className="h-4 w-4 text-amber-600" />
                                    Supporting Pages (Redirect with 301):
                                  </h4>
                                  <div className="space-y-2">
                                    {cluster.supporting_pages.map((page, idx) => (
                                      <div
                                        key={idx}
                                        className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded p-3"
                                      >
                                        <div className="flex items-center justify-between">
                                          <p className="text-sm font-mono truncate max-w-[400px]">
                                            {page.url}
                                          </p>
                                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                            <span>Pos: {page.position.toFixed(1)}</span>
                                            <span>Clicks: {page.clicks}</span>
                                            <span>Impr: {page.impressions.toLocaleString()}</span>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        </CollapsibleContent>
                      </>
                    </Collapsible>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Plan Dialog */}
      <Dialog open={actionPlanDialog} onOpenChange={setActionPlanDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI-Generated Consolidation Action Plan
            </DialogTitle>
            <DialogDescription>
              Query: <span className="font-semibold">{selectedCluster?.query}</span>
            </DialogDescription>
          </DialogHeader>
          {selectedCluster?.action_plan && (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <div className="whitespace-pre-wrap">{selectedCluster.action_plan}</div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
