import { useState, useEffect } from "react";
import { useParams, useNavigate, Routes, Route, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AuthGuard } from "@/components/AuthGuard";
import { ProjectLayout } from "@/components/ProjectLayout";
import { ProjectDashboard } from "@/pages/ProjectDashboard";
import { ProjectSettings } from "@/pages/ProjectSettings";
import { GscActionizer } from "@/components/GscActionizer";
import { GscConnector } from "@/components/GscConnector";
import { TaskManager } from "@/components/TaskManager";
import { PageSpeedAnalyzer } from "@/components/PageSpeedAnalyzer";
import { AutoPageSpeed } from "@/components/AutoPageSpeed";
import { KeywordClusters } from "@/components/KeywordClusters";
import { AiAssistant } from "@/components/AiAssistant";
import { AutoSync } from "@/components/AutoSync";
import { AnalyticsDashboard } from "@/components/AnalyticsDashboard";
import { CompetitorAnalysis } from "@/components/CompetitorAnalysis";
import { ContentBriefGenerator } from "@/components/ContentBriefGenerator";
import AiInsights from "@/pages/AiInsights";
import QueriesPage from "@/pages/QueriesPage";
import PagesPage from "@/pages/PagesPage";
import CannibalizationPage from "@/pages/CannibalizationPage";
import ContentIntelligence from "@/pages/ContentIntelligence";
import { useToast } from "@/components/ui/use-toast";

interface Project {
  id: string;
  name: string;
  domain: string | null;
}

const Project = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProject();
  }, [id]);

  const fetchProject = async () => {
    if (!id) return;

    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      toast({
        variant: "destructive",
        title: "Error loading project",
        description: error.message,
      });
      navigate("/dashboard");
    } else {
      setProject(data);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <AuthGuard>
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-muted-foreground">Loading project...</p>
        </div>
      </AuthGuard>
    );
  }

  if (!project) return null;

  return (
    <AuthGuard>
      <ProjectLayout
        projectId={project.id}
        projectName={project.name}
        projectDomain={project.domain}
      >
        <Routes>
          <Route index element={<ProjectDashboard projectId={project.id} projectName={project.name} projectDomain={project.domain} />} />
          <Route
            path="ai-insights"
            element={
              <div className="p-8">
                <AiInsights projectId={project.id} />
              </div>
            }
          />
          <Route
            path="connect"
            element={
              <div className="p-8 space-y-6">
                <div>
                  <h2 className="text-3xl font-bold mb-2">GSC Connection</h2>
                  <p className="text-muted-foreground">
                    Connect and manage your Google Search Console integration
                  </p>
                </div>
                <GscConnector projectId={project.id} />
                <GscActionizer projectId={project.id} />
              </div>
            }
          />
          <Route
            path="analytics"
            element={
              <div className="p-8 space-y-6">
                <div>
                  <h2 className="text-3xl font-bold mb-2">Analytics</h2>
                  <p className="text-muted-foreground">
                    View and analyze your search performance data
                  </p>
                </div>
                <AnalyticsDashboard projectId={project.id} />
              </div>
            }
          />
          <Route
            path="queries"
            element={
              <div className="p-8">
                <QueriesPage projectId={project.id} />
              </div>
            }
          />
          <Route
            path="pages"
            element={
              <div className="p-8">
                <PagesPage projectId={project.id} />
              </div>
            }
          />
          <Route
            path="cannibalization"
            element={
              <div className="p-8">
                <CannibalizationPage projectId={project.id} />
              </div>
            }
          />
          <Route
            path="content-intelligence"
            element={<ContentIntelligence projectId={project.id} />}
          />
          <Route
            path="keywords"
            element={
              <div className="p-8 space-y-6">
                <div>
                  <h2 className="text-3xl font-bold mb-2">Keyword Clusters</h2>
                  <p className="text-muted-foreground">
                    Group and analyze your keywords by topic
                  </p>
                </div>
                <KeywordClusters projectId={project.id} />
              </div>
            }
          />
          <Route
            path="pagespeed"
            element={
              <div className="p-8 space-y-6">
                <div>
                  <h2 className="text-3xl font-bold mb-2">Page Speed</h2>
                  <p className="text-muted-foreground">
                    Analyze and monitor your page performance metrics
                  </p>
                </div>
                <AutoPageSpeed projectId={project.id} domain={project.domain} />
                <PageSpeedAnalyzer projectId={project.id} domain={project.domain} />
              </div>
            }
          />
          <Route
            path="competitors"
            element={
              <div className="p-8 space-y-6">
                <div>
                  <h2 className="text-3xl font-bold mb-2">Competitor Analysis</h2>
                  <p className="text-muted-foreground">
                    Track and analyze your competitors
                  </p>
                </div>
                <CompetitorAnalysis projectId={project.id} />
              </div>
            }
          />
          <Route
            path="briefs"
            element={
              <div className="p-8 space-y-6">
                <div>
                  <h2 className="text-3xl font-bold mb-2">Content Briefs</h2>
                  <p className="text-muted-foreground">
                    Generate AI-powered content briefs for your keywords
                  </p>
                </div>
                <ContentBriefGenerator projectId={project.id} />
              </div>
            }
          />
          <Route
            path="tasks"
            element={
              <div className="p-8 space-y-6">
                <div>
                  <h2 className="text-3xl font-bold mb-2">Task Manager</h2>
                  <p className="text-muted-foreground">
                    Track and manage your SEO optimization tasks
                  </p>
                </div>
                <TaskManager projectId={project.id} />
              </div>
            }
          />
          <Route
            path="sync"
            element={
              <div className="p-8 space-y-6">
                <div>
                  <h2 className="text-3xl font-bold mb-2">Auto Sync</h2>
                  <p className="text-muted-foreground">
                    Configure automatic data synchronization
                  </p>
                </div>
                <AutoSync projectId={project.id} />
              </div>
            }
          />
          <Route
            path="ai"
            element={
              <div className="p-8 space-y-6">
                <div>
                  <h2 className="text-3xl font-bold mb-2">AI Assistant</h2>
                  <p className="text-muted-foreground">
                    Get AI-powered SEO recommendations and insights
                  </p>
                </div>
                <AiAssistant projectId={project.id} />
              </div>
            }
          />
          <Route
            path="settings"
            element={<ProjectSettings projectId={project.id} projectName={project.name} />}
          />
        </Routes>
      </ProjectLayout>
    </AuthGuard>
  );
};

export default Project;
