-- ============================================
-- ARGUS — Migration: Project-Scoped Permissions
-- ============================================
-- Run this in your Supabase SQL Editor AFTER the initial schema.

-- 1. PROJECT MEMBERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  project_role TEXT NOT NULL DEFAULT 'member' CHECK (project_role IN ('lead', 'member', 'intern')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_project_members_project ON public.project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user ON public.project_members(user_id);

-- RLS for project_members
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project members viewable by all authenticated"
  ON public.project_members FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Managers and leads can add project members"
  ON public.project_members FOR INSERT
  TO authenticated
  WITH CHECK (
    public.get_user_role() IN ('admin', 'manager')
    OR EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = project_id
        AND pm.user_id = auth.uid()
        AND pm.project_role = 'lead'
    )
  );

CREATE POLICY "Managers and leads can remove project members"
  ON public.project_members FOR DELETE
  TO authenticated
  USING (
    public.get_user_role() IN ('admin', 'manager')
    OR EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = project_members.project_id
        AND pm.user_id = auth.uid()
        AND pm.project_role = 'lead'
    )
  );

-- 2. HELPER: can_manage_project
-- ============================================
CREATE OR REPLACE FUNCTION public.can_manage_project(project_uuid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'manager')
  )
  OR EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_id = project_uuid AND user_id = auth.uid() AND project_role = 'lead'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 3. UPDATE TASKS STATUS CONSTRAINT
-- ============================================
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE public.tasks ADD CONSTRAINT tasks_status_check
  CHECK (status IN ('todo', 'in_progress', 'pending_review', 'revision', 'done', 'blocked'));

-- 4. UPDATE APPROVALS TYPE CONSTRAINT + ADD PROJECT_ID
-- ============================================
ALTER TABLE public.approvals DROP CONSTRAINT IF EXISTS approvals_type_check;
ALTER TABLE public.approvals ADD CONSTRAINT approvals_type_check
  CHECK (type IN ('intern_task', 'stage_gate', 'task_completion'));

-- Add project_id column to approvals (nullable for backward compat)
ALTER TABLE public.approvals ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE;

-- Add feedback column if not exists
ALTER TABLE public.approvals ADD COLUMN IF NOT EXISTS feedback TEXT;

-- Add task_id column for task_completion approvals
ALTER TABLE public.approvals ADD COLUMN IF NOT EXISTS task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE;

-- 5. UPDATED_AT trigger for project_members
-- ============================================
-- (no updated_at column needed, it's insert/delete only)
