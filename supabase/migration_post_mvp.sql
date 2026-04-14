-- ============================================
-- MIGRATION: Post-MVP Features
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. APPROVALS: Add 'task_completion' to the type CHECK constraint
--    (Our code inserts type='task_completion' for task review approvals)
ALTER TABLE public.approvals DROP CONSTRAINT IF EXISTS approvals_type_check;
ALTER TABLE public.approvals ADD CONSTRAINT approvals_type_check
  CHECK (type IN ('intern_task', 'stage_gate', 'task_completion'));

-- Also add project_id and task_id columns if they don't exist
-- (used for task completion approvals)
ALTER TABLE public.approvals ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE;
ALTER TABLE public.approvals ADD COLUMN IF NOT EXISTS task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE;

-- 2. TASKS: Add 'pending_review' and 'revision' to status CHECK
--    (Our code sets tasks to 'pending_review' when employees mark done,
--     and 'revision' when managers reject)
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE public.tasks ADD CONSTRAINT tasks_status_check
  CHECK (status IN ('todo', 'in_progress', 'done', 'blocked', 'pending_review', 'revision'));

-- 3. PROJECTS: Add 'on_hold', 'completed', 'archived' to status CHECK
--    (Project edit modal supports all four statuses)
ALTER TABLE public.projects DROP CONSTRAINT IF EXISTS projects_status_check;
ALTER TABLE public.projects ADD CONSTRAINT projects_status_check
  CHECK (status IN ('active', 'on_hold', 'completed', 'archived'));

-- 4. DELETE POLICIES: The schema has no DELETE policies!
--    Without these, deleteTask, deleteModule, deleteProject, and file deletion
--    will all fail silently due to RLS.

-- Tasks: managers and task creators can delete
CREATE POLICY "Managers and creators can delete tasks"
  ON public.tasks FOR DELETE
  TO authenticated
  USING (
    public.get_user_role() IN ('admin', 'manager')
    OR created_by = auth.uid()
  );

-- Modules: managers can delete
CREATE POLICY "Managers can delete modules"
  ON public.modules FOR DELETE
  TO authenticated
  USING (public.get_user_role() IN ('admin', 'manager'));

-- Projects: managers can delete
CREATE POLICY "Managers can delete projects"
  ON public.projects FOR DELETE
  TO authenticated
  USING (public.get_user_role() IN ('admin', 'manager'));

-- Drive files: non-interns can delete
CREATE POLICY "Non-interns can delete files"
  ON public.drive_files FOR DELETE
  TO authenticated
  USING (public.get_user_role() IN ('admin', 'manager', 'employee'));

-- 5. PROFILES: Allow admins to update ANY profile (for role management)
--    The existing policy only allows users to update their OWN profile.
CREATE POLICY "Admins can update any profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (public.get_user_role() = 'admin');

-- ============================================
-- VERIFICATION: Run these to confirm everything worked
-- ============================================
-- SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'public.tasks'::regclass AND contype = 'c';
-- SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'public.approvals'::regclass AND contype = 'c';
-- SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'public.projects'::regclass AND contype = 'c';
-- SELECT policyname, cmd FROM pg_policies WHERE tablename = 'tasks';
-- SELECT policyname, cmd FROM pg_policies WHERE tablename = 'profiles';
