import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, TrendingUp, Eye, MousePointerClick } from "lucide-react";

interface Props {
  projectId: string;
}

export const ProjectDashboard = ({ projectId }: Props) => {
  const [stats, setStats] = useState({
    totalQueries: 0,
    avgPosition: 0,
    totalImpressions: 0,
    totalClicks: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, [projectId]);

  const fetchStats = async () => {
    const { data, error } = await supabase
      .from("gsc_queries")
      .select("query, position, impressions, clicks")
      .eq("project_id", projectId);

    if (!error && data) {
      const uniqueQueries = new Set(data.map((d) => d.query));
      const totalImpressions = data.reduce((sum, d) => sum + d.impressions, 0);
      const totalClicks = data.reduce((sum, d) => sum + d.clicks, 0);
      const avgPosition =
        data.length > 0 ? data.reduce((sum, d) => sum + d.position, 0) / data.length : 0;

      setStats({
        totalQueries: uniqueQueries.size,
        avgPosition: Math.round(avgPosition * 10) / 10,
        totalImpressions,
        totalClicks,
      });
    }
    setLoading(false);
  };

  const statCards = [
    {
      title: "Total Keywords",
      value: stats.totalQueries.toLocaleString(),
      icon: Activity,
      description: "Unique queries tracked",
    },
    {
      title: "Avg. Position",
      value: stats.avgPosition.toFixed(1),
      icon: TrendingUp,
      description: "Average ranking position",
    },
    {
      title: "Total Impressions",
      value: stats.totalImpressions.toLocaleString(),
      icon: Eye,
      description: "Times shown in search",
    },
    {
      title: "Total Clicks",
      value: stats.totalClicks.toLocaleString(),
      icon: MousePointerClick,
      description: "Clicks from search results",
    },
  ];

  if (loading) {
    return (
      <div className="p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-3">
                <div className="h-4 bg-muted rounded w-24 mb-2" />
                <div className="h-8 bg-muted rounded w-16" />
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      <div>
        <h2 className="text-3xl font-bold mb-2">Dashboard</h2>
        <p className="text-muted-foreground">Overview of your SEO performance</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks to improve your SEO</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-dashed cursor-pointer hover:bg-muted/50 transition-colors">
            <CardContent className="p-6 text-center">
              <Activity className="h-8 w-8 mx-auto mb-2 text-primary" />
              <p className="font-medium">Sync GSC Data</p>
              <p className="text-xs text-muted-foreground mt-1">Get latest search data</p>
            </CardContent>
          </Card>
          <Card className="border-dashed cursor-pointer hover:bg-muted/50 transition-colors">
            <CardContent className="p-6 text-center">
              <TrendingUp className="h-8 w-8 mx-auto mb-2 text-primary" />
              <p className="font-medium">Analyze Keywords</p>
              <p className="text-xs text-muted-foreground mt-1">Find opportunities</p>
            </CardContent>
          </Card>
          <Card className="border-dashed cursor-pointer hover:bg-muted/50 transition-colors">
            <CardContent className="p-6 text-center">
              <MousePointerClick className="h-8 w-8 mx-auto mb-2 text-primary" />
              <p className="font-medium">Generate Brief</p>
              <p className="text-xs text-muted-foreground mt-1">Create content plan</p>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
};
