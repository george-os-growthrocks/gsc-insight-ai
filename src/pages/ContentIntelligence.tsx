import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Download, Copy, Search, Globe, Sparkles, BarChart3 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

interface Props {
  projectId: string;
}

export default function ContentIntelligence({ projectId }: Props) {
  const { toast } = useToast();
  
  // Scrape state
  const [scrapeUrl, setScrapeUrl] = useState("");
  const [scraping, setScraping] = useState(false);
  const [scrapedContent, setScrapedContent] = useState<any>(null);

  // SERP state
  const [serpQuery, setSerpQuery] = useState("");
  const [fetchingSERP, setFetchingSERP] = useState(false);
  const [serpResults, setSerpResults] = useState<any[]>([]);

  // Crawl state
  const [crawlUrl, setCrawlUrl] = useState("");
  const [crawlLimit, setCrawlLimit] = useState(10);
  const [crawlEntireDomain, setCrawlEntireDomain] = useState(false);
  const [crawling, setCrawling] = useState(false);
  const [crawledPages, setCrawledPages] = useState<any[]>([]);

  // Regeneration state
  const [regenUrl, setRegenUrl] = useState("");
  const [regenQuery, setRegenQuery] = useState("");
  const [regenContent, setRegenContent] = useState("");
  const [regenerating, setRegenerating] = useState(false);
  const [regeneratedContent, setRegeneratedContent] = useState<any>(null);

  const handleScrape = async () => {
    if (!scrapeUrl) {
      toast({ title: "Error", description: "Please enter a URL", variant: "destructive" });
      return;
    }

    try {
      setScraping(true);
      const { data, error } = await supabase.functions.invoke("firecrawl-scrape", {
        body: { url: scrapeUrl, projectId },
      });

      if (error) throw error;

      setScrapedContent(data.data);
      toast({ title: "Success", description: "Page scraped successfully" });
    } catch (error) {
      console.error("Scrape error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to scrape page",
        variant: "destructive",
      });
    } finally {
      setScraping(false);
    }
  };

  const handleFetchSERP = async () => {
    if (!serpQuery) {
      toast({ title: "Error", description: "Please enter a query", variant: "destructive" });
      return;
    }

    try {
      setFetchingSERP(true);
      const { data, error } = await supabase.functions.invoke("firecrawl-search", {
        body: { query: serpQuery, projectId, limit: 10 },
      });

      if (error) throw error;

      setSerpResults(data.data || []);
      toast({ title: "Success", description: `Fetched ${data.count} SERP results` });
    } catch (error) {
      console.error("SERP fetch error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to fetch SERP results",
        variant: "destructive",
      });
    } finally {
      setFetchingSERP(false);
    }
  };

  const handleCrawl = async () => {
    if (!crawlUrl) {
      toast({ title: "Error", description: "Please enter a URL", variant: "destructive" });
      return;
    }

    try {
      setCrawling(true);
      const { data, error } = await supabase.functions.invoke("firecrawl-crawl", {
        body: { url: crawlUrl, projectId, limit: crawlLimit, crawlEntireDomain },
      });

      if (error) throw error;

      if (data.jobId) {
        toast({
          title: "Crawl Started",
          description: "Large crawl job started. Check back later for results.",
        });
      } else {
        setCrawledPages(data.data || []);
        toast({ title: "Success", description: `Crawled ${data.count} pages` });
      }
    } catch (error) {
      console.error("Crawl error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to crawl website",
        variant: "destructive",
      });
    } finally {
      setCrawling(false);
    }
  };

  const handleRegenerate = async () => {
    if (!regenUrl || !regenQuery || !regenContent) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    try {
      setRegenerating(true);
      const competitorUrls = serpResults.slice(0, 3).map(r => r.url);
      
      const { data, error } = await supabase.functions.invoke("regenerate-content", {
        body: {
          originalContent: regenContent,
          targetQuery: regenQuery,
          targetUrl: regenUrl,
          projectId,
          competitorUrls,
        },
      });

      if (error) throw error;

      setRegeneratedContent(data.data);
      toast({ title: "Success", description: "Content regenerated successfully" });
    } catch (error) {
      console.error("Regeneration error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to regenerate content",
        variant: "destructive",
      });
    } finally {
      setRegenerating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied", description: "Content copied to clipboard" });
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Content Intelligence</h1>
        <p className="text-muted-foreground">
          Scrape, analyze, and regenerate content with AI-powered insights
        </p>
      </div>

      <Tabs defaultValue="scrape" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="scrape">
            <Globe className="h-4 w-4 mr-2" />
            Scrape
          </TabsTrigger>
          <TabsTrigger value="serp">
            <Search className="h-4 w-4 mr-2" />
            SERP Analysis
          </TabsTrigger>
          <TabsTrigger value="crawl">
            <BarChart3 className="h-4 w-4 mr-2" />
            Crawl
          </TabsTrigger>
          <TabsTrigger value="regenerate">
            <Sparkles className="h-4 w-4 mr-2" />
            Regenerate
          </TabsTrigger>
        </TabsList>

        <TabsContent value="scrape" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Scrape Single Page</CardTitle>
              <CardDescription>
                Extract content from any URL using Firecrawl
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="scrape-url">URL</Label>
                <Input
                  id="scrape-url"
                  placeholder="https://example.com/page"
                  value={scrapeUrl}
                  onChange={(e) => setScrapeUrl(e.target.value)}
                />
              </div>
              <Button onClick={handleScrape} disabled={scraping}>
                {scraping ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Scraping...
                  </>
                ) : (
                  "Scrape Page"
                )}
              </Button>

              {scrapedContent && (
                <div className="mt-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Scraped Content</h3>
                    <div className="flex gap-2">
                      <Badge>{scrapedContent.word_count} words</Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(scrapedContent.content_markdown)}
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copy
                      </Button>
                    </div>
                  </div>
                  <div className="bg-muted p-4 rounded-lg max-h-96 overflow-auto">
                    <pre className="text-sm whitespace-pre-wrap">
                      {scrapedContent.content_markdown}
                    </pre>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="serp" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>SERP Analysis</CardTitle>
              <CardDescription>
                Fetch and analyze top 10 ranking pages for any query
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="serp-query">Search Query</Label>
                <Input
                  id="serp-query"
                  placeholder="best seo tools"
                  value={serpQuery}
                  onChange={(e) => setSerpQuery(e.target.value)}
                />
              </div>
              <Button onClick={handleFetchSERP} disabled={fetchingSERP}>
                {fetchingSERP ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Fetching...
                  </>
                ) : (
                  "Fetch Top 10 SERP"
                )}
              </Button>

              {serpResults.length > 0 && (
                <div className="mt-6 space-y-3">
                  <h3 className="text-lg font-semibold">Top {serpResults.length} Results</h3>
                  {serpResults.map((result, index) => (
                    <Card key={result.id}>
                      <CardContent className="pt-4">
                        <div className="flex items-start gap-3">
                          <Badge variant="outline" className="mt-1">
                            #{index + 1}
                          </Badge>
                          <div className="flex-1">
                            <a
                              href={result.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-medium text-primary hover:underline"
                            >
                              {result.title}
                            </a>
                            <p className="text-sm text-muted-foreground mt-1">
                              {result.description}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">{result.url}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="crawl" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Crawl Website</CardTitle>
              <CardDescription>
                Crawl multiple pages from a website
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="crawl-url">Starting URL</Label>
                <Input
                  id="crawl-url"
                  placeholder="https://example.com"
                  value={crawlUrl}
                  onChange={(e) => setCrawlUrl(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="crawl-limit">Page Limit</Label>
                <Input
                  id="crawl-limit"
                  type="number"
                  min="1"
                  max="100"
                  value={crawlLimit}
                  onChange={(e) => setCrawlLimit(parseInt(e.target.value))}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="crawl-entire-domain"
                  checked={crawlEntireDomain}
                  onCheckedChange={(checked) => setCrawlEntireDomain(checked as boolean)}
                />
                <Label htmlFor="crawl-entire-domain">Crawl entire domain</Label>
              </div>
              <Button onClick={handleCrawl} disabled={crawling}>
                {crawling ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Crawling...
                  </>
                ) : (
                  "Start Crawl"
                )}
              </Button>

              {crawledPages.length > 0 && (
                <div className="mt-6 space-y-3">
                  <h3 className="text-lg font-semibold">Crawled {crawledPages.length} Pages</h3>
                  {crawledPages.map((page) => (
                    <Card key={page.id}>
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="font-medium">{page.url}</p>
                            <p className="text-sm text-muted-foreground">
                              {page.word_count} words
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="regenerate" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>AI Content Regeneration</CardTitle>
              <CardDescription>
                Regenerate content optimized for target keywords using AI
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="regen-url">Target URL</Label>
                <Input
                  id="regen-url"
                  placeholder="https://yoursite.com/page"
                  value={regenUrl}
                  onChange={(e) => setRegenUrl(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="regen-query">Target Query</Label>
                <Input
                  id="regen-query"
                  placeholder="best seo tools"
                  value={regenQuery}
                  onChange={(e) => setRegenQuery(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="regen-content">Original Content</Label>
                <Textarea
                  id="regen-content"
                  placeholder="Paste your original content here..."
                  rows={10}
                  value={regenContent}
                  onChange={(e) => setRegenContent(e.target.value)}
                />
              </div>
              <Button onClick={handleRegenerate} disabled={regenerating}>
                {regenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Regenerating...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Regenerate Content
                  </>
                )}
              </Button>

              {regeneratedContent && (
                <div className="mt-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Regenerated Content</h3>
                    <div className="flex gap-2">
                      <Badge variant="outline">
                        {regeneratedContent.word_count_before} → {regeneratedContent.word_count_after} words
                      </Badge>
                      <Badge variant="secondary">
                        +{regeneratedContent.improvements.percentage_increase}%
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(regeneratedContent.regenerated_content)}
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copy
                      </Button>
                      <Button size="sm" variant="outline">
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  </div>
                  <div className="bg-muted p-4 rounded-lg max-h-96 overflow-auto">
                    <pre className="text-sm whitespace-pre-wrap">
                      {regeneratedContent.regenerated_content}
                    </pre>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
