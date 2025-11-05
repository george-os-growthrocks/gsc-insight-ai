-- Phase 1: Database Schema & Core Infrastructure

-- Create ai_insights table
CREATE TABLE public.ai_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  insight_type TEXT NOT NULL CHECK (insight_type IN ('ctr_opportunity', 'cannibalization', 'content_gap', 'quick_win', 'internal_linking')),
  query TEXT,
  page TEXT,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  impact_score NUMERIC NOT NULL CHECK (impact_score >= 0 AND impact_score <= 100),
  expected_traffic_gain INTEGER,
  effort_level TEXT NOT NULL CHECK (effort_level IN ('low', 'medium', 'high')),
  priority_score NUMERIC NOT NULL,
  current_position NUMERIC,
  expected_position NUMERIC,
  current_ctr NUMERIC,
  expected_ctr NUMERIC,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on ai_insights
ALTER TABLE public.ai_insights ENABLE ROW LEVEL SECURITY;

-- RLS policies for ai_insights
CREATE POLICY "Users can view insights for their projects"
ON public.ai_insights
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM projects
  WHERE projects.id = ai_insights.project_id
  AND projects.user_id = auth.uid()
));

CREATE POLICY "Users can create insights for their projects"
ON public.ai_insights
FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM projects
  WHERE projects.id = ai_insights.project_id
  AND projects.user_id = auth.uid()
));

CREATE POLICY "Users can delete insights for their projects"
ON public.ai_insights
FOR DELETE
USING (EXISTS (
  SELECT 1 FROM projects
  WHERE projects.id = ai_insights.project_id
  AND projects.user_id = auth.uid()
));

-- Create cannibalization_clusters table
CREATE TABLE public.cannibalization_clusters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  query TEXT NOT NULL,
  cannibalization_score NUMERIC NOT NULL,
  primary_page TEXT NOT NULL,
  supporting_pages JSONB NOT NULL,
  total_clicks INTEGER NOT NULL DEFAULT 0,
  total_impressions INTEGER NOT NULL DEFAULT 0,
  avg_position NUMERIC NOT NULL,
  keyword_difficulty NUMERIC,
  expected_ctr NUMERIC,
  traffic_gain_estimate INTEGER,
  action_plan TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on cannibalization_clusters
ALTER TABLE public.cannibalization_clusters ENABLE ROW LEVEL SECURITY;

-- RLS policies for cannibalization_clusters
CREATE POLICY "Users can manage cannibalization clusters for their projects"
ON public.cannibalization_clusters
FOR ALL
USING (EXISTS (
  SELECT 1 FROM projects
  WHERE projects.id = cannibalization_clusters.project_id
  AND projects.user_id = auth.uid()
));

-- Create page_analysis table
CREATE TABLE public.page_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  page_url TEXT NOT NULL,
  total_clicks INTEGER NOT NULL DEFAULT 0,
  total_impressions INTEGER NOT NULL DEFAULT 0,
  avg_ctr NUMERIC NOT NULL,
  avg_position NUMERIC NOT NULL,
  performance_score NUMERIC NOT NULL CHECK (performance_score >= 0 AND performance_score <= 100),
  content_quality_score NUMERIC CHECK (content_quality_score >= 0 AND content_quality_score <= 100),
  queries JSONB NOT NULL,
  seo_metrics JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on page_analysis
ALTER TABLE public.page_analysis ENABLE ROW LEVEL SECURITY;

-- RLS policies for page_analysis
CREATE POLICY "Users can view page analysis for their projects"
ON public.page_analysis
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM projects
  WHERE projects.id = page_analysis.project_id
  AND projects.user_id = auth.uid()
));

CREATE POLICY "Users can create page analysis for their projects"
ON public.page_analysis
FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM projects
  WHERE projects.id = page_analysis.project_id
  AND projects.user_id = auth.uid()
));

CREATE POLICY "Users can update page analysis for their projects"
ON public.page_analysis
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM projects
  WHERE projects.id = page_analysis.project_id
  AND projects.user_id = auth.uid()
));

-- Create trigger for page_analysis updated_at
CREATE TRIGGER update_page_analysis_updated_at
BEFORE UPDATE ON public.page_analysis
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create internal_link_opportunities table
CREATE TABLE public.internal_link_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  from_page TEXT NOT NULL,
  to_page TEXT NOT NULL,
  shared_queries JSONB NOT NULL,
  anchor_text_suggestions JSONB NOT NULL,
  opportunity_score NUMERIC NOT NULL,
  from_page_clicks INTEGER NOT NULL,
  to_page_position NUMERIC NOT NULL,
  topical_overlap NUMERIC NOT NULL CHECK (topical_overlap >= 0 AND topical_overlap <= 1),
  expected_impact TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on internal_link_opportunities
ALTER TABLE public.internal_link_opportunities ENABLE ROW LEVEL SECURITY;

-- RLS policies for internal_link_opportunities
CREATE POLICY "Users can manage link opportunities for their projects"
ON public.internal_link_opportunities
FOR ALL
USING (EXISTS (
  SELECT 1 FROM projects
  WHERE projects.id = internal_link_opportunities.project_id
  AND projects.user_id = auth.uid()
));

-- Enhance keyword_clusters table
ALTER TABLE public.keyword_clusters
ADD COLUMN IF NOT EXISTS intent TEXT CHECK (intent IN ('transactional', 'commercial', 'navigational', 'informational')),
ADD COLUMN IF NOT EXISTS keyword_difficulty NUMERIC,
ADD COLUMN IF NOT EXISTS expected_ctr NUMERIC,
ADD COLUMN IF NOT EXISTS priority_score NUMERIC,
ADD COLUMN IF NOT EXISTS similarity_threshold NUMERIC;