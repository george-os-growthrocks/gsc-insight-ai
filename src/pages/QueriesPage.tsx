import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
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
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  TrendingUp,
  TrendingDown,
  Minus,
  Search,
  Eye,
  MousePointer,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface Props {
  projectId: string;
}

interface GscRow {
  query: string;
  page: string;
  date: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface QueryGroup {
  query: string;
  totalClicks: number;
  totalImpressions: number;
  avgCtr: number;
  avgPosition: number;
  pageCount: number;
  pages: Array<{
    page: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  }>;
  changePercent?: number;
  positionChange?: number;
}

type SortField = "query" | "totalClicks" | "totalImpressions" | "avgCtr" | "avgPosition" | "pageCount" | "changePercent";
type SortDirection = "asc" | "desc";

export default function QueriesPage({ projectId }: Props) {
  const [gscData, setGscData] = useState<GscRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<SortField>("totalImpressions");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [expandedQueries, setExpandedQueries] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  useEffect(() => {
    fetchGscData();
  }, [projectId]);

  const fetchGscData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("gsc_queries")
        .select("*")
        .eq("project_id", projectId)
        .order("date", { ascending: false });

      if (error) throw error;
      setGscData(data || []);
    } catch (error) {
      console.error("Error fetching GSC data:", error);
      toast({
        title: "Error",
        description: "Failed to fetch query data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const groupedQueries = useMemo(() => {
    const queryMap = new Map<string, QueryGroup>();

    // Get date range for period comparison
    const dates = gscData.map((row) => new Date(row.date)).sort((a, b) => b.getTime() - a.getTime());
    const latestDate = dates[0];
    const daysRange = 7; // Compare last 7 days vs previous 7 days
    const periodStart = new Date(latestDate);
    periodStart.setDate(periodStart.getDate() - daysRange);
    const prevPeriodStart = new Date(periodStart);
    prevPeriodStart.setDate(prevPeriodStart.getDate() - daysRange);

    // Group current period data
    const currentPeriodData = gscData.filter((row) => {
      const rowDate = new Date(row.date);
      return rowDate >= periodStart && rowDate <= latestDate;
    });

    const prevPeriodData = gscData.filter((row) => {
      const rowDate = new Date(row.date);
      return rowDate >= prevPeriodStart && rowDate < periodStart;
    });

    // Process current period
    currentPeriodData.forEach((row) => {
      const queryLower = row.query.toLowerCase();
      if (!queryMap.has(queryLower)) {
        queryMap.set(queryLower, {
          query: row.query,
          totalClicks: 0,
          totalImpressions: 0,
          avgCtr: 0,
          avgPosition: 0,
          pageCount: 0,
          pages: [],
        });
      }

      const group = queryMap.get(queryLower)!;
      group.totalClicks += row.clicks;
      group.totalImpressions += row.impressions;

      // Track pages
      const existingPage = group.pages.find((p) => p.page === row.page);
      if (existingPage) {
        existingPage.clicks += row.clicks;
        existingPage.impressions += row.impressions;
        existingPage.position = (existingPage.position + row.position) / 2;
        existingPage.ctr = existingPage.clicks / existingPage.impressions;
      } else {
        group.pages.push({
          page: row.page,
          clicks: row.clicks,
          impressions: row.impressions,
          ctr: row.ctr,
          position: row.position,
        });
      }
    });

    // Calculate averages and period-over-period changes
    queryMap.forEach((group, queryLower) => {
      group.avgCtr = group.totalImpressions > 0 ? group.totalClicks / group.totalImpressions : 0;
      group.avgPosition =
        group.pages.reduce((sum, p) => sum + p.position * p.impressions, 0) /
        group.totalImpressions;
      group.pageCount = group.pages.length;

      // Sort pages by impressions
      group.pages.sort((a, b) => b.impressions - a.impressions);

      // Calculate period-over-period change
      const prevData = prevPeriodData.filter((row) => row.query.toLowerCase() === queryLower);
      const prevClicks = prevData.reduce((sum, row) => sum + row.clicks, 0);
      const prevPosition =
        prevData.length > 0
          ? prevData.reduce((sum, row) => sum + row.position, 0) / prevData.length
          : 0;

      if (prevClicks > 0) {
        group.changePercent = ((group.totalClicks - prevClicks) / prevClicks) * 100;
      }
      if (prevPosition > 0) {
        group.positionChange = prevPosition - group.avgPosition;
      }
    });

    return Array.from(queryMap.values());
  }, [gscData]);

  const filteredQueries = useMemo(() => {
    return groupedQueries;
  }, [groupedQueries]);

  const sortedQueries = useMemo(() => {
    const sorted = [...filteredQueries].sort((a, b) => {
      let aVal: number;
      let bVal: number;

      switch (sortField) {
        case "query":
          return sortDirection === "asc"
            ? a.query.localeCompare(b.query)
            : b.query.localeCompare(a.query);
        case "totalClicks":
          aVal = a.totalClicks;
          bVal = b.totalClicks;
          break;
        case "totalImpressions":
          aVal = a.totalImpressions;
          bVal = b.totalImpressions;
          break;
        case "avgCtr":
          aVal = a.avgCtr;
          bVal = b.avgCtr;
          break;
        case "avgPosition":
          aVal = a.avgPosition;
          bVal = b.avgPosition;
          break;
        case "pageCount":
          aVal = a.pageCount;
          bVal = b.pageCount;
          break;
        case "changePercent":
          aVal = a.changePercent || 0;
          bVal = b.changePercent || 0;
          break;
        default:
          return 0;
      }

      return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
    });

    return sorted;
  }, [filteredQueries, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection(field === "avgPosition" ? "asc" : "desc");
    }
  };

  const toggleQueryExpand = (query: string) => {
    const newExpanded = new Set(expandedQueries);
    if (newExpanded.has(query)) {
      newExpanded.delete(query);
    } else {
      newExpanded.add(query);
    }
    setExpandedQueries(newExpanded);
  };

  const getFilteredByTab = (tab: string): QueryGroup[] => {
    switch (tab) {
      case "new-opportunities":
        return sortedQueries.filter((q) => q.avgPosition <= 10);
      case "lost-opportunities":
        return sortedQueries.filter((q) => q.avgCtr < 0.02);
      case "low-hanging-fruit":
        return sortedQueries.filter(
          (q) => q.totalImpressions > 100 && q.avgCtr < 0.03 && q.avgPosition <= 50
        );
      case "top-3":
        return sortedQueries.filter((q) => q.avgPosition <= 3);
      case "top-10":
        return sortedQueries.filter((q) => q.avgPosition <= 10);
      case "outside-top-10":
        return sortedQueries.filter((q) => q.avgPosition > 10);
      default:
        return sortedQueries;
    }
  };

  const stats = useMemo(() => {
    return {
      totalQueries: groupedQueries.length,
      totalClicks: groupedQueries.reduce((sum, q) => sum + q.totalClicks, 0),
      avgCtr: groupedQueries.length > 0
        ? (groupedQueries.reduce((sum, q) => sum + q.avgCtr, 0) / groupedQueries.length) * 100
        : 0,
      avgPosition: groupedQueries.length > 0
        ? groupedQueries.reduce((sum, q) => sum + q.avgPosition, 0) / groupedQueries.length
        : 0,
    };
  }, [groupedQueries]);

  const SortButton = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => handleSort(field)}
      className="h-8 gap-1 font-semibold"
    >
      {children}
      {sortField === field ? (
        sortDirection === "asc" ? (
          <ArrowUp className="h-3 w-3" />
        ) : (
          <ArrowDown className="h-3 w-3" />
        )
      ) : (
        <ArrowUpDown className="h-3 w-3 opacity-50" />
      )}
    </Button>
  );

  const ChangeIndicator = ({ value, isPosition }: { value?: number; isPosition?: boolean }) => {
    if (value === undefined) return <Minus className="h-4 w-4 text-muted-foreground" />;

    const isPositive = isPosition ? value > 0 : value > 0;
    const color = isPositive ? "text-green-600" : value < 0 ? "text-red-600" : "text-muted-foreground";

    return (
      <div className={`flex items-center gap-1 ${color}`}>
        {isPositive ? (
          <TrendingUp className="h-4 w-4" />
        ) : value < 0 ? (
          <TrendingDown className="h-4 w-4" />
        ) : (
          <Minus className="h-4 w-4" />
        )}
        <span className="text-sm font-medium">
          {isPosition
            ? `${value > 0 ? "+" : ""}${value.toFixed(1)}`
            : `${value > 0 ? "+" : ""}${value.toFixed(1)}%`}
        </span>
      </div>
    );
  };

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
      <div>
        <h2 className="text-3xl font-bold">Query Analysis</h2>
        <p className="text-muted-foreground">
          Analyze search queries and discover optimization opportunities
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Queries</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <p className="text-2xl font-bold">{stats.totalQueries.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Clicks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <MousePointer className="h-4 w-4 text-muted-foreground" />
              <p className="text-2xl font-bold">{stats.totalClicks.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Avg CTR</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-muted-foreground" />
              <p className="text-2xl font-bold">{stats.avgCtr.toFixed(2)}%</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Avg Position</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-muted-foreground" />
              <p className="text-2xl font-bold">{stats.avgPosition.toFixed(1)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs and Table */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="new-opportunities">New Opp.</TabsTrigger>
          <TabsTrigger value="lost-opportunities">Lost Opp.</TabsTrigger>
          <TabsTrigger value="low-hanging-fruit">Low Fruit</TabsTrigger>
          <TabsTrigger value="top-3">Top 3</TabsTrigger>
          <TabsTrigger value="top-10">Top 10</TabsTrigger>
          <TabsTrigger value="outside-top-10">Outside 10</TabsTrigger>
        </TabsList>

        {["all", "new-opportunities", "lost-opportunities", "low-hanging-fruit", "top-3", "top-10", "outside-top-10"].map(
          (tab) => (
            <TabsContent key={tab} value={tab} className="mt-4">
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[300px]">
                            <SortButton field="query">Query</SortButton>
                          </TableHead>
                          <TableHead className="text-right">
                            <SortButton field="totalClicks">Clicks</SortButton>
                          </TableHead>
                          <TableHead className="text-right">
                            <SortButton field="totalImpressions">Impressions</SortButton>
                          </TableHead>
                          <TableHead className="text-right">
                            <SortButton field="avgCtr">CTR</SortButton>
                          </TableHead>
                          <TableHead className="text-right">
                            <SortButton field="avgPosition">Position</SortButton>
                          </TableHead>
                          <TableHead className="text-right">
                            <SortButton field="changePercent">Change</SortButton>
                          </TableHead>
                          <TableHead className="text-right">
                            <SortButton field="pageCount">Pages</SortButton>
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {getFilteredByTab(tab).length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                              No queries found for this filter
                            </TableCell>
                          </TableRow>
                        ) : (
                          getFilteredByTab(tab).map((query) => (
                            <Collapsible
                              key={query.query}
                              open={expandedQueries.has(query.query)}
                              onOpenChange={() => toggleQueryExpand(query.query)}
                              asChild
                            >
                              <>
                                <TableRow className="cursor-pointer hover:bg-muted/50">
                                  <CollapsibleTrigger asChild>
                                    <TableCell className="font-medium">
                                      <div className="flex items-center gap-2">
                                        <span className="truncate max-w-[250px]">{query.query}</span>
                                        {query.pageCount > 1 && (
                                          <Badge variant="outline" className="text-xs">
                                            {query.pageCount}
                                          </Badge>
                                        )}
                                      </div>
                                    </TableCell>
                                  </CollapsibleTrigger>
                                  <TableCell className="text-right">{query.totalClicks.toLocaleString()}</TableCell>
                                  <TableCell className="text-right">{query.totalImpressions.toLocaleString()}</TableCell>
                                  <TableCell className="text-right">{(query.avgCtr * 100).toFixed(2)}%</TableCell>
                                  <TableCell className="text-right">{query.avgPosition.toFixed(1)}</TableCell>
                                  <TableCell className="text-right">
                                    <ChangeIndicator value={query.changePercent} />
                                  </TableCell>
                                  <TableCell className="text-right">{query.pageCount}</TableCell>
                                </TableRow>
                                {query.pageCount > 0 && (
                                  <CollapsibleContent asChild>
                                    <TableRow>
                                      <TableCell colSpan={7} className="bg-muted/30 p-4">
                                        <div className="space-y-2">
                                          <p className="text-sm font-semibold mb-2">
                                            Ranking Pages ({query.pageCount}):
                                          </p>
                                          {query.pages.map((page, idx) => (
                                            <div
                                              key={idx}
                                              className="flex items-center justify-between text-sm border-l-2 border-primary pl-3 py-1"
                                            >
                                              <span className="text-muted-foreground truncate max-w-[400px]">
                                                {page.page}
                                              </span>
                                              <div className="flex items-center gap-4">
                                                <span>Pos: {page.position.toFixed(1)}</span>
                                                <span>Clicks: {page.clicks}</span>
                                                <span>Impr: {page.impressions}</span>
                                                <span>CTR: {(page.ctr * 100).toFixed(2)}%</span>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </TableCell>
                                    </TableRow>
                                  </CollapsibleContent>
                                )}
                              </>
                            </Collapsible>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )
        )}
      </Tabs>
    </div>
  );
}
