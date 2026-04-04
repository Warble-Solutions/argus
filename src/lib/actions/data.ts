'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function createProject(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: project, error } = await supabase.from('projects').insert({
    name: formData.get('name') as string,
    client_name: formData.get('client_name') as string,
    client_email: (formData.get('client_email') as string) || null,
    description: (formData.get('description') as string) || null,
    deadline: formData.get('deadline') as string,
    created_by: user.id,
  }).select('id').single()

  if (error) throw new Error(error.message)

  // Add project leads
  const leadIds = formData.getAll('lead_ids') as string[]
  if (project && leadIds.length > 0) {
    const members = leadIds.map(uid => ({
      project_id: project.id,
      user_id: uid,
      project_role: 'lead' as const,
    }))
    await supabase.from('project_members').insert(members)
  }

  revalidatePath('/projects')
  return project
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
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // If setting to 'done', check if user can self-approve
  if (status === 'done') {
    const { data: task } = await supabase
      .from('tasks')
      .select('*, modules!tasks_module_id_fkey(project_id)')
      .eq('id', taskId)
      .single()

    if (!task) throw new Error('Task not found')
    const projectId = (task.modules as any)?.project_id

    // Check if user is admin, manager, or project lead — they can self-approve
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const isGlobalManager = profile?.role === 'admin' || profile?.role === 'manager'

    let isProjectLead = false
    if (projectId) {
      const { data: membership } = await supabase
        .from('project_members')
        .select('project_role')
        .eq('project_id', projectId)
        .eq('user_id', user.id)
        .single()
      isProjectLead = membership?.project_role === 'lead'
    }

    if (isGlobalManager || isProjectLead) {
      // Can self-approve — set directly to done
      const { error } = await supabase
        .from('tasks')
        .update({ status: 'done' })
        .eq('id', taskId)
      if (error) throw new Error(error.message)
    } else {
      // Must go through review — set to pending_review and create approval
      const { error } = await supabase
        .from('tasks')
        .update({ status: 'pending_review' })
        .eq('id', taskId)
      if (error) throw new Error(error.message)

      await supabase.from('approvals').insert({
        type: 'task_completion',
        requested_by: user.id,
        title: task.title,
        description: `Task completion review for: ${task.title}`,
        project_id: projectId,
        task_id: taskId,
        metadata: {
          module_id: task.module_id,
          task_type: task.task_type,
          assigned_to: task.assigned_to,
        },
      })

      revalidatePath('/approvals')
    }
    return
  }

  // For all other status changes, just update directly
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

export async function getMemberProfile(memberId: string) {
  const supabase = await createClient()

  const [profileRes, projectsRes, tasksRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('*')
      .eq('id', memberId)
      .single(),
    supabase
      .from('project_members')
      .select('role, project_id, projects!project_members_project_id_fkey(id, name, client_name, status, deadline)')
      .eq('user_id', memberId),
    supabase
      .from('tasks')
      .select('id, title, status, priority, created_at, modules!tasks_module_id_fkey(title, project_id, projects!modules_project_id_fkey(name))')
      .eq('assigned_to', memberId)
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  if (profileRes.error) throw new Error(profileRes.error.message)

  return {
    profile: profileRes.data,
    projects: projectsRes.data || [],
    recentTasks: tasksRes.data || [],
  }
}

export async function getApprovals(filter: 'pending' | 'reviewed' | 'all' = 'all') {
  const supabase = await createClient()
  let query = supabase
    .from('approvals')
    .select('*, profiles!approvals_requested_by_fkey(full_name, role, email)')
    .order('created_at', { ascending: false })

  if (filter === 'pending') {
    query = query.eq('status', 'pending')
  } else if (filter === 'reviewed') {
    query = query.neq('status', 'pending')
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data || []
}

export async function approveRequest(approvalId: string, feedback?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Fetch the approval first
  const { data: approval } = await supabase
    .from('approvals')
    .select('*')
    .eq('id', approvalId)
    .single()

  if (!approval) throw new Error('Approval not found')

  // Update approval status
  const { error } = await supabase
    .from('approvals')
    .update({
      status: 'approved',
      reviewed_by: user.id,
      feedback: feedback || null,
    })
    .eq('id', approvalId)

  if (error) throw new Error(error.message)

  // Handle side effects based on type
  if (approval.type === 'intern_task' && approval.metadata) {
    const meta = approval.metadata as Record<string, string>
    await supabase.from('tasks').insert({
      module_id: meta.module_id,
      title: approval.title,
      description: approval.description,
      task_type: meta.task_type || 'general',
      priority: meta.priority || 'medium',
      assigned_to: approval.requested_by,
      created_by: user.id,
    })
  } else if (approval.type === 'task_completion' && approval.task_id) {
    // Set the task to done
    await supabase
      .from('tasks')
      .update({ status: 'done' })
      .eq('id', approval.task_id)
  }

  revalidatePath('/approvals')
  revalidatePath('/projects')
}

export async function rejectRequest(approvalId: string, feedback: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  if (!feedback.trim()) throw new Error('Feedback is required when rejecting')

  // Fetch the approval first
  const { data: approval } = await supabase
    .from('approvals')
    .select('*')
    .eq('id', approvalId)
    .single()

  // Update approval status
  const { error } = await supabase
    .from('approvals')
    .update({
      status: 'rejected',
      reviewed_by: user.id,
      feedback,
    })
    .eq('id', approvalId)

  if (error) throw new Error(error.message)

  // If task_completion, set task back to revision
  if (approval?.type === 'task_completion' && approval.task_id) {
    await supabase
      .from('tasks')
      .update({ status: 'revision' })
      .eq('id', approval.task_id)
  }

  revalidatePath('/approvals')
  revalidatePath('/projects')
}

// ============================================
// PROJECT MEMBERS
// ============================================

export async function getProjectMembers(projectId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('project_members')
    .select('*, profiles!project_members_user_id_fkey(id, full_name, email, role, avatar_url)')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true })

  if (error) throw new Error(error.message)
  return data || []
}

export async function addProjectMember(projectId: string, userId: string, projectRole: string = 'member') {
  const supabase = await createClient()
  const { error } = await supabase.from('project_members').upsert({
    project_id: projectId,
    user_id: userId,
    project_role: projectRole,
  }, { onConflict: 'project_id,user_id' })

  if (error) throw new Error(error.message)
  revalidatePath(`/projects/${projectId}`)
}

export async function removeProjectMember(projectId: string, userId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('project_members')
    .delete()
    .eq('project_id', projectId)
    .eq('user_id', userId)

  if (error) throw new Error(error.message)
  revalidatePath(`/projects/${projectId}`)
}

export async function getUserProjectRole(projectId: string): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Check global role first
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role === 'admin' || profile?.role === 'manager') return 'manager'

  // Check project-specific role
  const { data: membership } = await supabase
    .from('project_members')
    .select('project_role')
    .eq('project_id', projectId)
    .eq('user_id', user.id)
    .single()

  return membership?.project_role || null
}
