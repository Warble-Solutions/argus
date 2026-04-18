-- Migration: Add sub-task support
-- Adds parent_task_id to tasks table for nested task hierarchy

-- 1. Add parent_task_id column
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS parent_task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE;

-- 2. Index for fast lookup of child tasks
CREATE INDEX IF NOT EXISTS idx_tasks_parent ON public.tasks(parent_task_id);
