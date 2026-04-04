-- ============================================
-- ARGUS LMS COORDINATOR — Database Schema
-- ============================================
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- This creates all tables, indexes, RLS policies, and seed data.

-- ============================================
-- 1. PROFILES (extends auth.users)
-- ============================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'employee' CHECK (role IN ('admin', 'manager', 'employee', 'intern')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'employee')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 2. PROJECTS
-- ============================================
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  client_name TEXT NOT NULL,
  client_email TEXT,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'on_hold', 'completed')),
  deadline TIMESTAMPTZ NOT NULL,
  modules_count INT NOT NULL DEFAULT 0,
  completed_modules INT NOT NULL DEFAULT 0,
  progress INT NOT NULL DEFAULT 0,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- 3. MODULES
-- ============================================
CREATE TABLE public.modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  module_number INT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'storyboard', 'video_production', 'articulate_build', 'review', 'revision', 'approved', 'delivered')),
  assigned_to UUID REFERENCES public.profiles(id),
  deadline TIMESTAMPTZ NOT NULL,
  current_version INT NOT NULL DEFAULT 1,
  revision_count INT NOT NULL DEFAULT 0,
  stage_gate_pending BOOLEAN NOT NULL DEFAULT false,
  drive_folder_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, module_number)
);

-- ============================================
-- 4. TASKS
-- ============================================
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  task_type TEXT NOT NULL DEFAULT 'general' CHECK (task_type IN ('general', 'storyboard', 'video', 'articulate', 'review', 'revision')),
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done', 'blocked')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  assigned_to UUID REFERENCES public.profiles(id),
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  due_date TIMESTAMPTZ,
  time_spent_minutes INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- 5. APPROVALS
-- ============================================
CREATE TABLE public.approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('intern_task', 'stage_gate')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  -- For intern_task approvals
  requested_by UUID NOT NULL REFERENCES public.profiles(id),
  reviewed_by UUID REFERENCES public.profiles(id),
  title TEXT NOT NULL,
  description TEXT,
  feedback TEXT,
  metadata JSONB DEFAULT '{}',
  -- For stage_gate approvals
  module_id UUID REFERENCES public.modules(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- 6. ACTIVITY LOG
-- ============================================
CREATE TABLE public.activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  module_id UUID REFERENCES public.modules(id) ON DELETE CASCADE,
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- 7. TIME ENTRIES
-- ============================================
CREATE TABLE public.time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  duration_minutes INT NOT NULL,
  notes TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- 8. NOTIFICATIONS
-- ============================================
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('assignment', 'deadline', 'approval', 'stage_gate', 'general')),
  is_read BOOLEAN NOT NULL DEFAULT false,
  link TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_modules_project ON public.modules(project_id);
CREATE INDEX idx_tasks_module ON public.tasks(module_id);
CREATE INDEX idx_tasks_assigned ON public.tasks(assigned_to);
CREATE INDEX idx_approvals_status ON public.approvals(status);
CREATE INDEX idx_approvals_requested ON public.approvals(requested_by);
CREATE INDEX idx_activity_project ON public.activity_log(project_id);
CREATE INDEX idx_activity_module ON public.activity_log(module_id);
CREATE INDEX idx_notifications_user ON public.notifications(user_id, is_read);
CREATE INDEX idx_time_entries_module ON public.time_entries(module_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Helper: get current user's role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- PROFILES: everyone can read all profiles, users can update their own
CREATE POLICY "Profiles are viewable by all authenticated users"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

-- PROJECTS: all authenticated can read, managers+ can insert/update
CREATE POLICY "Projects viewable by all authenticated"
  ON public.projects FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Managers can create projects"
  ON public.projects FOR INSERT
  TO authenticated
  WITH CHECK (public.get_user_role() IN ('admin', 'manager'));

CREATE POLICY "Managers can update projects"
  ON public.projects FOR UPDATE
  TO authenticated
  USING (public.get_user_role() IN ('admin', 'manager'));

-- MODULES: all authenticated can read, managers+ can insert/update
CREATE POLICY "Modules viewable by all authenticated"
  ON public.modules FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Managers can create modules"
  ON public.modules FOR INSERT
  TO authenticated
  WITH CHECK (public.get_user_role() IN ('admin', 'manager'));

CREATE POLICY "Managers and assignees can update modules"
  ON public.modules FOR UPDATE
  TO authenticated
  USING (
    public.get_user_role() IN ('admin', 'manager')
    OR assigned_to = auth.uid()
  );

-- TASKS: all can read, employees+ can create, assignees/managers can update
CREATE POLICY "Tasks viewable by all authenticated"
  ON public.tasks FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Employees and above can create tasks"
  ON public.tasks FOR INSERT
  TO authenticated
  WITH CHECK (public.get_user_role() IN ('admin', 'manager', 'employee'));

CREATE POLICY "Task owners and managers can update"
  ON public.tasks FOR UPDATE
  TO authenticated
  USING (
    public.get_user_role() IN ('admin', 'manager')
    OR assigned_to = auth.uid()
    OR created_by = auth.uid()
  );

-- APPROVALS: managers/employees see all, interns see own
CREATE POLICY "Approvals viewable by role"
  ON public.approvals FOR SELECT
  TO authenticated
  USING (
    public.get_user_role() IN ('admin', 'manager', 'employee')
    OR requested_by = auth.uid()
  );

CREATE POLICY "Anyone can create approvals"
  ON public.approvals FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Managers and employees can update approvals"
  ON public.approvals FOR UPDATE
  TO authenticated
  USING (public.get_user_role() IN ('admin', 'manager', 'employee'));

-- ACTIVITY LOG: all authenticated can read, system inserts
CREATE POLICY "Activity viewable by all authenticated"
  ON public.activity_log FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert activity"
  ON public.activity_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- TIME ENTRIES: all can read, users can insert/update own
CREATE POLICY "Time entries viewable by all authenticated"
  ON public.time_entries FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert own time entries"
  ON public.time_entries FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own time entries"
  ON public.time_entries FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- NOTIFICATIONS: users see own notifications only
CREATE POLICY "Users see own notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can insert notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- ============================================
-- UPDATED_AT TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.modules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.approvals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
