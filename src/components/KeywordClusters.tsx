import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Network, Loader2, TrendingUp } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Cluster {
  id: string;
  cluster_name: string;
  keywords: string[];
  topic_score: number;
  avg_position: number;
  total_impressions: number;
  total_clicks: number;
}

interface Props {
  projectId: string;
}

export const KeywordClusters = ({ projectId }: Props) => {
  const { toast } = useToast();
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    fetchClusters();
  }, [projectId]);

  const fetchClusters = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("keyword_clusters")
      .select("*")
      .eq("project_id", projectId)
      .order("total_impressions", { ascending: false });

    if (error) {
      toast({
        variant: "destructive",
        title: "Error loading clusters",
        description: error.message,
      });
    } else {
      setClusters(data || []);
    }
    setLoading(false);
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);

    try {
      const { data, error } = await supabase.functions.invoke("cluster-keywords", {
        body: { projectId },
      });

      if (error) throw error;

      toast({
        title: "Analysis complete!",
        description: `Found ${data.clustersFound} keyword clusters`,
      });

      fetchClusters();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Analysis failed",
        description: error.message,
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return "default";
    if (score >= 40) return "secondary";
    return "outline";
  };

  if (loading) {
    return (
      <Card className="p-12 text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground">Loading clusters...</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Network className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Keyword Clustering & Topic Analysis</h3>
          </div>
          <Button onClick={handleAnalyze} disabled={analyzing}>
            {analyzing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <TrendingUp className="h-4 w-4 mr-2" />
                Analyze Keywords
              </>
            )}
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Automatically groups related queries to identify content themes and gaps
        </p>
      </Card>

      {clusters.length === 0 ? (
        <Card className="p-12 text-center">
          <Network className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No clusters yet</h3>
          <p className="text-muted-foreground mb-4">
            Import GSC data and run keyword clustering to identify content opportunities
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {clusters.map((cluster) => (
            <Card key={cluster.id} className="p-6">
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-lg font-semibold mb-2">{cluster.cluster_name}</h4>
                    <div className="flex gap-2 flex-wrap">
                      <Badge variant={getScoreColor(cluster.topic_score)}>
                        Topic Score: {cluster.topic_score}
                      </Badge>
                      <Badge variant="outline">Avg Position: {cluster.avg_position}</Badge>
                      <Badge variant="secondary">
                        {cluster.keywords.length} keywords
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary">
                      {cluster.total_impressions.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">Total Impressions</p>
                    <p className="text-sm font-semibold mt-1">
                      {cluster.total_clicks} clicks
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium mb-2">Keywords in this cluster:</p>
                  <ScrollArea className="h-24 w-full rounded-md border p-4">
                    <div className="flex flex-wrap gap-2">
                      {cluster.keywords.map((keyword, idx) => (
                        <Badge key={idx} variant="outline">
                          {keyword}
                        </Badge>
                      ))}
                    </div>
                  </ScrollArea>
                </div>

                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    <strong>Content Opportunity:</strong> Consider creating comprehensive
                    content that covers all aspects of this topic cluster to capture more
                    impressions and improve rankings.
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
