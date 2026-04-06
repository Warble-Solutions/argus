-- ============================================
-- GOOGLE DRIVE INTEGRATION — Migration
-- ============================================
-- Run this in Supabase SQL Editor after the main schema

-- 1. OAuth Token Storage (singleton row for org-wide Drive connection)
CREATE TABLE IF NOT EXISTS public.integration_tokens (
  id TEXT PRIMARY KEY DEFAULT 'google_drive',
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expiry_date BIGINT,
  root_folder_id TEXT,
  connected_by UUID REFERENCES public.profiles(id),
  connected_email TEXT,
  connected_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: Only admin can read/write tokens
ALTER TABLE public.integration_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view integration tokens"
  ON public.integration_tokens FOR SELECT
  TO authenticated
  USING (public.get_user_role() IN ('admin', 'manager'));

CREATE POLICY "Only admins can insert integration tokens"
  ON public.integration_tokens FOR INSERT
  TO authenticated
  WITH CHECK (public.get_user_role() IN ('admin', 'manager'));

CREATE POLICY "Only admins can update integration tokens"
  ON public.integration_tokens FOR UPDATE
  TO authenticated
  USING (public.get_user_role() IN ('admin', 'manager'));

CREATE POLICY "Only admins can delete integration tokens"
  ON public.integration_tokens FOR DELETE
  TO authenticated
  USING (public.get_user_role() IN ('admin', 'manager'));

-- 2. Drive Files Tracking
CREATE TABLE IF NOT EXISTS public.drive_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  module_id UUID REFERENCES public.modules(id) ON DELETE SET NULL,
  drive_file_id TEXT NOT NULL,
  drive_folder_id TEXT,
  name TEXT NOT NULL,
  mime_type TEXT,
  size_bytes BIGINT,
  category TEXT DEFAULT 'general',
  version INT NOT NULL DEFAULT 1,
  web_view_link TEXT,
  thumbnail_link TEXT,
  uploaded_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_drive_files_project ON public.drive_files(project_id);
CREATE INDEX idx_drive_files_module ON public.drive_files(module_id);
CREATE INDEX idx_drive_files_uploaded ON public.drive_files(uploaded_by);

-- RLS for drive_files
ALTER TABLE public.drive_files ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view files
CREATE POLICY "Drive files viewable by all authenticated"
  ON public.drive_files FOR SELECT
  TO authenticated
  USING (true);

-- All authenticated users can upload (insert)
CREATE POLICY "Authenticated users can upload files"
  ON public.drive_files FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Admin and employees can delete (not interns)
CREATE POLICY "Admin and employees can delete files"
  ON public.drive_files FOR DELETE
  TO authenticated
  USING (public.get_user_role() IN ('admin', 'manager', 'employee'));

-- 3. Add drive_folder_id to projects table (if not exists)
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS drive_folder_id TEXT;

-- 4. Updated_at trigger for integration_tokens
CREATE TRIGGER set_updated_at_integration_tokens
  BEFORE UPDATE ON public.integration_tokens
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
