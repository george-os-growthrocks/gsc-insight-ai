import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Download,
  FileText,
  TrendingUp,
  Target,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Calendar,
} from "lucide-react";

interface Props {
  projectId: string;
  projectName: string;
  projectDomain: string | null;
}

export const ExportReport = ({ projectId, projectName, projectDomain }: Props) => {
  const [generating, setGenerating] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const { toast } = useToast();

  const generateReport = async () => {
    try {
      setGenerating(true);

      // Fetch all data needed for the report
      const [
        insightsData,
        cannibalizationData,
        pagesData,
        tasksData,
        gscData,
      ] = await Promise.all([
        supabase.from("ai_insights").select("*").eq("project_id", projectId),
        supabase.from("cannibalization_clusters").select("*").eq("project_id", projectId),
        supabase.from("page_analysis").select("*").eq("project_id", projectId),
        supabase.from("seo_tasks").select("*").eq("project_id", projectId).eq("status", "pending"),
        supabase.from("gsc_queries").select("*").eq("project_id", projectId),
      ]);

      const insights = insightsData.data || [];
      const cannibalization = cannibalizationData.data || [];
      const pages = pagesData.data || [];
      const tasks = tasksData.data || [];
      const queries = gscData.data || [];

      // Calculate metrics
      const totalClicks = queries.reduce((sum, q) => sum + q.clicks, 0);
      const totalImpressions = queries.reduce((sum, q) => sum + q.impressions, 0);
      const avgCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
      const avgPosition = queries.length > 0
        ? queries.reduce((sum, q) => sum + q.position, 0) / queries.length
        : 0;

      const potentialTrafficGain = insights.reduce((sum, i) => sum + (i.expected_traffic_gain || 0), 0) +
        cannibalization.reduce((sum, c) => sum + (c.traffic_gain_estimate || 0), 0);

      setReportData({
        projectName,
        projectDomain,
        generatedAt: new Date().toISOString(),
        summary: {
          totalQueries: new Set(queries.map(q => q.query)).size,
          totalPages: pages.length,
          totalClicks,
          totalImpressions,
          avgCTR,
          avgPosition,
        },
        insights: insights.slice(0, 10),
        cannibalization: cannibalization.slice(0, 5),
        topPages: pages.sort((a, b) => b.performance_score - a.performance_score).slice(0, 10),
        tasks: tasks.slice(0, 15),
        potentialGain: potentialTrafficGain,
      });

      toast({
        title: "Report Generated",
        description: "Your SEO report is ready to view",
      });
    } catch (error) {
      console.error("Error generating report:", error);
      toast({
        title: "Error",
        description: "Failed to generate report",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const downloadPDF = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow || !reportData) return;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${projectName} - SEO Report</title>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 1200px;
              margin: 0 auto;
              padding: 40px 20px;
            }
            .header {
              text-align: center;
              margin-bottom: 40px;
              border-bottom: 3px solid #2563eb;
              padding-bottom: 20px;
            }
            .header h1 {
              color: #1e40af;
              margin: 0;
              font-size: 32px;
            }
            .header p {
              color: #64748b;
              margin: 10px 0 0 0;
            }
            .metric-grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 20px;
              margin-bottom: 40px;
            }
            .metric-card {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 20px;
              border-radius: 12px;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .metric-card h3 {
              margin: 0 0 10px 0;
              font-size: 14px;
              opacity: 0.9;
              font-weight: 500;
            }
            .metric-card .value {
              font-size: 32px;
              font-weight: bold;
              margin: 0;
            }
            .section {
              margin-bottom: 40px;
              page-break-inside: avoid;
            }
            .section-title {
              font-size: 24px;
              color: #1e40af;
              margin-bottom: 20px;
              padding-bottom: 10px;
              border-bottom: 2px solid #e5e7eb;
            }
            .card {
              background: #f9fafb;
              border: 1px solid #e5e7eb;
              border-radius: 8px;
              padding: 20px;
              margin-bottom: 15px;
            }
            .card-header {
              display: flex;
              justify-content: space-between;
              align-items: start;
              margin-bottom: 12px;
            }
            .card-title {
              font-size: 16px;
              font-weight: 600;
              color: #1e293b;
              margin: 0;
            }
            .badge {
              display: inline-block;
              padding: 4px 12px;
              border-radius: 12px;
              font-size: 12px;
              font-weight: 600;
            }
            .badge-green { background: #dcfce7; color: #166534; }
            .badge-yellow { background: #fef9c3; color: #854d0e; }
            .badge-red { background: #fee2e2; color: #991b1b; }
            .badge-blue { background: #dbeafe; color: #1e40af; }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 15px;
            }
            th, td {
              padding: 12px;
              text-align: left;
              border-bottom: 1px solid #e5e7eb;
            }
            th {
              background: #f3f4f6;
              font-weight: 600;
              color: #374151;
            }
            .footer {
              margin-top: 60px;
              padding-top: 20px;
              border-top: 2px solid #e5e7eb;
              text-align: center;
              color: #64748b;
              font-size: 14px;
            }
            .gain-highlight {
              background: linear-gradient(135deg, #10b981 0%, #059669 100%);
              color: white;
              padding: 30px;
              border-radius: 12px;
              text-align: center;
              margin: 30px 0;
            }
            .gain-highlight h2 {
              margin: 0 0 10px 0;
              font-size: 20px;
            }
            .gain-highlight .value {
              font-size: 48px;
              font-weight: bold;
              margin: 10px 0;
            }
            @media print {
              body { padding: 20px; }
              .metric-grid { page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${projectName}</h1>
            <p>${projectDomain || "SEO Performance Report"}</p>
            <p>Generated on ${new Date(reportData.generatedAt).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}</p>
          </div>

          <div class="metric-grid">
            <div class="metric-card">
              <h3>Total Clicks</h3>
              <div class="value">${reportData.summary.totalClicks.toLocaleString()}</div>
            </div>
            <div class="metric-card">
              <h3>Total Impressions</h3>
              <div class="value">${reportData.summary.totalImpressions.toLocaleString()}</div>
            </div>
            <div class="metric-card">
              <h3>Avg CTR</h3>
              <div class="value">${reportData.summary.avgCTR.toFixed(2)}%</div>
            </div>
            <div class="metric-card">
              <h3>Avg Position</h3>
              <div class="value">${reportData.summary.avgPosition.toFixed(1)}</div>
            </div>
            <div class="metric-card">
              <h3>Total Queries</h3>
              <div class="value">${reportData.summary.totalQueries.toLocaleString()}</div>
            </div>
            <div class="metric-card">
              <h3>Analyzed Pages</h3>
              <div class="value">${reportData.summary.totalPages}</div>
            </div>
          </div>

          ${reportData.potentialGain > 0 ? `
            <div class="gain-highlight">
              <h2>🚀 Estimated Monthly Traffic Gain</h2>
              <div class="value">+${reportData.potentialGain.toLocaleString()} clicks</div>
              <p>Potential traffic increase if all recommendations are implemented</p>
            </div>
          ` : ""}

          <div class="section">
            <h2 class="section-title">🔍 Top AI Insights</h2>
            ${reportData.insights.map((insight: any) => `
              <div class="card">
                <div class="card-header">
                  <h3 class="card-title">${insight.title}</h3>
                  <span class="badge badge-${insight.impact_score >= 70 ? "green" : insight.impact_score >= 40 ? "yellow" : "red"}">
                    Impact: ${insight.impact_score}
                  </span>
                </div>
                <p>${insight.description}</p>
                ${insight.query ? `<p><strong>Query:</strong> ${insight.query}</p>` : ""}
                <p><strong>Expected Traffic Gain:</strong> +${insight.expected_traffic_gain || 0} clicks/month</p>
                <p><strong>Effort Level:</strong> ${insight.effort_level}</p>
              </div>
            `).join("")}
          </div>

          ${reportData.cannibalization.length > 0 ? `
            <div class="section">
              <h2 class="section-title">⚠️ Cannibalization Issues</h2>
              ${reportData.cannibalization.map((issue: any) => `
                <div class="card">
                  <div class="card-header">
                    <h3 class="card-title">${issue.query}</h3>
                    <span class="badge badge-red">
                      Score: ${issue.cannibalization_score.toFixed(1)}
                    </span>
                  </div>
                  <p><strong>Pages Affected:</strong> ${(issue.supporting_pages?.length || 0) + 1}</p>
                  <p><strong>Primary Page:</strong> ${issue.primary_page}</p>
                  <p><strong>Traffic at Risk:</strong> ${issue.total_clicks} clicks</p>
                  <p><strong>Potential Gain:</strong> +${issue.traffic_gain_estimate || 0} clicks</p>
                </div>
              `).join("")}
            </div>
          ` : ""}

          <div class="section">
            <h2 class="section-title">📄 Top Performing Pages</h2>
            <table>
              <thead>
                <tr>
                  <th>Page URL</th>
                  <th>Performance Score</th>
                  <th>Clicks</th>
                  <th>Impressions</th>
                  <th>Avg Position</th>
                </tr>
              </thead>
              <tbody>
                ${reportData.topPages.map((page: any) => `
                  <tr>
                    <td>${page.page_url}</td>
                    <td><span class="badge badge-${page.performance_score >= 70 ? "green" : page.performance_score >= 50 ? "yellow" : "red"}">${page.performance_score}</span></td>
                    <td>${page.total_clicks.toLocaleString()}</td>
                    <td>${page.total_impressions.toLocaleString()}</td>
                    <td>${page.avg_position.toFixed(1)}</td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>

          <div class="section">
            <h2 class="section-title">📋 Recommended Actions (Next Steps)</h2>
            ${reportData.tasks.map((task: any, index: number) => `
              <div class="card">
                <div class="card-header">
                  <h3 class="card-title">${index + 1}. ${task.recommendation.substring(0, 100)}...</h3>
                  <span class="badge badge-blue">Priority: ${task.priority}</span>
                </div>
                <p><strong>Page:</strong> ${task.page}</p>
                ${task.query ? `<p><strong>Query:</strong> ${task.query}</p>` : ""}
                <p><strong>Reason:</strong> ${task.reason}</p>
                ${task.potential_click_gain ? `<p><strong>Expected Gain:</strong> +${task.potential_click_gain} clicks</p>` : ""}
              </div>
            `).join("")}
          </div>

          <div class="footer">
            <p>Generated by GrowthHackers SearchOps</p>
            <p>This report contains actionable SEO insights based on your Google Search Console data</p>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button onClick={generateReport} disabled={generating}>
          {generating ? (
            <>
              <FileText className="mr-2 h-4 w-4 animate-pulse" />
              Generating...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Export Report
            </>
          )}
        </Button>
      </DialogTrigger>
      {reportData && (
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>SEO Performance Report</DialogTitle>
            <DialogDescription>
              Comprehensive analysis of your SEO performance with actionable insights
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Summary Stats */}
            <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Performance Overview</CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(reportData.generatedAt).toLocaleDateString()}
                    </CardDescription>
                  </div>
                  <Button onClick={downloadPDF} size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Download PDF
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Total Clicks</p>
                    <p className="text-3xl font-bold">{reportData.summary.totalClicks.toLocaleString()}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Avg CTR</p>
                    <p className="text-3xl font-bold">{reportData.summary.avgCTR.toFixed(2)}%</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Avg Position</p>
                    <p className="text-3xl font-bold">{reportData.summary.avgPosition.toFixed(1)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Traffic Gain Potential */}
            {reportData.potentialGain > 0 && (
              <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/5 border-green-200">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <TrendingUp className="h-5 w-5 text-green-600" />
                      <h3 className="text-lg font-semibold text-green-900">Estimated Monthly Traffic Gain</h3>
                    </div>
                    <p className="text-4xl font-bold text-green-600">
                      +{reportData.potentialGain.toLocaleString()} clicks
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Potential increase if all recommendations are implemented
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Top Insights */}
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Top AI Insights
              </h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {reportData.insights.slice(0, 5).map((insight: any, idx: number) => (
                  <Card key={idx} className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{insight.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">{insight.description.substring(0, 150)}...</p>
                      </div>
                      <Badge variant={insight.impact_score >= 70 ? "default" : "secondary"}>
                        +{insight.expected_traffic_gain || 0}
                      </Badge>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {/* Cannibalization Issues */}
            {reportData.cannibalization.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                  Cannibalization Issues
                </h3>
                <div className="space-y-2">
                  {reportData.cannibalization.slice(0, 3).map((issue: any, idx: number) => (
                    <Card key={idx} className="p-3 border-amber-200 bg-amber-50/50">
                      <p className="font-medium text-sm">{issue.query}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {(issue.supporting_pages?.length || 0) + 1} pages competing • +{issue.traffic_gain_estimate || 0} potential gain
                      </p>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Next Steps */}
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-blue-600" />
                Next Actions ({reportData.tasks.length} tasks)
              </h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {reportData.tasks.slice(0, 10).map((task: any, idx: number) => (
                  <Card key={idx} className="p-3">
                    <div className="flex items-start gap-3">
                      <Badge variant="outline" className="mt-0.5">{idx + 1}</Badge>
                      <div className="flex-1">
                        <p className="text-sm">{task.recommendation.substring(0, 120)}...</p>
                        {task.potential_click_gain && (
                          <p className="text-xs text-green-600 font-medium mt-1">
                            Expected: +{task.potential_click_gain} clicks
                          </p>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      )}
    </Dialog>
  );
};
