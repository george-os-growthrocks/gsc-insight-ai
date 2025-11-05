import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AuthGuard } from "@/components/AuthGuard";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Search } from "lucide-react";
import { GscActionizer } from "@/components/GscActionizer";
import { GscConnector } from "@/components/GscConnector";
import { TaskManager } from "@/components/TaskManager";
import { PageSpeedAnalyzer } from "@/components/PageSpeedAnalyzer";
import { AutoPageSpeed } from "@/components/AutoPageSpeed";
import { KeywordClusters } from "@/components/KeywordClusters";
import { AiAssistant } from "@/components/AiAssistant";
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
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
        <div className="border-b bg-card">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div className="flex items-center gap-2">
                <Search className="h-5 w-5 text-primary" />
                <h1 className="text-xl font-bold">{project.name}</h1>
                {project.domain && (
                  <span className="text-sm text-muted-foreground">· {project.domain}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          <Tabs defaultValue="connect" className="w-full">
            <TabsList className="grid w-full grid-cols-6 mb-6">
              <TabsTrigger value="connect">Connect</TabsTrigger>
              <TabsTrigger value="clusters">Clusters</TabsTrigger>
              <TabsTrigger value="analyzer">Analyzer</TabsTrigger>
              <TabsTrigger value="tasks">Tasks</TabsTrigger>
              <TabsTrigger value="pagespeed">PageSpeed</TabsTrigger>
              <TabsTrigger value="ai">AI</TabsTrigger>
            </TabsList>

            <TabsContent value="connect">
              <div className="space-y-6">
                <GscConnector projectId={project.id} />
                <GscActionizer projectId={project.id} />
              </div>
            </TabsContent>

            <TabsContent value="clusters">
              <KeywordClusters projectId={project.id} />
            </TabsContent>

            <TabsContent value="analyzer">
              <GscActionizer projectId={project.id} />
            </TabsContent>

            <TabsContent value="tasks">
              <TaskManager projectId={project.id} />
            </TabsContent>

            <TabsContent value="pagespeed">
              <div className="space-y-6">
                <AutoPageSpeed projectId={project.id} domain={project.domain} />
                <PageSpeedAnalyzer projectId={project.id} domain={project.domain} />
              </div>
            </TabsContent>

            <TabsContent value="ai">
              <AiAssistant projectId={project.id} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AuthGuard>
  );
};

export default Project;
