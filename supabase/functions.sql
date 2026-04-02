-- Run this in Supabase SQL Editor after the main schema

-- Helper function to increment project modules count
CREATE OR REPLACE FUNCTION public.increment_modules_count(project_uuid UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.projects
  SET modules_count = modules_count + 1
  WHERE id = project_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
