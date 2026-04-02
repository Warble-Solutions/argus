'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function createProject(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase.from('projects').insert({
    name: formData.get('name') as string,
    client_name: formData.get('client_name') as string,
    client_email: (formData.get('client_email') as string) || null,
    description: (formData.get('description') as string) || null,
    deadline: formData.get('deadline') as string,
    created_by: user.id,
  })

  if (error) throw new Error(error.message)
  revalidatePath('/projects')
}

export async function getProjects() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('projects')
    .select('*, profiles!projects_created_by_fkey(full_name)')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data || []
}

export async function getProjectById(id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .single()

  if (error) return null
  return data
}

export async function createModule(formData: FormData) {
  const supabase = await createClient()

  const projectId = formData.get('project_id') as string
  const moduleNumber = parseInt(formData.get('module_number') as string)

  const { error } = await supabase.from('modules').insert({
    project_id: projectId,
    module_number: moduleNumber,
    title: formData.get('title') as string,
    description: (formData.get('description') as string) || null,
    assigned_to: (formData.get('assigned_to') as string) || null,
    deadline: formData.get('deadline') as string,
  })

  if (error) throw new Error(error.message)

  // Update project modules count
  await supabase.rpc('increment_modules_count', { project_uuid: projectId })

  revalidatePath(`/projects/${projectId}`)
}

export async function getModulesByProject(projectId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('modules')
    .select('*, profiles!modules_assigned_to_fkey(full_name)')
    .eq('project_id', projectId)
    .order('module_number', { ascending: true })

  if (error) throw new Error(error.message)
  return data || []
}

export async function getModuleById(id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('modules')
    .select('*, profiles!modules_assigned_to_fkey(full_name)')
    .eq('id', id)
    .single()

  if (error) return null
  return data
}

export async function createTask(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const moduleId = formData.get('module_id') as string

  const { error } = await supabase.from('tasks').insert({
    module_id: moduleId,
    title: formData.get('title') as string,
    description: (formData.get('description') as string) || null,
    task_type: (formData.get('task_type') as string) || 'general',
    priority: (formData.get('priority') as string) || 'medium',
    assigned_to: (formData.get('assigned_to') as string) || null,
    due_date: (formData.get('due_date') as string) || null,
    created_by: user.id,
  })

  if (error) throw new Error(error.message)

  // Get the module's project_id for revalidation
  const { data: mod } = await supabase
    .from('modules')
    .select('project_id')
    .eq('id', moduleId)
    .single()

  if (mod) {
    revalidatePath(`/projects/${mod.project_id}/modules/${moduleId}`)
  }
}

export async function getTasksByModule(moduleId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('tasks')
    .select('*, profiles!tasks_assigned_to_fkey(full_name)')
    .eq('module_id', moduleId)
    .order('created_at', { ascending: true })

  if (error) throw new Error(error.message)
  return data || []
}

export async function updateTaskStatus(taskId: string, status: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('tasks')
    .update({ status })
    .eq('id', taskId)

  if (error) throw new Error(error.message)
}

export async function submitInternTask(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase.from('approvals').insert({
    type: 'intern_task',
    requested_by: user.id,
    title: formData.get('title') as string,
    description: (formData.get('description') as string) || null,
    metadata: {
      module_id: formData.get('module_id'),
      task_type: formData.get('task_type') || 'general',
      priority: formData.get('priority') || 'medium',
    },
  })

  if (error) throw new Error(error.message)
  revalidatePath('/approvals')
}

export async function logTime(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const hours = parseInt((formData.get('hours') as string) || '0')
  const minutes = parseInt((formData.get('minutes') as string) || '0')
  const totalMinutes = (hours * 60) + minutes

  if (totalMinutes <= 0) return

  const { error } = await supabase.from('time_entries').insert({
    user_id: user.id,
    module_id: formData.get('module_id') as string,
    duration_minutes: totalMinutes,
    notes: (formData.get('notes') as string) || null,
  })

  if (error) throw new Error(error.message)
}

export async function getTeamMembers() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) throw new Error(error.message)
  return data || []
}
