-- ==========================================
-- SMART DEADLINE NOTIFICATIONS (pg_cron)
-- ==========================================

-- 1. Add notification tracking columns
ALTER TABLE public.projects 
  ADD COLUMN IF NOT EXISTS notified_48h BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS notified_urgent BOOLEAN DEFAULT false;

ALTER TABLE public.modules 
  ADD COLUMN IF NOT EXISTS notified_48h BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS notified_urgent BOOLEAN DEFAULT false;

ALTER TABLE public.tasks 
  ADD COLUMN IF NOT EXISTS notified_48h BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS notified_urgent BOOLEAN DEFAULT false;

-- 2. Create the processor function
CREATE OR REPLACE FUNCTION public.process_deadlines()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  now_utc TIMESTAMPTZ := now();
  urgency_threshold INTERVAL := interval '4 hours';
  warning_threshold INTERVAL := interval '48 hours';
  -- Calculate time duration passed to determine dynamic scheduling
BEGIN
  
  -- ================================
  -- A. TASKS
  -- ================================
  
  -- 48-Hour Warnings (only for tasks that are actually due in < 48 hours but > urgency, and not done)
  INSERT INTO public.notifications (user_id, title, message, type, link)
  SELECT 
    assigned_to, 
    'Upcoming Deadline: ' || title,
    'Task "' || title || '" is due within 48 hours.',
    'deadline',
    '/projects' -- generic link, could be more specific
  FROM public.tasks
  WHERE status != 'done' 
    AND assigned_to IS NOT NULL
    AND due_date IS NOT NULL
    AND notified_48h = false 
    AND due_date - now_utc <= warning_threshold
    AND due_date - now_utc > urgency_threshold;

  UPDATE public.tasks 
  SET notified_48h = true 
  WHERE status != 'done' 
    AND assigned_to IS NOT NULL
    AND due_date IS NOT NULL
    AND notified_48h = false 
    AND due_date - now_utc <= warning_threshold;

  -- Urgent Warnings (< 4 hours)
  INSERT INTO public.notifications (user_id, title, message, type, link)
  SELECT 
    assigned_to, 
    'Urgent Deadline: ' || title,
    'Task "' || title || '" is due very soon (less than 4 hours left).',
    'deadline',
    '/projects'
  FROM public.tasks
  WHERE status != 'done' 
    AND assigned_to IS NOT NULL
    AND due_date IS NOT NULL
    AND notified_urgent = false 
    AND due_date - now_utc <= urgency_threshold
    AND due_date - now_utc > interval '0 hours'; -- don't notify if already strictly overdue and missed entirely

  UPDATE public.tasks 
  SET notified_urgent = true, notified_48h = true 
  WHERE status != 'done' 
    AND assigned_to IS NOT NULL
    AND due_date IS NOT NULL
    AND notified_urgent = false 
    AND due_date - now_utc <= urgency_threshold;


  -- ================================
  -- B. MODULES
  -- ================================
  
  INSERT INTO public.notifications (user_id, title, message, type, link)
  SELECT 
    assigned_to, 
    'Upcoming Deadline: Module ' || module_number,
    'Module "' || title || '" is due within 48 hours.',
    'deadline',
    '/projects/' || project_id || '/modules/' || id
  FROM public.modules
  WHERE status NOT IN ('approved', 'delivered') 
    AND assigned_to IS NOT NULL
    AND deadline IS NOT NULL
    AND notified_48h = false 
    AND deadline - now_utc <= warning_threshold
    AND deadline - now_utc > urgency_threshold;

  UPDATE public.modules 
  SET notified_48h = true 
  WHERE status NOT IN ('approved', 'delivered') 
    AND assigned_to IS NOT NULL
    AND deadline IS NOT NULL
    AND notified_48h = false 
    AND deadline - now_utc <= warning_threshold;

  INSERT INTO public.notifications (user_id, title, message, type, link)
  SELECT 
    assigned_to, 
    'Urgent Deadline: Module ' || module_number,
    'Module "' || title || '" is due very soon.',
    'deadline',
    '/projects/' || project_id || '/modules/' || id
  FROM public.modules
  WHERE status NOT IN ('approved', 'delivered') 
    AND assigned_to IS NOT NULL
    AND deadline IS NOT NULL
    AND notified_urgent = false 
    AND deadline - now_utc <= urgency_threshold
    AND deadline - now_utc > interval '0 hours';

  UPDATE public.modules 
  SET notified_urgent = true, notified_48h = true 
  WHERE status NOT IN ('approved', 'delivered') 
    AND assigned_to IS NOT NULL
    AND deadline IS NOT NULL
    AND notified_urgent = false 
    AND deadline - now_utc <= urgency_threshold;

  -- ================================
  -- C. PROJECTS
  -- ================================
  
  INSERT INTO public.notifications (user_id, title, message, type, link)
  SELECT 
    created_by, 
    'Upcoming Project Deadline: ' || name,
    'Project "' || name || '" is due within 48 hours.',
    'deadline',
    '/projects/' || id
  FROM public.projects
  WHERE status != 'completed' 
    AND deadline IS NOT NULL
    AND notified_48h = false 
    AND deadline - now_utc <= warning_threshold
    AND deadline - now_utc > urgency_threshold;

  UPDATE public.projects 
  SET notified_48h = true 
  WHERE status != 'completed' 
    AND deadline IS NOT NULL
    AND notified_48h = false 
    AND deadline - now_utc <= warning_threshold;

  INSERT INTO public.notifications (user_id, title, message, type, link)
  SELECT 
    created_by, 
    'Urgent Project Deadline: ' || name,
    'Project "' || name || '" is due very soon.',
    'deadline',
    '/projects/' || id
  FROM public.projects
  WHERE status != 'completed' 
    AND deadline IS NOT NULL
    AND notified_urgent = false 
    AND deadline - now_utc <= urgency_threshold
    AND deadline - now_utc > interval '0 hours';

  UPDATE public.projects 
  SET notified_urgent = true, notified_48h = true 
  WHERE status != 'completed' 
    AND deadline IS NOT NULL
    AND notified_urgent = false 
    AND deadline - now_utc <= urgency_threshold;

END;
$$;

-- 3. Enable pg_cron (Skip if running locally without extensions enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 4. Schedule the cron job (every 15 minutes)
SELECT cron.schedule(
  'process-smart-deadlines',
  '*/15 * * * *',
  'SELECT public.process_deadlines();'
);
