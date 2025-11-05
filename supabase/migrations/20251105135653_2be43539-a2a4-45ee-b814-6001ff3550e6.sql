-- Add OAuth tokens table for Google Search Console
CREATE TABLE public.google_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  project_id UUID NOT NULL REFERENCES public.projects ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  property_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.google_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own tokens"
  ON public.google_tokens FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own tokens"
  ON public.google_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tokens"
  ON public.google_tokens FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tokens"
  ON public.google_tokens FOR DELETE
  USING (auth.uid() = user_id);

-- Add keyword clusters table
CREATE TABLE public.keyword_clusters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects ON DELETE CASCADE,
  cluster_name TEXT NOT NULL,
  keywords TEXT[] NOT NULL,
  topic_score NUMERIC(5,2),
  avg_position NUMERIC(5,2),
  total_impressions INTEGER,
  total_clicks INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.keyword_clusters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view clusters for their projects"
  ON public.keyword_clusters FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = keyword_clusters.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create clusters for their projects"
  ON public.keyword_clusters FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = keyword_clusters.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete clusters for their projects"
  ON public.keyword_clusters FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = keyword_clusters.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- Add trigger to google_tokens
CREATE TRIGGER update_google_tokens_updated_at
  BEFORE UPDATE ON public.google_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes
CREATE INDEX idx_google_tokens_project_id ON public.google_tokens(project_id);
CREATE INDEX idx_google_tokens_user_id ON public.google_tokens(user_id);
CREATE INDEX idx_keyword_clusters_project_id ON public.keyword_clusters(project_id);