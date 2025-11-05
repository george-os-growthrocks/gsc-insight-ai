import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  RefreshCw,
  FileText,
  Eye,
  MousePointer,
  Target,
  TrendingUp,
  ListPlus,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";

interface Props {
  projectId: string;
}

interface PageAnalysis {
  id: string;
  page_url: string;
  total_clicks: number;
  total_impressions: number;
  avg_ctr: number;
  avg_position: number;
  performance_score: number;
  content_quality_score: number | null;
  queries: Array<{
    query: string;
    clicks: number;
    impressions: number;
    position: number;
    ctr: number;
  }>;
  created_at: string;
}

type SortField = "page_url" | "total_clicks" | "total_impressions" | "avg_ctr" | "avg_position" | "performance_score";
type SortDirection = "asc" | "desc";

export default function PagesPage({ projectId }: Props) {
  const [pages, setPages] = useState<PageAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [sortField, setSortField] = useState<SortField>("performance_score");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [expandedPages, setExpandedPages] = useState<Set<string>>(new Set());
  const [addingTask, setAddingTask] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const { toast } = useToast();

  useEffect(() => {
    fetchPageAnalyses();
  }, [projectId]);

  const fetchPageAnalyses = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("page_analysis")
        .select("*")
        .eq("project_id", projectId)
        .order("performance_score", { ascending: false });

      if (error) throw error;
      
      // Parse queries from JSONB
      const parsedData = (data || []).map((page: any) => ({
        ...page,
        queries: Array.isArray(page.queries) ? page.queries : [],
      }));
      
      setPages(parsedData);
    } catch (error) {
      console.error("Error fetching page analyses:", error);
      toast({
        title: "Error",
        description: "Failed to fetch page analyses",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzePages = async () => {
    try {
      setAnalyzing(true);
      toast({
        title: "Analyzing Pages",
        description: "Processing page performance data...",
      });

      const { data, error } = await supabase.functions.invoke("analyze-pages", {
        body: { projectId },
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Analyzed ${data.count} pages`,
      });

      fetchPageAnalyses();
    } catch (error) {
      console.error("Error analyzing pages:", error);
      toast({
        title: "Error",
        description: "Failed to analyze pages",
        variant: "destructive",
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const sortedPages = useMemo(() => {
    const sorted = [...pages].sort((a, b) => {
      let aVal: number | string;
      let bVal: number | string;

      switch (sortField) {
        case "page_url":
          return sortDirection === "asc"
            ? a.page_url.localeCompare(b.page_url)
            : b.page_url.localeCompare(a.page_url);
        case "total_clicks":
          aVal = a.total_clicks;
          bVal = b.total_clicks;
          break;
        case "total_impressions":
          aVal = a.total_impressions;
          bVal = b.total_impressions;
          break;
        case "avg_ctr":
          aVal = a.avg_ctr;
          bVal = b.avg_ctr;
          break;
        case "avg_position":
          aVal = a.avg_position;
          bVal = b.avg_position;
          break;
        case "performance_score":
          aVal = a.performance_score;
          bVal = b.performance_score;
          break;
        default:
          return 0;
      }

      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
      }
      return 0;
    });

    return sorted;
  }, [pages, sortField, sortDirection]);

  const paginatedPages = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return sortedPages.slice(startIndex, endIndex);
  }, [sortedPages, currentPage, itemsPerPage]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection(field === "avg_position" ? "asc" : "desc");
    }
  };

  const togglePageExpand = (pageUrl: string) => {
    const newExpanded = new Set(expandedPages);
    if (newExpanded.has(pageUrl)) {
      newExpanded.delete(pageUrl);
    } else {
      newExpanded.add(pageUrl);
    }
    setExpandedPages(newExpanded);
  };

  const handleAddToTask = async (page: PageAnalysis) => {
    try {
      setAddingTask(true);

      const topQueries = page.queries
        .sort((a, b) => b.impressions - a.impressions)
        .slice(0, 3)
        .map((q) => q.query)
        .join(", ");

      let taskType = "optimization";
      let reason = "";
      let recommendation = "";

      if (page.performance_score < 50) {
        taskType = "low_performance";
        reason = `Page has low performance score (${page.performance_score}) with ${page.total_clicks} clicks and position ${page.avg_position.toFixed(1)}`;
        recommendation = `Improve content quality, optimize for target keywords (${topQueries}), and enhance on-page SEO elements`;
      } else if (page.avg_position > 10) {
        taskType = "content_gap";
        reason = `Page ranks outside top 10 (position ${page.avg_position.toFixed(1)}) for ${page.queries.length} queries`;
        recommendation = `Create comprehensive content targeting: ${topQueries}. Analyze top-ranking competitors and fill content gaps`;
      } else if (page.avg_ctr < 0.05) {
        taskType = "ctr_optimization";
        reason = `Page has low CTR (${(page.avg_ctr * 100).toFixed(2)}%) at position ${page.avg_position.toFixed(1)}`;
        recommendation = `Optimize title tags and meta descriptions for queries: ${topQueries}`;
      } else {
        reason = `Optimize page performance for ${page.queries.length} ranking queries`;
        recommendation = `Focus on improving rankings for: ${topQueries}`;
      }

      const { error } = await supabase.from("seo_tasks").insert({
        project_id: projectId,
        type: taskType,
        page: page.page_url,
        query: topQueries,
        reason,
        recommendation,
        priority: Math.round(100 - page.performance_score),
        clicks: page.total_clicks,
        impressions: page.total_impressions,
        ctr: page.avg_ctr,
        position: page.avg_position,
        expected_ctr: page.avg_ctr * 1.5,
        status: "pending",
      });

      if (error) throw error;

      toast({
        title: "Task Created",
        description: "Page optimization task added to your list",
      });
    } catch (error) {
      console.error("Error adding task:", error);
      toast({
        title: "Error",
        description: "Failed to create task",
        variant: "destructive",
      });
    } finally {
      setAddingTask(false);
    }
  };

  const getScoreColor = (score: number): string => {
    if (score >= 70) return "text-green-600";
    if (score >= 50) return "text-amber-600";
    return "text-red-600";
  };

  const getScoreLabel = (score: number): string => {
    if (score >= 70) return "Excellent";
    if (score >= 50) return "Good";
    return "Needs Work";
  };

  const getScoreBadgeVariant = (score: number): "default" | "secondary" | "destructive" => {
    if (score >= 70) return "default";
    if (score >= 50) return "secondary";
    return "destructive";
  };

  const stats = useMemo(() => {
    return {
      totalPages: pages.length,
      totalClicks: pages.reduce((sum, p) => sum + p.total_clicks, 0),
      avgScore:
        pages.length > 0
          ? pages.reduce((sum, p) => sum + p.performance_score, 0) / pages.length
          : 0,
      avgPosition:
        pages.length > 0 ? pages.reduce((sum, p) => sum + p.avg_position, 0) / pages.length : 0,
    };
  }, [pages]);

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
          <h2 className="text-3xl font-bold">Page Performance</h2>
          <p className="text-muted-foreground">
            Analyze page performance scores and ranking queries
          </p>
        </div>
        <Button onClick={handleAnalyzePages} disabled={analyzing}>
          {analyzing ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Analyze Pages
            </>
          )}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Pages</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <p className="text-2xl font-bold">{stats.totalPages.toLocaleString()}</p>
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
            <CardDescription>Avg Performance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <p className={`text-2xl font-bold ${getScoreColor(stats.avgScore)}`}>
                {stats.avgScore.toFixed(0)}
              </p>
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

      {/* Pages Table */}
      {pages.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileText className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Page Analyses Yet</h3>
            <p className="text-muted-foreground mb-4">
              Click "Analyze Pages" to process your GSC data
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
                    <TableHead className="w-[350px]">
                      <SortButton field="page_url">Page URL</SortButton>
                    </TableHead>
                    <TableHead className="text-right">
                      <SortButton field="performance_score">Score</SortButton>
                    </TableHead>
                    <TableHead className="text-right">
                      <SortButton field="total_clicks">Clicks</SortButton>
                    </TableHead>
                    <TableHead className="text-right">
                      <SortButton field="total_impressions">Impressions</SortButton>
                    </TableHead>
                    <TableHead className="text-right">
                      <SortButton field="avg_ctr">CTR</SortButton>
                    </TableHead>
                    <TableHead className="text-right">
                      <SortButton field="avg_position">Position</SortButton>
                    </TableHead>
                    <TableHead className="text-right">Queries</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedPages.map((page) => (
                    <Collapsible
                      key={page.id}
                      open={expandedPages.has(page.page_url)}
                      onOpenChange={() => togglePageExpand(page.page_url)}
                      asChild
                    >
                      <>
                        <TableRow className="cursor-pointer hover:bg-muted/50">
                          <CollapsibleTrigger asChild>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <span className="truncate max-w-[300px]">{page.page_url}</span>
                              </div>
                            </TableCell>
                          </CollapsibleTrigger>
                          <TableCell className="text-right">
                            <div className="flex flex-col items-end gap-1">
                              <span
                                className={`text-2xl font-bold ${getScoreColor(
                                  page.performance_score
                                )}`}
                              >
                                {page.performance_score}
                              </span>
                              <Badge variant={getScoreBadgeVariant(page.performance_score)}>
                                {getScoreLabel(page.performance_score)}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">{page.total_clicks.toLocaleString()}</TableCell>
                          <TableCell className="text-right">
                            {page.total_impressions.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right">
                            {(page.avg_ctr * 100).toFixed(2)}%
                          </TableCell>
                          <TableCell className="text-right">{page.avg_position.toFixed(1)}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant="outline">{page.queries.length}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAddToTask(page);
                              }}
                              disabled={addingTask}
                            >
                              <ListPlus className="h-4 w-4 mr-1" />
                              Task
                            </Button>
                          </TableCell>
                        </TableRow>
                        {page.queries.length > 0 && (
                          <CollapsibleContent asChild>
                            <TableRow>
                              <TableCell colSpan={8} className="bg-muted/30 p-4">
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between mb-3">
                                    <p className="text-sm font-semibold">
                                      Ranking Queries ({page.queries.length}):
                                    </p>
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs text-muted-foreground">
                                        Performance Score
                                      </span>
                                      <Progress value={page.performance_score} className="w-24" />
                                      <span className={`text-xs font-medium ${getScoreColor(page.performance_score)}`}>
                                        {page.performance_score}%
                                      </span>
                                    </div>
                                  </div>
                                  {page.queries.slice(0, 10).map((query, idx) => (
                                    <div
                                      key={idx}
                                      className="flex items-center justify-between text-sm border-l-2 border-primary pl-3 py-1 hover:bg-muted/50 rounded-r"
                                    >
                                      <span className="font-medium truncate max-w-[300px]">
                                        {query.query}
                                      </span>
                                      <div className="flex items-center gap-4 text-muted-foreground">
                                        <span className="flex items-center gap-1">
                                          <Target className="h-3 w-3" />
                                          Pos: {query.position.toFixed(1)}
                                        </span>
                                        <span className="flex items-center gap-1">
                                          <MousePointer className="h-3 w-3" />
                                          {query.clicks}
                                        </span>
                                        <span className="flex items-center gap-1">
                                          <Eye className="h-3 w-3" />
                                          {query.impressions.toLocaleString()}
                                        </span>
                                        <span>CTR: {(query.ctr * 100).toFixed(2)}%</span>
                                      </div>
                                    </div>
                                  ))}
                                  {page.queries.length > 10 && (
                                    <p className="text-xs text-muted-foreground text-center pt-2">
                                      Showing top 10 of {page.queries.length} queries
                                    </p>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          </CollapsibleContent>
                        )}
                      </>
                    </Collapsible>
                  ))}
                </TableBody>
              </Table>
            </div>
            {/* Pagination Controls */}
            {pages.length > 0 && (
              <div className="flex items-center justify-between px-4 py-4 border-t">
                <div className="flex items-center gap-4">
                  <p className="text-sm text-muted-foreground">
                    Showing {((currentPage - 1) * itemsPerPage) + 1} to{" "}
                    {Math.min(currentPage * itemsPerPage, sortedPages.length)} of{" "}
                    {sortedPages.length} pages
                  </p>
                  <Select
                    value={itemsPerPage.toString()}
                    onValueChange={(value) => {
                      setItemsPerPage(Number(value));
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger className="w-[100px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="25">25 / page</SelectItem>
                      <SelectItem value="50">50 / page</SelectItem>
                      <SelectItem value="100">100 / page</SelectItem>
                      <SelectItem value="500">500 / page</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <span className="text-sm">
                    Page {currentPage} of {Math.ceil(sortedPages.length / itemsPerPage)}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.min(Math.ceil(sortedPages.length / itemsPerPage), currentPage + 1))}
                    disabled={currentPage >= Math.ceil(sortedPages.length / itemsPerPage)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
