import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Plus, Trash2, Target, Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Props {
  projectId: string;
}

interface Competitor {
  id: string;
  domain: string;
  name: string;
}

interface GapAnalysis {
  keyword: string;
  yourPosition: number | null;
  opportunity: string;
  impressions: number;
}

export const CompetitorAnalysis = ({ projectId }: Props) => {
  const { toast } = useToast();
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [newDomain, setNewDomain] = useState("");
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [gaps, setGaps] = useState<GapAnalysis[]>([]);

  useEffect(() => {
    fetchCompetitors();
  }, [projectId]);

  const fetchCompetitors = async () => {
    const { data, error } = await supabase
      .from("competitors")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: true });

    if (error) {
      toast({
        variant: "destructive",
        title: "Error loading competitors",
        description: error.message,
      });
    } else {
      setCompetitors(data || []);
    }
  };

  const handleAddCompetitor = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.from("competitors").insert([
        {
          project_id: projectId,
          domain: newDomain,
          name: newName,
        },
      ]);

      if (error) throw error;

      toast({
        title: "Competitor added",
        description: `${newName} has been added to tracking`,
      });

      setNewDomain("");
      setNewName("");
      fetchCompetitors();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("competitors").delete().eq("id", id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } else {
      toast({
        title: "Competitor removed",
      });
      fetchCompetitors();
    }
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);

    try {
      const { data, error } = await supabase.functions.invoke("analyze-competitors", {
        body: { projectId },
      });

      if (error) throw error;

      setGaps(data.gaps || []);
      toast({
        title: "Analysis complete",
        description: `Found ${data.gaps?.length || 0} keyword opportunities`,
      });
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

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Target className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Competitor Tracking</h3>
        </div>

        <form onSubmit={handleAddCompetitor} className="space-y-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Competitor Name</Label>
              <Input
                id="name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Company Name"
                required
              />
            </div>
            <div>
              <Label htmlFor="domain">Domain</Label>
              <Input
                id="domain"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                placeholder="competitor.com"
                required
              />
            </div>
          </div>
          <Button type="submit" disabled={loading}>
            <Plus className="h-4 w-4 mr-2" />
            Add Competitor
          </Button>
        </form>

        <div className="space-y-2">
          {competitors.length === 0 ? (
            <p className="text-sm text-muted-foreground">No competitors tracked yet</p>
          ) : (
            competitors.map((comp) => (
              <div key={comp.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div>
                  <p className="font-medium">{comp.name}</p>
                  <p className="text-sm text-muted-foreground">{comp.domain}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(comp.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
        </div>

        {competitors.length > 0 && (
          <Button onClick={handleAnalyze} disabled={analyzing} className="w-full mt-4">
            {analyzing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Target className="h-4 w-4 mr-2" />
                Analyze Keyword Gaps
              </>
            )}
          </Button>
        )}
      </Card>

      {gaps.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Keyword Gap Analysis</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Keywords where competitors rank but you don't, sorted by opportunity
          </p>
          <ScrollArea className="h-[400px]">
            <div className="space-y-3">
              {gaps.map((gap, idx) => (
                <div key={idx} className="p-4 border rounded-lg space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium">{gap.keyword}</p>
                      <p className="text-sm text-muted-foreground mt-1">{gap.opportunity}</p>
                    </div>
                    <Badge variant={gap.yourPosition ? "secondary" : "destructive"}>
                      {gap.yourPosition ? `Pos ${gap.yourPosition.toFixed(0)}` : "Not ranking"}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Est. {gap.impressions.toLocaleString()} impressions/month
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </Card>
      )}
    </div>
  );
};
