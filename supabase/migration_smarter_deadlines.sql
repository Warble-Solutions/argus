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

-- 2. Helper: format an interval into a human-readable string
--    e.g. "2 days, 5 hours" / "3 hours, 12 minutes" / "45 minutes" / "overdue by 2 hours"
CREATE OR REPLACE FUNCTION public.format_time_remaining(remaining INTERVAL)
RETURNS TEXT
LANGUAGE plpgsql IMMUTABLE
AS $$
DECLARE
  total_seconds BIGINT;
  d INT; h INT; m INT;
BEGIN
  total_seconds := EXTRACT(EPOCH FROM remaining)::BIGINT;

  -- Already overdue
  IF total_seconds < 0 THEN
    total_seconds := ABS(total_seconds);
    h := total_seconds / 3600;
    m := (total_seconds % 3600) / 60;
    IF h >= 24 THEN
      d := h / 24; h := h % 24;
      RETURN 'overdue by ' || d || 'd ' || h || 'h';
    ELSIF h > 0 THEN
      RETURN 'overdue by ' || h || 'h ' || m || 'm';
    ELSE
      RETURN 'overdue by ' || m || ' minutes';
    END IF;
  END IF;

  h := total_seconds / 3600;
  m := (total_seconds % 3600) / 60;

  IF h >= 48 THEN
    d := h / 24; h := h % 24;
    RETURN d || ' days, ' || h || ' hours left';
  ELSIF h >= 24 THEN
    d := h / 24; h := h % 24;
    RETURN d || ' day, ' || h || ' hours left';
  ELSIF h > 0 THEN
    RETURN h || ' hours, ' || m || ' minutes left';
  ELSE
    RETURN m || ' minutes left';
  END IF;
END;
$$;

-- 3. Create the processor function
CREATE OR REPLACE FUNCTION public.process_deadlines()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  now_utc TIMESTAMPTZ := now();
  urgency_threshold INTERVAL := interval '4 hours';
  warning_threshold INTERVAL := interval '48 hours';
BEGIN
  
  -- ================================
  -- A. TASKS
  -- ================================
  
  -- 48-Hour Warnings (due in < 48h but > 4h, not done)
  INSERT INTO public.notifications (user_id, title, message, type, link)
  SELECT 
    assigned_to, 
    '⏳ Upcoming: ' || title,
    'Task "' || title || '" — ' || public.format_time_remaining(due_date - now_utc),
    'deadline',
    '/projects'
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
    '🔥 Urgent: ' || title,
    'Task "' || title || '" — ' || public.format_time_remaining(due_date - now_utc),
    'deadline',
    '/projects'
  FROM public.tasks
  WHERE status != 'done' 
    AND assigned_to IS NOT NULL
    AND due_date IS NOT NULL
    AND notified_urgent = false 
    AND due_date - now_utc <= urgency_threshold
    AND due_date - now_utc > interval '0 hours';

  UPDATE public.tasks 
  SET notified_urgent = true, notified_48h = true 
  WHERE status != 'done' 
    AND assigned_to IS NOT NULL
    AND due_date IS NOT NULL
    AND notified_urgent = false 
    AND due_date - now_utc <= urgency_threshold;

  -- Overdue (past deadline, not yet notified as overdue)
  INSERT INTO public.notifications (user_id, title, message, type, link)
  SELECT 
    assigned_to, 
    '❌ Overdue: ' || title,
    'Task "' || title || '" — ' || public.format_time_remaining(due_date - now_utc),
    'deadline',
    '/projects'
  FROM public.tasks
  WHERE status != 'done' 
    AND assigned_to IS NOT NULL
    AND due_date IS NOT NULL
    AND notified_urgent = false 
    AND due_date - now_utc <= interval '0 hours';

  UPDATE public.tasks 
  SET notified_urgent = true, notified_48h = true 
  WHERE status != 'done' 
    AND assigned_to IS NOT NULL
    AND due_date IS NOT NULL
    AND notified_urgent = false 
    AND due_date - now_utc <= interval '0 hours';


  -- ================================
  -- B. MODULES
  -- ================================
  
  INSERT INTO public.notifications (user_id, title, message, type, link)
  SELECT 
    assigned_to, 
    '⏳ Module ' || module_number || ': ' || title,
    'Module "' || title || '" — ' || public.format_time_remaining(deadline - now_utc),
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
    '🔥 Module ' || module_number || ': ' || title,
    'Module "' || title || '" — ' || public.format_time_remaining(deadline - now_utc),
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

  -- Overdue modules
  INSERT INTO public.notifications (user_id, title, message, type, link)
  SELECT 
    assigned_to, 
    '❌ Module ' || module_number || ': ' || title,
    'Module "' || title || '" — ' || public.format_time_remaining(deadline - now_utc),
    'deadline',
    '/projects/' || project_id || '/modules/' || id
  FROM public.modules
  WHERE status NOT IN ('approved', 'delivered') 
    AND assigned_to IS NOT NULL
    AND deadline IS NOT NULL
    AND notified_urgent = false 
    AND deadline - now_utc <= interval '0 hours';

  UPDATE public.modules 
  SET notified_urgent = true, notified_48h = true 
  WHERE status NOT IN ('approved', 'delivered') 
    AND assigned_to IS NOT NULL
    AND deadline IS NOT NULL
    AND notified_urgent = false 
    AND deadline - now_utc <= interval '0 hours';

  -- ================================
  -- C. PROJECTS
  -- ================================
  
  INSERT INTO public.notifications (user_id, title, message, type, link)
  SELECT 
    created_by, 
    '⏳ Project: ' || name,
    'Project "' || name || '" — ' || public.format_time_remaining(deadline - now_utc),
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
    '🔥 Project: ' || name,
    'Project "' || name || '" — ' || public.format_time_remaining(deadline - now_utc),
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

  -- Overdue projects
  INSERT INTO public.notifications (user_id, title, message, type, link)
  SELECT 
    created_by, 
    '❌ Project: ' || name,
    'Project "' || name || '" — ' || public.format_time_remaining(deadline - now_utc),
    'deadline',
    '/projects/' || id
  FROM public.projects
  WHERE status != 'completed' 
    AND deadline IS NOT NULL
    AND notified_urgent = false 
    AND deadline - now_utc <= interval '0 hours';

  UPDATE public.projects 
  SET notified_urgent = true, notified_48h = true 
  WHERE status != 'completed' 
    AND deadline IS NOT NULL
    AND notified_urgent = false 
    AND deadline - now_utc <= interval '0 hours';

END;
$$;

-- 4. Enable pg_cron (Skip if running locally without extensions enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 5. Schedule the cron job (every 15 minutes)
SELECT cron.schedule(
  'process-smart-deadlines',
  '*/15 * * * *',
  'SELECT public.process_deadlines();'
);
