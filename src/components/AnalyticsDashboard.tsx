import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { TrendingUp, TrendingDown, Eye, MousePointer, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Props {
  projectId: string;
}

interface Analytics {
  totalClicks: number;
  totalImpressions: number;
  avgCtr: number;
  avgPosition: number;
  topQueries: Array<{ query: string; clicks: number; impressions: number }>;
  topPages: Array<{ page: string; clicks: number; impressions: number }>;
  trend: {
    clicks: number;
    impressions: number;
  };
}

export const AnalyticsDashboard = ({ projectId }: Props) => {
  const { toast } = useToast();
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, [projectId]);

  const fetchAnalytics = async () => {
    setLoading(true);

    try {
      // Get last 28 days of data
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 28);

      const prevStartDate = new Date(startDate);
      prevStartDate.setDate(prevStartDate.getDate() - 28);

      // Current period
      const { data: currentData, error: currentError } = await supabase
        .from("gsc_queries")
        .select("*")
        .eq("project_id", projectId)
        .gte("date", startDate.toISOString().split("T")[0])
        .lte("date", endDate.toISOString().split("T")[0]);

      if (currentError) throw currentError;

      // Previous period for trends
      const { data: prevData, error: prevError } = await supabase
        .from("gsc_queries")
        .select("clicks, impressions")
        .eq("project_id", projectId)
        .gte("date", prevStartDate.toISOString().split("T")[0])
        .lt("date", startDate.toISOString().split("T")[0]);

      if (prevError) throw prevError;

      if (!currentData || currentData.length === 0) {
        setAnalytics(null);
        setLoading(false);
        return;
      }

      // Calculate totals
      const totalClicks = currentData.reduce((sum, row) => sum + row.clicks, 0);
      const totalImpressions = currentData.reduce((sum, row) => sum + row.impressions, 0);
      const avgCtr = totalClicks / totalImpressions;
      const avgPosition =
        currentData.reduce((sum, row) => sum + row.position, 0) / currentData.length;

      // Previous period totals
      const prevClicks = prevData?.reduce((sum, row) => sum + row.clicks, 0) || 0;
      const prevImpressions = prevData?.reduce((sum, row) => sum + row.impressions, 0) || 0;

      // Aggregate by query
      const queryMap = new Map<string, { clicks: number; impressions: number }>();
      currentData.forEach((row) => {
        const existing = queryMap.get(row.query);
        if (existing) {
          existing.clicks += row.clicks;
          existing.impressions += row.impressions;
        } else {
          queryMap.set(row.query, { clicks: row.clicks, impressions: row.impressions });
        }
      });

      const topQueries = Array.from(queryMap.entries())
        .map(([query, data]) => ({ query, ...data }))
        .sort((a, b) => b.clicks - a.clicks)
        .slice(0, 10);

      // Aggregate by page
      const pageMap = new Map<string, { clicks: number; impressions: number }>();
      currentData.forEach((row) => {
        const existing = pageMap.get(row.page);
        if (existing) {
          existing.clicks += row.clicks;
          existing.impressions += row.impressions;
        } else {
          pageMap.set(row.page, { clicks: row.clicks, impressions: row.impressions });
        }
      });

      const topPages = Array.from(pageMap.entries())
        .map(([page, data]) => ({ page, ...data }))
        .sort((a, b) => b.clicks - a.clicks)
        .slice(0, 10);

      setAnalytics({
        totalClicks,
        totalImpressions,
        avgCtr,
        avgPosition,
        topQueries,
        topPages,
        trend: {
          clicks: prevClicks > 0 ? ((totalClicks - prevClicks) / prevClicks) * 100 : 0,
          impressions:
            prevImpressions > 0
              ? ((totalImpressions - prevImpressions) / prevImpressions) * 100
              : 0,
        },
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error loading analytics",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-12 text-center">
        <p className="text-muted-foreground">Loading analytics...</p>
      </Card>
    );
  }

  if (!analytics) {
    return (
      <Card className="p-12 text-center">
        <p className="text-muted-foreground">No data available. Import GSC data to see analytics.</p>
      </Card>
    );
  }

  const getTrendIcon = (value: number) => {
    return value >= 0 ? (
      <TrendingUp className="h-4 w-4 text-green-500" />
    ) : (
      <TrendingDown className="h-4 w-4 text-red-500" />
    );
  };

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-muted-foreground">Total Clicks</p>
            <MousePointer className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="text-2xl font-bold">{analytics.totalClicks.toLocaleString()}</p>
          <div className="flex items-center gap-1 mt-2">
            {getTrendIcon(analytics.trend.clicks)}
            <span className="text-xs text-muted-foreground">
              {Math.abs(analytics.trend.clicks).toFixed(1)}% vs prev period
            </span>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-muted-foreground">Total Impressions</p>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="text-2xl font-bold">{analytics.totalImpressions.toLocaleString()}</p>
          <div className="flex items-center gap-1 mt-2">
            {getTrendIcon(analytics.trend.impressions)}
            <span className="text-xs text-muted-foreground">
              {Math.abs(analytics.trend.impressions).toFixed(1)}% vs prev period
            </span>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-muted-foreground">Avg CTR</p>
            <Target className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="text-2xl font-bold">{(analytics.avgCtr * 100).toFixed(2)}%</p>
          <p className="text-xs text-muted-foreground mt-2">Click-through rate</p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-muted-foreground">Avg Position</p>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="text-2xl font-bold">{analytics.avgPosition.toFixed(1)}</p>
          <p className="text-xs text-muted-foreground mt-2">Average ranking</p>
        </Card>
      </div>

      {/* Top Queries */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Top Performing Queries</h3>
        <div className="space-y-3">
          {analytics.topQueries.map((query, idx) => (
            <div key={idx} className="flex items-center justify-between pb-3 border-b last:border-0">
              <div className="flex-1">
                <p className="font-medium truncate max-w-md">{query.query}</p>
                <p className="text-sm text-muted-foreground">
                  {query.impressions.toLocaleString()} impressions
                </p>
              </div>
              <Badge variant="default">{query.clicks} clicks</Badge>
            </div>
          ))}
        </div>
      </Card>

      {/* Top Pages */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Top Performing Pages</h3>
        <div className="space-y-3">
          {analytics.topPages.map((page, idx) => (
            <div key={idx} className="flex items-center justify-between pb-3 border-b last:border-0">
              <div className="flex-1">
                <p className="font-medium text-sm truncate max-w-md">{page.page}</p>
                <p className="text-sm text-muted-foreground">
                  {page.impressions.toLocaleString()} impressions
                </p>
              </div>
              <Badge variant="default">{page.clicks} clicks</Badge>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
