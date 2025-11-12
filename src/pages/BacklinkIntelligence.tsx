import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Link2, TrendingUp, Users, BarChart3, Sparkles, Eye } from "lucide-react";
import { GA4Connector } from "@/components/GA4Connector";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DateRangePicker } from "@/components/DateRangePicker";

export default function BacklinkIntelligence() {
  const { id: projectId } = useParams();
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [stats, setStats] = useState({
    totalDomains: 0,
    totalSessions: 0,
    avgValueScore: 0,
    topImpact: 0,
  });
  const [backlinks, setBacklinks] = useState<any[]>([]);
  const [selectedBacklink, setSelectedBacklink] = useState<any>(null);
  const [aiInsights, setAiInsights] = useState<string>("");
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    if (projectId) {
      fetchBacklinkData();
    }
  }, [projectId]);

  const fetchBacklinkData = async () => {
    try {
      setLoading(true);

      // Fetch backlink value scores
      const { data: scoresData, error: scoresError } = await supabase
        .from('backlink_value_scores')
        .select('*')
        .eq('project_id', projectId)
        .order('overall_value_score', { ascending: false });

      if (scoresError) throw scoresError;

      setBacklinks(scoresData || []);

      // Calculate stats
      const totalDomains = scoresData?.length || 0;
      const totalSessions = scoresData?.reduce((sum, b) => sum + b.traffic_contribution, 0) || 0;
      const avgValueScore = totalDomains > 0
        ? scoresData.reduce((sum, b) => sum + b.overall_value_score, 0) / totalDomains
        : 0;
      const topImpact = scoresData?.[0]?.overall_value_score || 0;

      setStats({ totalDomains, totalSessions, avgValueScore, topImpact });

      // Get AI insights from the top backlink
      if (scoresData && scoresData.length > 0 && scoresData[0].ai_insights) {
        setAiInsights(scoresData[0].ai_insights);
      }
    } catch (error: any) {
      console.error('Error fetching backlink data:', error);
      toast.error('Failed to load backlink data');
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = async () => {
    try {
      setAnalyzing(true);
      toast.info('Analyzing backlink intelligence...');

      const { data, error } = await supabase.functions.invoke('analyze-backlink-intelligence', {
        body: {
          projectId,
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
        },
      });

      if (error) throw error;

      toast.success(`Analyzed ${data.domainsAnalyzed} domains with ${data.correlationsFound} keyword correlations`);
      await fetchBacklinkData();
    } catch (error: any) {
      console.error('Error analyzing backlinks:', error);
      toast.error(error.message || 'Failed to analyze backlinks');
    } finally {
      setAnalyzing(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return "text-success";
    if (score >= 40) return "text-warning";
    return "text-destructive";
  };

  const getScoreBadge = (score: number) => {
    if (score >= 70) return "default";
    if (score >= 40) return "secondary";
    return "outline";
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Backlink Intelligence</h1>
            <p className="text-muted-foreground">
              Track which backlinks drive real traffic and influence keyword rankings
            </p>
          </div>
        </div>

        <GA4Connector projectId={projectId!} />

        <Card>
          <CardHeader>
            <CardTitle>Run Analysis</CardTitle>
            <CardDescription>Correlate GA4 referral traffic with GSC organic performance</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <DateRangePicker
              value={{
                from: new Date(dateRange.startDate),
                to: new Date(dateRange.endDate)
              }}
              onChange={(range) => setDateRange({
                startDate: range.from.toISOString().split('T')[0],
                endDate: range.to.toISOString().split('T')[0]
              })}
            />
            <Button onClick={handleAnalyze} disabled={analyzing} className="w-full">
              {analyzing ? 'Analyzing...' : 'Analyze Backlink Intelligence'}
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Referring Domains</CardTitle>
            <Link2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDomains}</div>
            <p className="text-xs text-muted-foreground">Active backlinks</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Referral Sessions</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSessions.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Value Score</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getScoreColor(stats.avgValueScore)}`}>
              {stats.avgValueScore.toFixed(1)}
            </div>
            <p className="text-xs text-muted-foreground">Out of 100</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Impact</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getScoreColor(stats.topImpact)}`}>
              {stats.topImpact.toFixed(1)}
            </div>
            <p className="text-xs text-muted-foreground">Highest score</p>
          </CardContent>
        </Card>
      </div>

      {aiInsights && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              AI Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none whitespace-pre-wrap">
              {aiInsights}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>High-Value Backlinks</CardTitle>
          <CardDescription>
            Backlinks ranked by their overall value score (traffic + organic impact + position)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {backlinks.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No backlink data yet. Connect GA4 and run an analysis to get started.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Domain</TableHead>
                  <TableHead>Landing Page</TableHead>
                  <TableHead>Value Score</TableHead>
                  <TableHead>Sessions</TableHead>
                  <TableHead>Top Keywords</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {backlinks.map((backlink) => (
                  <TableRow key={backlink.id}>
                    <TableCell className="font-medium">{backlink.referring_domain}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                      {backlink.landing_page}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getScoreBadge(backlink.overall_value_score)}>
                        {backlink.overall_value_score.toFixed(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>{backlink.traffic_contribution.toLocaleString()}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {backlink.top_keywords.slice(0, 3).map((keyword: string, i: number) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {keyword}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedBacklink(backlink)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedBacklink} onOpenChange={() => setSelectedBacklink(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedBacklink?.referring_domain}</DialogTitle>
          </DialogHeader>
          {selectedBacklink && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Landing Page</h3>
                <p className="text-sm text-muted-foreground break-all">{selectedBacklink.landing_page}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold mb-2">Referral Score</h3>
                  <p className="text-2xl font-bold">{selectedBacklink.referral_score.toFixed(1)}</p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Organic Impact</h3>
                  <p className="text-2xl font-bold">{selectedBacklink.organic_impact_score.toFixed(1)}</p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Keyword Relevance</h3>
                  <p className="text-2xl font-bold">{selectedBacklink.keyword_relevance_score.toFixed(1)}</p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Overall Value</h3>
                  <p className={`text-2xl font-bold ${getScoreColor(selectedBacklink.overall_value_score)}`}>
                    {selectedBacklink.overall_value_score.toFixed(1)}
                  </p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Traffic Contribution</h3>
                <p className="text-lg">{selectedBacklink.traffic_contribution.toLocaleString()} sessions</p>
              </div>

              {selectedBacklink.position_improvement !== null && (
                <div>
                  <h3 className="font-semibold mb-2">Position Improvement</h3>
                  <p className="text-lg">
                    {selectedBacklink.position_improvement > 0 ? '+' : ''}
                    {selectedBacklink.position_improvement.toFixed(2)}
                  </p>
                </div>
              )}

              <div>
                <h3 className="font-semibold mb-2">Top Keywords</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedBacklink.top_keywords.map((keyword: string, i: number) => (
                    <Badge key={i} variant="secondary">
                      {keyword}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
