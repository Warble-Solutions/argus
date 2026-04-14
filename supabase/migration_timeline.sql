-- ============================================
-- MIGRATION: Timeline View Feature
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. MODULE VERSIONS TABLE
CREATE TABLE IF NOT EXISTS public.module_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  version_number INT NOT NULL,
  type TEXT NOT NULL DEFAULT 'story' CHECK (type IN ('story', 'scorm')),
  delivered_at TIMESTAMPTZ,
  feedback_received_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (module_id, version_number, type)
);

CREATE INDEX IF NOT EXISTS idx_module_versions_module ON public.module_versions(module_id);

-- RLS
ALTER TABLE public.module_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Module versions viewable by all authenticated"
  ON public.module_versions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert module versions"
  ON public.module_versions FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Managers can update module versions"
  ON public.module_versions FOR UPDATE
  TO authenticated
  USING (public.get_user_role() IN ('admin', 'manager', 'employee'));

CREATE POLICY "Managers can delete module versions"
  ON public.module_versions FOR DELETE
  TO authenticated
  USING (public.get_user_role() IN ('admin', 'manager'));

-- 2. ADD COLUMNS TO PROJECTS
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS is_vernacular BOOLEAN NOT NULL DEFAULT false;

-- 3. ADD COLUMNS TO MODULES
ALTER TABLE public.modules ADD COLUMN IF NOT EXISTS language TEXT;
ALTER TABLE public.modules ADD COLUMN IF NOT EXISTS remark TEXT;
ALTER TABLE public.modules ADD COLUMN IF NOT EXISTS scorm_status TEXT NOT NULL DEFAULT 'none';
ALTER TABLE public.modules ADD COLUMN IF NOT EXISTS scorm_approved_at TIMESTAMPTZ;
