import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Brain, TrendingUp, Zap, AlertCircle, Link2, RefreshCw, Trash2 } from "lucide-react";

interface Props {
  projectId: string;
}

interface Insight {
  id: string;
  insight_type: string;
  query: string | null;
  page: string | null;
  title: string;
  description: string;
  impact_score: number;
  expected_traffic_gain: number | null;
  effort_level: string;
  priority_score: number;
  current_position: number | null;
  expected_position: number | null;
  current_ctr: number | null;
  expected_ctr: number | null;
  created_at: string;
}

export default function AiInsights({ projectId }: Props) {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchInsights();
  }, [projectId]);

  const fetchInsights = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("ai_insights")
        .select("*")
        .eq("project_id", projectId)
        .order("priority_score", { ascending: false });

      if (error) throw error;
      setInsights(data || []);
    } catch (error) {
      console.error("Error fetching insights:", error);
      toast({
        title: "Error",
        description: "Failed to fetch insights",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateInsights = async () => {
    try {
      setGenerating(true);
      toast({
        title: "Generating Insights",
        description: "AI is analyzing your GSC data...",
      });

      const { data, error } = await supabase.functions.invoke("gemini-insights", {
        body: { projectId },
      });

      if (error) {
        console.error("Function invocation error:", error);
        throw new Error(error.message || "Failed to invoke insights function");
      }

      if (!data) {
        throw new Error("No data returned from insights function");
      }

      toast({
        title: "Success",
        description: `Generated ${data.count || 0} AI-powered insights`,
      });

      fetchInsights();
    } catch (error) {
      console.error("Error generating insights:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to generate insights";
      toast({
        title: "Error Generating Insights",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleDeleteInsight = async (insightId: string) => {
    try {
      const { error } = await supabase
        .from("ai_insights")
        .delete()
        .eq("id", insightId);

      if (error) throw error;

      toast({
        title: "Deleted",
        description: "Insight removed",
      });

      fetchInsights();
    } catch (error) {
      console.error("Error deleting insight:", error);
      toast({
        title: "Error",
        description: "Failed to delete insight",
        variant: "destructive",
      });
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "ctr_opportunity":
        return <TrendingUp className="h-5 w-5" />;
      case "quick_win":
        return <Zap className="h-5 w-5" />;
      case "content_gap":
        return <AlertCircle className="h-5 w-5" />;
      case "cannibalization":
        return <AlertCircle className="h-5 w-5" />;
      case "internal_linking":
        return <Link2 className="h-5 w-5" />;
      default:
        return <Brain className="h-5 w-5" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "ctr_opportunity":
        return "CTR Opportunity";
      case "quick_win":
        return "Quick Win";
      case "content_gap":
        return "Content Gap";
      case "cannibalization":
        return "Cannibalization";
      case "internal_linking":
        return "Internal Linking";
      default:
        return type;
    }
  };

  const getEffortColor = (effort: string) => {
    switch (effort) {
      case "low":
        return "default";
      case "medium":
        return "secondary";
      case "high":
        return "destructive";
      default:
        return "default";
    }
  };

  const getImpactColor = (score: number) => {
    if (score >= 70) return "text-green-600";
    if (score >= 40) return "text-amber-600";
    return "text-red-600";
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">AI-Powered Insights</h2>
          <p className="text-muted-foreground">
            Expert SEO recommendations powered by Google Gemini 2.5
          </p>
        </div>
        <Button onClick={handleGenerateInsights} disabled={generating}>
          {generating ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Brain className="mr-2 h-4 w-4" />
              Generate Insights
            </>
          )}
        </Button>
      </div>

      {insights.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Brain className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Insights Yet</h3>
            <p className="text-muted-foreground mb-4">
              Click "Generate Insights" to analyze your GSC data
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {insights.map((insight) => (
            <Card key={insight.id} className="relative">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="mt-1">{getTypeIcon(insight.insight_type)}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <CardTitle className="text-xl">{insight.title}</CardTitle>
                      </div>
                      <div className="flex flex-wrap gap-2 mb-2">
                        <Badge variant="outline">{getTypeLabel(insight.insight_type)}</Badge>
                        <Badge variant={getEffortColor(insight.effort_level)}>
                          {insight.effort_level} effort
                        </Badge>
                        {insight.query && (
                          <Badge variant="secondary">
                            <span className="font-mono text-xs">{insight.query}</span>
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="mt-2">{insight.description}</CardDescription>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteInsight(insight.id)}
                    className="ml-2"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Impact Score</p>
                    <p className={`text-2xl font-bold ${getImpactColor(insight.impact_score)}`}>
                      {insight.impact_score}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Expected Traffic Gain</p>
                    <p className="text-2xl font-bold text-green-600">
                      +{insight.expected_traffic_gain || 0}
                    </p>
                  </div>
                  {insight.current_position && (
                    <div>
                      <p className="text-muted-foreground">Current Position</p>
                      <p className="text-2xl font-bold">{insight.current_position.toFixed(1)}</p>
                    </div>
                  )}
                  {insight.expected_position && (
                    <div>
                      <p className="text-muted-foreground">Target Position</p>
                      <p className="text-2xl font-bold text-green-600">
                        {insight.expected_position.toFixed(1)}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
