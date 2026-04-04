'use server'

import { createClient } from '@/lib/supabase/server'

export async function globalSearch(query: string) {
  if (!query || query.trim().length < 2) return { projects: [], modules: [], tasks: [], people: [] }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { projects: [], modules: [], tasks: [], people: [] }

  const searchTerm = `%${query.trim()}%`

  const [projectsRes, modulesRes, tasksRes, peopleRes] = await Promise.all([
    supabase
      .from('projects')
      .select('id, name, client_name, status')
      .or(`name.ilike.${searchTerm},client_name.ilike.${searchTerm},description.ilike.${searchTerm}`)
      .limit(5),
    supabase
      .from('modules')
      .select('id, title, project_id, status, module_number, projects!modules_project_id_fkey(name)')
      .or(`title.ilike.${searchTerm},description.ilike.${searchTerm}`)
      .limit(5),
    supabase
      .from('tasks')
      .select('id, title, status, priority, module_id, modules!tasks_module_id_fkey(project_id, title)')
      .or(`title.ilike.${searchTerm},description.ilike.${searchTerm}`)
      .limit(5),
    supabase
      .from('profiles')
      .select('id, full_name, email, role')
      .or(`full_name.ilike.${searchTerm},email.ilike.${searchTerm}`)
      .limit(5),
  ])

  return {
    projects: projectsRes.data || [],
    modules: modulesRes.data || [],
    tasks: tasksRes.data || [],
    people: peopleRes.data || [],
  }
}
