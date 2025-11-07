-- ============================================
-- DATABASE SCHEMA EXPORT
-- ============================================
-- Generated: 2025-11-07
-- Project: SEO Intelligence Platform
-- ============================================

-- ============================================
-- ENUMS
-- ============================================

-- No custom enums defined yet

-- ============================================
-- TABLES
-- ============================================

-- Projects table
CREATE TABLE public.projects (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    name text NOT NULL,
    domain text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Google tokens table
CREATE TABLE public.google_tokens (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    project_id uuid NOT NULL,
    access_token text NOT NULL,
    refresh_token text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    property_url text NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- GSC queries table
CREATE TABLE public.gsc_queries (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid NOT NULL,
    query text NOT NULL,
    page text NOT NULL,
    date date NOT NULL,
    clicks integer NOT NULL DEFAULT 0,
    impressions integer NOT NULL DEFAULT 0,
    ctr numeric NOT NULL DEFAULT 0,
    position numeric NOT NULL DEFAULT 0,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Page analysis table
CREATE TABLE public.page_analysis (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid NOT NULL,
    page_url text NOT NULL,
    total_clicks integer NOT NULL DEFAULT 0,
    total_impressions integer NOT NULL DEFAULT 0,
    avg_ctr numeric NOT NULL,
    avg_position numeric NOT NULL,
    performance_score numeric NOT NULL,
    content_quality_score numeric,
    queries jsonb NOT NULL,
    seo_metrics jsonb,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- AI insights table
CREATE TABLE public.ai_insights (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid NOT NULL,
    insight_type text NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    page text,
    query text,
    current_position numeric,
    expected_position numeric,
    current_ctr numeric,
    expected_ctr numeric,
    expected_traffic_gain integer,
    impact_score numeric NOT NULL,
    priority_score numeric NOT NULL,
    effort_level text NOT NULL,
    metadata jsonb,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Keyword clusters table
CREATE TABLE public.keyword_clusters (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid NOT NULL,
    cluster_name text NOT NULL,
    keywords text[] NOT NULL,
    total_clicks integer,
    total_impressions integer,
    avg_position numeric,
    intent text,
    topic_score numeric,
    similarity_threshold numeric,
    priority_score numeric,
    expected_ctr numeric,
    keyword_difficulty numeric,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Cannibalization clusters table
CREATE TABLE public.cannibalization_clusters (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid NOT NULL,
    query text NOT NULL,
    primary_page text NOT NULL,
    supporting_pages jsonb NOT NULL,
    total_clicks integer NOT NULL DEFAULT 0,
    total_impressions integer NOT NULL DEFAULT 0,
    avg_position numeric NOT NULL,
    cannibalization_score numeric NOT NULL,
    action_plan text,
    keyword_difficulty numeric,
    expected_ctr numeric,
    traffic_gain_estimate integer,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- SEO tasks table
CREATE TABLE public.seo_tasks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid NOT NULL,
    type text NOT NULL,
    page text NOT NULL,
    query text,
    reason text NOT NULL,
    recommendation text NOT NULL,
    status text NOT NULL DEFAULT 'pending',
    priority integer NOT NULL DEFAULT 50,
    clicks integer,
    impressions integer,
    ctr numeric,
    position numeric,
    expected_ctr numeric,
    potential_click_gain numeric,
    comments text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- PageSpeed metrics table
CREATE TABLE public.pagespeed_metrics (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid NOT NULL,
    page text NOT NULL,
    performance_score integer,
    fcp numeric,
    lcp numeric,
    cls numeric,
    tbt numeric,
    si numeric,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Competitors table
CREATE TABLE public.competitors (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid NOT NULL,
    name text NOT NULL,
    domain text NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Content briefs table
CREATE TABLE public.content_briefs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid NOT NULL,
    cluster_id uuid,
    title text NOT NULL,
    target_keyword text NOT NULL,
    word_count integer,
    outline jsonb,
    seo_recommendations text,
    competitor_analysis text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Sync schedules table
CREATE TABLE public.sync_schedules (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid NOT NULL,
    enabled boolean NOT NULL DEFAULT false,
    frequency text NOT NULL DEFAULT 'daily',
    last_sync timestamp with time zone,
    next_sync timestamp with time zone,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Internal link opportunities table
CREATE TABLE public.internal_link_opportunities (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid NOT NULL,
    from_page text NOT NULL,
    to_page text NOT NULL,
    from_page_clicks integer NOT NULL DEFAULT 0,
    to_page_position numeric NOT NULL,
    shared_queries jsonb NOT NULL,
    topical_overlap numeric NOT NULL,
    opportunity_score numeric NOT NULL,
    anchor_text_suggestions jsonb NOT NULL,
    expected_impact text,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Scraped content table
CREATE TABLE public.scraped_content (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid NOT NULL,
    url text NOT NULL,
    query text,
    content_html text,
    content_markdown text,
    word_count integer,
    metadata jsonb DEFAULT '{}'::jsonb,
    scraped_at timestamp with time zone NOT NULL DEFAULT now(),
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- SERP results table
CREATE TABLE public.serp_results (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid NOT NULL,
    query text NOT NULL,
    position integer NOT NULL,
    url text NOT NULL,
    title text,
    description text,
    content_markdown text,
    metadata jsonb DEFAULT '{}'::jsonb,
    fetched_at timestamp with time zone NOT NULL DEFAULT now(),
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Content regenerations table
CREATE TABLE public.content_regenerations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid NOT NULL,
    original_url text NOT NULL,
    target_query text NOT NULL,
    original_content text NOT NULL,
    regenerated_content text NOT NULL,
    regeneration_prompt text NOT NULL,
    word_count_before integer,
    word_count_after integer,
    improvements jsonb DEFAULT '{}'::jsonb,
    generated_at timestamp with time zone NOT NULL DEFAULT now(),
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ============================================
-- FUNCTIONS
-- ============================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================
-- TRIGGERS
-- ============================================

-- Add triggers for updated_at columns
CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON public.projects
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_google_tokens_updated_at
    BEFORE UPDATE ON public.google_tokens
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_page_analysis_updated_at
    BEFORE UPDATE ON public.page_analysis
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_seo_tasks_updated_at
    BEFORE UPDATE ON public.seo_tasks
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_content_briefs_updated_at
    BEFORE UPDATE ON public.content_briefs
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sync_schedules_updated_at
    BEFORE UPDATE ON public.sync_schedules
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.google_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gsc_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.keyword_clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cannibalization_clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pagespeed_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_briefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.internal_link_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scraped_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.serp_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_regenerations ENABLE ROW LEVEL SECURITY;

-- Projects policies
CREATE POLICY "Users can view their own projects" ON public.projects FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own projects" ON public.projects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own projects" ON public.projects FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own projects" ON public.projects FOR DELETE USING (auth.uid() = user_id);

-- Google tokens policies
CREATE POLICY "Users can view their own tokens" ON public.google_tokens FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own tokens" ON public.google_tokens FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own tokens" ON public.google_tokens FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own tokens" ON public.google_tokens FOR DELETE USING (auth.uid() = user_id);

-- GSC queries policies
CREATE POLICY "Users can view GSC data for their projects" ON public.gsc_queries FOR SELECT 
    USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = gsc_queries.project_id AND projects.user_id = auth.uid()));
CREATE POLICY "Users can create GSC data for their projects" ON public.gsc_queries FOR INSERT 
    WITH CHECK (EXISTS (SELECT 1 FROM projects WHERE projects.id = gsc_queries.project_id AND projects.user_id = auth.uid()));
CREATE POLICY "Users can delete GSC data for their projects" ON public.gsc_queries FOR DELETE 
    USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = gsc_queries.project_id AND projects.user_id = auth.uid()));

-- Page analysis policies
CREATE POLICY "Users can view page analysis for their projects" ON public.page_analysis FOR SELECT 
    USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = page_analysis.project_id AND projects.user_id = auth.uid()));
CREATE POLICY "Users can create page analysis for their projects" ON public.page_analysis FOR INSERT 
    WITH CHECK (EXISTS (SELECT 1 FROM projects WHERE projects.id = page_analysis.project_id AND projects.user_id = auth.uid()));
CREATE POLICY "Users can update page analysis for their projects" ON public.page_analysis FOR UPDATE 
    USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = page_analysis.project_id AND projects.user_id = auth.uid()));

-- AI insights policies
CREATE POLICY "Users can view insights for their projects" ON public.ai_insights FOR SELECT 
    USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = ai_insights.project_id AND projects.user_id = auth.uid()));
CREATE POLICY "Users can create insights for their projects" ON public.ai_insights FOR INSERT 
    WITH CHECK (EXISTS (SELECT 1 FROM projects WHERE projects.id = ai_insights.project_id AND projects.user_id = auth.uid()));
CREATE POLICY "Users can delete insights for their projects" ON public.ai_insights FOR DELETE 
    USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = ai_insights.project_id AND projects.user_id = auth.uid()));

-- Keyword clusters policies
CREATE POLICY "Users can view clusters for their projects" ON public.keyword_clusters FOR SELECT 
    USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = keyword_clusters.project_id AND projects.user_id = auth.uid()));
CREATE POLICY "Users can create clusters for their projects" ON public.keyword_clusters FOR INSERT 
    WITH CHECK (EXISTS (SELECT 1 FROM projects WHERE projects.id = keyword_clusters.project_id AND projects.user_id = auth.uid()));
CREATE POLICY "Users can delete clusters for their projects" ON public.keyword_clusters FOR DELETE 
    USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = keyword_clusters.project_id AND projects.user_id = auth.uid()));

-- Cannibalization clusters policies
CREATE POLICY "Users can manage cannibalization clusters for their projects" ON public.cannibalization_clusters FOR ALL 
    USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = cannibalization_clusters.project_id AND projects.user_id = auth.uid()));

-- SEO tasks policies
CREATE POLICY "Users can view tasks for their projects" ON public.seo_tasks FOR SELECT 
    USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = seo_tasks.project_id AND projects.user_id = auth.uid()));
CREATE POLICY "Users can create tasks for their projects" ON public.seo_tasks FOR INSERT 
    WITH CHECK (EXISTS (SELECT 1 FROM projects WHERE projects.id = seo_tasks.project_id AND projects.user_id = auth.uid()));
CREATE POLICY "Users can update tasks for their projects" ON public.seo_tasks FOR UPDATE 
    USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = seo_tasks.project_id AND projects.user_id = auth.uid()));
CREATE POLICY "Users can delete tasks for their projects" ON public.seo_tasks FOR DELETE 
    USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = seo_tasks.project_id AND projects.user_id = auth.uid()));

-- PageSpeed metrics policies
CREATE POLICY "Users can view pagespeed metrics for their projects" ON public.pagespeed_metrics FOR SELECT 
    USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = pagespeed_metrics.project_id AND projects.user_id = auth.uid()));
CREATE POLICY "Users can create pagespeed metrics for their projects" ON public.pagespeed_metrics FOR INSERT 
    WITH CHECK (EXISTS (SELECT 1 FROM projects WHERE projects.id = pagespeed_metrics.project_id AND projects.user_id = auth.uid()));

-- Competitors policies
CREATE POLICY "Users can manage competitors for their projects" ON public.competitors FOR ALL 
    USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = competitors.project_id AND projects.user_id = auth.uid()));

-- Content briefs policies
CREATE POLICY "Users can manage content briefs for their projects" ON public.content_briefs FOR ALL 
    USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = content_briefs.project_id AND projects.user_id = auth.uid()));

-- Sync schedules policies
CREATE POLICY "Users can view sync schedules for their projects" ON public.sync_schedules FOR SELECT 
    USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = sync_schedules.project_id AND projects.user_id = auth.uid()));
CREATE POLICY "Users can update sync schedules for their projects" ON public.sync_schedules FOR ALL 
    USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = sync_schedules.project_id AND projects.user_id = auth.uid()));

-- Internal link opportunities policies
CREATE POLICY "Users can manage link opportunities for their projects" ON public.internal_link_opportunities FOR ALL 
    USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = internal_link_opportunities.project_id AND projects.user_id = auth.uid()));

-- Scraped content policies
CREATE POLICY "Users can manage scraped content for their projects" ON public.scraped_content FOR ALL 
    USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = scraped_content.project_id AND projects.user_id = auth.uid()));

-- SERP results policies
CREATE POLICY "Users can manage SERP results for their projects" ON public.serp_results FOR ALL 
    USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = serp_results.project_id AND projects.user_id = auth.uid()));

-- Content regenerations policies
CREATE POLICY "Users can manage content regenerations for their projects" ON public.content_regenerations FOR ALL 
    USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = content_regenerations.project_id AND projects.user_id = auth.uid()));

-- ============================================
-- INDEXES (Recommended for Performance)
-- ============================================

-- Projects indexes
CREATE INDEX idx_projects_user_id ON public.projects(user_id);

-- Google tokens indexes
CREATE INDEX idx_google_tokens_user_id ON public.google_tokens(user_id);
CREATE INDEX idx_google_tokens_project_id ON public.google_tokens(project_id);

-- GSC queries indexes
CREATE INDEX idx_gsc_queries_project_id ON public.gsc_queries(project_id);
CREATE INDEX idx_gsc_queries_date ON public.gsc_queries(date);
CREATE INDEX idx_gsc_queries_query ON public.gsc_queries(query);
CREATE INDEX idx_gsc_queries_page ON public.gsc_queries(page);

-- Page analysis indexes
CREATE INDEX idx_page_analysis_project_id ON public.page_analysis(project_id);
CREATE INDEX idx_page_analysis_page_url ON public.page_analysis(page_url);

-- AI insights indexes
CREATE INDEX idx_ai_insights_project_id ON public.ai_insights(project_id);
CREATE INDEX idx_ai_insights_insight_type ON public.ai_insights(insight_type);

-- Keyword clusters indexes
CREATE INDEX idx_keyword_clusters_project_id ON public.keyword_clusters(project_id);

-- Cannibalization clusters indexes
CREATE INDEX idx_cannibalization_clusters_project_id ON public.cannibalization_clusters(project_id);
CREATE INDEX idx_cannibalization_clusters_query ON public.cannibalization_clusters(query);

-- SEO tasks indexes
CREATE INDEX idx_seo_tasks_project_id ON public.seo_tasks(project_id);
CREATE INDEX idx_seo_tasks_status ON public.seo_tasks(status);
CREATE INDEX idx_seo_tasks_type ON public.seo_tasks(type);

-- PageSpeed metrics indexes
CREATE INDEX idx_pagespeed_metrics_project_id ON public.pagespeed_metrics(project_id);
CREATE INDEX idx_pagespeed_metrics_page ON public.pagespeed_metrics(page);

-- Competitors indexes
CREATE INDEX idx_competitors_project_id ON public.competitors(project_id);

-- Content briefs indexes
CREATE INDEX idx_content_briefs_project_id ON public.content_briefs(project_id);
CREATE INDEX idx_content_briefs_cluster_id ON public.content_briefs(cluster_id);

-- Sync schedules indexes
CREATE INDEX idx_sync_schedules_project_id ON public.sync_schedules(project_id);

-- Internal link opportunities indexes
CREATE INDEX idx_internal_link_opportunities_project_id ON public.internal_link_opportunities(project_id);

-- Scraped content indexes
CREATE INDEX idx_scraped_content_project_id ON public.scraped_content(project_id);
CREATE INDEX idx_scraped_content_url ON public.scraped_content(url);
CREATE INDEX idx_scraped_content_query ON public.scraped_content(query);

-- SERP results indexes
CREATE INDEX idx_serp_results_project_id ON public.serp_results(project_id);
CREATE INDEX idx_serp_results_query ON public.serp_results(query);
CREATE INDEX idx_serp_results_position ON public.serp_results(position);

-- Content regenerations indexes
CREATE INDEX idx_content_regenerations_project_id ON public.content_regenerations(project_id);
CREATE INDEX idx_content_regenerations_original_url ON public.content_regenerations(original_url);

-- ============================================
-- END OF SCHEMA EXPORT
-- ============================================
