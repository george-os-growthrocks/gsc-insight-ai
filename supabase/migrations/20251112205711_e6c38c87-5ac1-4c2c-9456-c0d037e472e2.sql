-- Create ga4_tokens table for GA4 OAuth credentials
CREATE TABLE public.ga4_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  project_id UUID NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  property_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create referring_domains table to track linking domains
CREATE TABLE public.referring_domains (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL,
  domain TEXT NOT NULL,
  first_seen TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_seen TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  total_sessions INTEGER NOT NULL DEFAULT 0,
  total_engaged_sessions INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create backlink_traffic table for daily metrics
CREATE TABLE public.backlink_traffic (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL,
  referring_domain TEXT NOT NULL,
  landing_page TEXT NOT NULL,
  date DATE NOT NULL,
  sessions INTEGER NOT NULL DEFAULT 0,
  engaged_sessions INTEGER NOT NULL DEFAULT 0,
  avg_session_duration NUMERIC,
  bounce_rate NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create backlink_keyword_correlation table
CREATE TABLE public.backlink_keyword_correlation (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL,
  landing_page TEXT NOT NULL,
  referring_domain TEXT NOT NULL,
  query TEXT NOT NULL,
  clicks INTEGER NOT NULL DEFAULT 0,
  impressions INTEGER NOT NULL DEFAULT 0,
  ctr NUMERIC NOT NULL DEFAULT 0,
  position NUMERIC NOT NULL DEFAULT 0,
  analysis_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create backlink_value_scores table
CREATE TABLE public.backlink_value_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL,
  referring_domain TEXT NOT NULL,
  landing_page TEXT NOT NULL,
  referral_score NUMERIC NOT NULL DEFAULT 0,
  organic_impact_score NUMERIC NOT NULL DEFAULT 0,
  keyword_relevance_score NUMERIC NOT NULL DEFAULT 0,
  overall_value_score NUMERIC NOT NULL DEFAULT 0,
  top_keywords JSONB DEFAULT '[]'::jsonb,
  traffic_contribution INTEGER NOT NULL DEFAULT 0,
  position_improvement NUMERIC,
  ai_insights TEXT,
  computed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.ga4_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referring_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backlink_traffic ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backlink_keyword_correlation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backlink_value_scores ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ga4_tokens
CREATE POLICY "Users can view their own GA4 tokens"
ON public.ga4_tokens FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own GA4 tokens"
ON public.ga4_tokens FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own GA4 tokens"
ON public.ga4_tokens FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own GA4 tokens"
ON public.ga4_tokens FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies for referring_domains
CREATE POLICY "Users can view referring domains for their projects"
ON public.referring_domains FOR SELECT
USING (EXISTS (
  SELECT 1 FROM projects
  WHERE projects.id = referring_domains.project_id
  AND projects.user_id = auth.uid()
));

CREATE POLICY "Users can create referring domains for their projects"
ON public.referring_domains FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM projects
  WHERE projects.id = referring_domains.project_id
  AND projects.user_id = auth.uid()
));

CREATE POLICY "Users can update referring domains for their projects"
ON public.referring_domains FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM projects
  WHERE projects.id = referring_domains.project_id
  AND projects.user_id = auth.uid()
));

CREATE POLICY "Users can delete referring domains for their projects"
ON public.referring_domains FOR DELETE
USING (EXISTS (
  SELECT 1 FROM projects
  WHERE projects.id = referring_domains.project_id
  AND projects.user_id = auth.uid()
));

-- RLS Policies for backlink_traffic
CREATE POLICY "Users can view backlink traffic for their projects"
ON public.backlink_traffic FOR SELECT
USING (EXISTS (
  SELECT 1 FROM projects
  WHERE projects.id = backlink_traffic.project_id
  AND projects.user_id = auth.uid()
));

CREATE POLICY "Users can create backlink traffic for their projects"
ON public.backlink_traffic FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM projects
  WHERE projects.id = backlink_traffic.project_id
  AND projects.user_id = auth.uid()
));

-- RLS Policies for backlink_keyword_correlation
CREATE POLICY "Users can view backlink keyword correlation for their projects"
ON public.backlink_keyword_correlation FOR SELECT
USING (EXISTS (
  SELECT 1 FROM projects
  WHERE projects.id = backlink_keyword_correlation.project_id
  AND projects.user_id = auth.uid()
));

CREATE POLICY "Users can create backlink keyword correlation for their projects"
ON public.backlink_keyword_correlation FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM projects
  WHERE projects.id = backlink_keyword_correlation.project_id
  AND projects.user_id = auth.uid()
));

-- RLS Policies for backlink_value_scores
CREATE POLICY "Users can view backlink value scores for their projects"
ON public.backlink_value_scores FOR SELECT
USING (EXISTS (
  SELECT 1 FROM projects
  WHERE projects.id = backlink_value_scores.project_id
  AND projects.user_id = auth.uid()
));

CREATE POLICY "Users can create backlink value scores for their projects"
ON public.backlink_value_scores FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM projects
  WHERE projects.id = backlink_value_scores.project_id
  AND projects.user_id = auth.uid()
));

CREATE POLICY "Users can delete backlink value scores for their projects"
ON public.backlink_value_scores FOR DELETE
USING (EXISTS (
  SELECT 1 FROM projects
  WHERE projects.id = backlink_value_scores.project_id
  AND projects.user_id = auth.uid()
));

-- Create trigger for ga4_tokens updated_at
CREATE TRIGGER update_ga4_tokens_updated_at
BEFORE UPDATE ON public.ga4_tokens
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_ga4_tokens_user_id ON public.ga4_tokens(user_id);
CREATE INDEX idx_ga4_tokens_project_id ON public.ga4_tokens(project_id);

CREATE INDEX idx_referring_domains_project_id ON public.referring_domains(project_id);
CREATE INDEX idx_referring_domains_domain ON public.referring_domains(domain);
CREATE INDEX idx_referring_domains_status ON public.referring_domains(status);

CREATE INDEX idx_backlink_traffic_project_id ON public.backlink_traffic(project_id);
CREATE INDEX idx_backlink_traffic_referring_domain ON public.backlink_traffic(referring_domain);
CREATE INDEX idx_backlink_traffic_landing_page ON public.backlink_traffic(landing_page);
CREATE INDEX idx_backlink_traffic_date ON public.backlink_traffic(date);

CREATE INDEX idx_backlink_keyword_correlation_project_id ON public.backlink_keyword_correlation(project_id);
CREATE INDEX idx_backlink_keyword_correlation_landing_page ON public.backlink_keyword_correlation(landing_page);
CREATE INDEX idx_backlink_keyword_correlation_referring_domain ON public.backlink_keyword_correlation(referring_domain);
CREATE INDEX idx_backlink_keyword_correlation_query ON public.backlink_keyword_correlation(query);

CREATE INDEX idx_backlink_value_scores_project_id ON public.backlink_value_scores(project_id);
CREATE INDEX idx_backlink_value_scores_referring_domain ON public.backlink_value_scores(referring_domain);
CREATE INDEX idx_backlink_value_scores_overall_value_score ON public.backlink_value_scores(overall_value_score DESC);