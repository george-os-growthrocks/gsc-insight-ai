-- Add automated sync settings table
CREATE TABLE public.sync_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  frequency TEXT NOT NULL DEFAULT 'daily',
  last_sync TIMESTAMP WITH TIME ZONE,
  next_sync TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.sync_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view sync schedules for their projects"
  ON public.sync_schedules FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = sync_schedules.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update sync schedules for their projects"
  ON public.sync_schedules FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = sync_schedules.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- Add competitor tracking table
CREATE TABLE public.competitors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects ON DELETE CASCADE,
  domain TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.competitors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage competitors for their projects"
  ON public.competitors FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = competitors.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- Add content briefs table
CREATE TABLE public.content_briefs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects ON DELETE CASCADE,
  cluster_id UUID REFERENCES public.keyword_clusters ON DELETE SET NULL,
  title TEXT NOT NULL,
  target_keyword TEXT NOT NULL,
  word_count INTEGER,
  outline JSONB,
  seo_recommendations TEXT,
  competitor_analysis TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.content_briefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage content briefs for their projects"
  ON public.content_briefs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = content_briefs.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- Add triggers
CREATE TRIGGER update_sync_schedules_updated_at
  BEFORE UPDATE ON public.sync_schedules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_content_briefs_updated_at
  BEFORE UPDATE ON public.content_briefs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes
CREATE INDEX idx_sync_schedules_project_id ON public.sync_schedules(project_id);
CREATE INDEX idx_competitors_project_id ON public.competitors(project_id);
CREATE INDEX idx_content_briefs_project_id ON public.content_briefs(project_id);
CREATE INDEX idx_content_briefs_cluster_id ON public.content_briefs(cluster_id);