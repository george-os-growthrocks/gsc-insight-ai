import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { FileText, Loader2, Download } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Props {
  projectId: string;
  clusterId?: string;
  keyword?: string;
}

interface ContentBrief {
  title: string;
  outline: {
    sections: Array<{
      heading: string;
      subheadings: string[];
      wordCount: number;
    }>;
  };
  seoRecommendations: string;
  competitorAnalysis: string;
  wordCount: number;
}

export const ContentBriefGenerator = ({ projectId, clusterId, keyword }: Props) => {
  const { toast } = useToast();
  const [targetKeyword, setTargetKeyword] = useState(keyword || "");
  const [generating, setGenerating] = useState(false);
  const [brief, setBrief] = useState<ContentBrief | null>(null);

  const handleGenerate = async () => {
    if (!targetKeyword) {
      toast({
        variant: "destructive",
        title: "Keyword required",
        description: "Please enter a target keyword",
      });
      return;
    }

    setGenerating(true);

    try {
      const { data, error } = await supabase.functions.invoke("generate-content-brief", {
        body: {
          projectId,
          targetKeyword,
          clusterId,
        },
      });

      if (error) throw error;

      setBrief(data.brief);

      // Save to database
      await supabase.from("content_briefs").insert([
        {
          project_id: projectId,
          cluster_id: clusterId || null,
          title: data.brief.title,
          target_keyword: targetKeyword,
          word_count: data.brief.wordCount,
          outline: data.brief.outline,
          seo_recommendations: data.brief.seoRecommendations,
          competitor_analysis: data.brief.competitorAnalysis,
        },
      ]);

      toast({
        title: "Content brief generated",
        description: "Your SEO-optimized content outline is ready",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Generation failed",
        description: error.message,
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleExport = () => {
    if (!brief) return;

    const markdown = `# ${brief.title}

**Target Keyword:** ${targetKeyword}
**Recommended Word Count:** ${brief.wordCount}

## Content Outline

${brief.outline.sections
  .map(
    (section) => `### ${section.heading}
${section.subheadings.map((sub) => `- ${sub}`).join("\n")}
*Word Count: ${section.wordCount}*
`
  )
  .join("\n\n")}

## SEO Recommendations

${brief.seoRecommendations}

## Competitor Analysis

${brief.competitorAnalysis}
`;

    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `content-brief-${targetKeyword.replace(/\s+/g, "-")}.md`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Content Brief Generator</h3>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="keyword">Target Keyword</Label>
            <Input
              id="keyword"
              value={targetKeyword}
              onChange={(e) => setTargetKeyword(e.target.value)}
              placeholder="best seo tools 2024"
            />
          </div>

          <Button onClick={handleGenerate} disabled={generating} className="w-full">
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating Brief...
              </>
            ) : (
              <>
                <FileText className="h-4 w-4 mr-2" />
                Generate Content Brief
              </>
            )}
          </Button>
        </div>
      </Card>

      {brief && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">{brief.title}</h3>
            <Button onClick={handleExport} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>

          <div className="space-y-6">
            <div>
              <p className="text-sm font-medium mb-2">Recommended Word Count</p>
              <p className="text-2xl font-bold text-primary">{brief.wordCount} words</p>
            </div>

            <div>
              <p className="text-sm font-medium mb-3">Content Outline</p>
              <ScrollArea className="h-[300px] border rounded-lg p-4">
                <div className="space-y-4">
                  {brief.outline.sections.map((section, idx) => (
                    <div key={idx} className="space-y-2">
                      <h4 className="font-semibold text-primary">{section.heading}</h4>
                      <ul className="list-disc list-inside space-y-1 ml-4">
                        {section.subheadings.map((sub, subIdx) => (
                          <li key={subIdx} className="text-sm text-muted-foreground">
                            {sub}
                          </li>
                        ))}
                      </ul>
                      <p className="text-xs text-muted-foreground italic">
                        ~{section.wordCount} words
                      </p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            <div>
              <p className="text-sm font-medium mb-2">SEO Recommendations</p>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm whitespace-pre-wrap">{brief.seoRecommendations}</p>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium mb-2">Competitor Insights</p>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm whitespace-pre-wrap">{brief.competitorAnalysis}</p>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
