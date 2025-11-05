-- Create scraped_content table
CREATE TABLE public.scraped_content (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL,
  url TEXT NOT NULL,
  query TEXT,
  content_markdown TEXT,
  content_html TEXT,
  word_count INTEGER,
  metadata JSONB DEFAULT '{}'::jsonb,
  scraped_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create serp_results table
CREATE TABLE public.serp_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL,
  query TEXT NOT NULL,
  position INTEGER NOT NULL,
  url TEXT NOT NULL,
  title TEXT,
  description TEXT,
  content_markdown TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  fetched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create content_regenerations table
CREATE TABLE public.content_regenerations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL,
  original_url TEXT NOT NULL,
  target_query TEXT NOT NULL,
  original_content TEXT NOT NULL,
  regenerated_content TEXT NOT NULL,
  regeneration_prompt TEXT NOT NULL,
  word_count_before INTEGER,
  word_count_after INTEGER,
  improvements JSONB DEFAULT '{}'::jsonb,
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.scraped_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.serp_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_regenerations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for scraped_content
CREATE POLICY "Users can manage scraped content for their projects"
ON public.scraped_content
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = scraped_content.project_id
    AND projects.user_id = auth.uid()
  )
);

-- RLS Policies for serp_results
CREATE POLICY "Users can manage SERP results for their projects"
ON public.serp_results
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = serp_results.project_id
    AND projects.user_id = auth.uid()
  )
);

-- RLS Policies for content_regenerations
CREATE POLICY "Users can manage content regenerations for their projects"
ON public.content_regenerations
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = content_regenerations.project_id
    AND projects.user_id = auth.uid()
  )
);

-- Create indexes for performance
CREATE INDEX idx_scraped_content_project_id ON public.scraped_content(project_id);
CREATE INDEX idx_scraped_content_url ON public.scraped_content(url);
CREATE INDEX idx_serp_results_project_id ON public.serp_results(project_id);
CREATE INDEX idx_serp_results_query ON public.serp_results(query);
CREATE INDEX idx_content_regenerations_project_id ON public.content_regenerations(project_id);