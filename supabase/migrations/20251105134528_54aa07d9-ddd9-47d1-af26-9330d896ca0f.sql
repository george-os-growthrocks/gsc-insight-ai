-- Create projects table
CREATE TABLE public.projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  domain TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own projects"
  ON public.projects FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own projects"
  ON public.projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own projects"
  ON public.projects FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own projects"
  ON public.projects FOR DELETE
  USING (auth.uid() = user_id);

-- Create gsc_queries table
CREATE TABLE public.gsc_queries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects ON DELETE CASCADE,
  date DATE NOT NULL,
  query TEXT NOT NULL,
  page TEXT NOT NULL,
  clicks INTEGER NOT NULL DEFAULT 0,
  impressions INTEGER NOT NULL DEFAULT 0,
  ctr NUMERIC(5,4) NOT NULL DEFAULT 0,
  position NUMERIC(5,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.gsc_queries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view GSC data for their projects"
  ON public.gsc_queries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = gsc_queries.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create GSC data for their projects"
  ON public.gsc_queries FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = gsc_queries.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete GSC data for their projects"
  ON public.gsc_queries FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = gsc_queries.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- Create seo_tasks table
CREATE TABLE public.seo_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects ON DELETE CASCADE,
  type TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 50,
  page TEXT NOT NULL,
  query TEXT,
  reason TEXT NOT NULL,
  recommendation TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  comments TEXT,
  impressions INTEGER,
  clicks INTEGER,
  ctr NUMERIC(5,4),
  position NUMERIC(5,2),
  expected_ctr NUMERIC(5,4),
  potential_click_gain NUMERIC(8,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.seo_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tasks for their projects"
  ON public.seo_tasks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = seo_tasks.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create tasks for their projects"
  ON public.seo_tasks FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = seo_tasks.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update tasks for their projects"
  ON public.seo_tasks FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = seo_tasks.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete tasks for their projects"
  ON public.seo_tasks FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = seo_tasks.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- Create pagespeed_metrics table
CREATE TABLE public.pagespeed_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects ON DELETE CASCADE,
  page TEXT NOT NULL,
  performance_score INTEGER,
  fcp NUMERIC(8,2),
  lcp NUMERIC(8,2),
  cls NUMERIC(5,3),
  tbt NUMERIC(8,2),
  si NUMERIC(8,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.pagespeed_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view pagespeed metrics for their projects"
  ON public.pagespeed_metrics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = pagespeed_metrics.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create pagespeed metrics for their projects"
  ON public.pagespeed_metrics FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = pagespeed_metrics.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- Create update trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add trigger to projects table
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add trigger to seo_tasks table
CREATE TRIGGER update_seo_tasks_updated_at
  BEFORE UPDATE ON public.seo_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_gsc_queries_project_id ON public.gsc_queries(project_id);
CREATE INDEX idx_gsc_queries_page ON public.gsc_queries(page);
CREATE INDEX idx_gsc_queries_query ON public.gsc_queries(query);
CREATE INDEX idx_seo_tasks_project_id ON public.seo_tasks(project_id);
CREATE INDEX idx_pagespeed_metrics_project_id ON public.pagespeed_metrics(project_id);