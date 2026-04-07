import { tool } from 'ai'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

// ============================================
// READ TOOLS — Available to all roles
// ============================================

export const getProjects = tool({
  description: 'List all active projects the user can see, with name, client, status, deadline, and progress percentage.',
  inputSchema: z.object({}),
  execute: async () => {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('projects')
      .select('id, name, client_name, status, deadline, progress, modules_count, completed_modules')
      .order('created_at', { ascending: false })

    if (error) return { error: error.message }
    return { projects: data || [] }
  },
})

export const getProjectStatus = tool({
  description: 'Get detailed info about a specific project by name or ID, including its modules, team members, and progress.',
  inputSchema: z.object({
    projectName: z.string().describe('The name (or partial name) of the project to look up'),
  }),
  execute: async ({ projectName }) => {
    const supabase = await createClient()

    const { data: projects } = await supabase
      .from('projects')
      .select('*')
      .ilike('name', `%${projectName}%`)
      .limit(1)

    if (!projects || projects.length === 0) {
      return { error: `No project found matching "${projectName}"` }
    }

    const project = projects[0]

    const { data: modules } = await supabase
      .from('modules')
      .select('id, title, module_number, status, deadline, current_version')
      .eq('project_id', project.id)
      .order('module_number')

    const { data: members } = await supabase
      .from('project_members')
      .select('project_role, profiles!project_members_user_id_fkey(full_name, role)')
      .eq('project_id', project.id)

    return {
      project: {
        name: project.name,
        client: project.client_name,
        status: project.status,
        deadline: project.deadline,
        progress: project.progress,
        description: project.description,
        modules_count: project.modules_count,
        completed_modules: project.completed_modules,
      },
      modules: modules || [],
      team: (members || []).map((m: any) => ({
        name: m.profiles?.full_name,
        projectRole: m.project_role,
        orgRole: m.profiles?.role,
      })),
    }
  },
})

export const getMyTasks = tool({
  description: 'List all tasks assigned to the current user, with status, priority, module name, and project name.',
  inputSchema: z.object({
    status: z.enum(['all', 'todo', 'in_progress', 'done', 'blocked', 'pending_review']).optional()
      .describe('Optional filter by task status. Defaults to all.'),
  }),
  execute: async ({ status }) => {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    let query = supabase
      .from('tasks')
      .select('id, title, status, priority, created_at, modules!tasks_module_id_fkey(title, projects!modules_project_id_fkey(name))')
      .eq('assigned_to', user.id)
      .order('created_at', { ascending: false })
      .limit(20)

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    const { data, error } = await query
    if (error) return { error: error.message }

    return {
      tasks: (data || []).map((t: any) => ({
        title: t.title,
        status: t.status,
        priority: t.priority,
        module: t.modules?.title,
        project: t.modules?.projects?.name,
      })),
    }
  },
})

export const getOverdueItems = tool({
  description: 'Find all projects and tasks that are past their deadline.',
  inputSchema: z.object({}),
  execute: async () => {
    const supabase = await createClient()
    const now = new Date().toISOString()

    const [projectsRes, tasksRes] = await Promise.all([
      supabase
        .from('projects')
        .select('name, client_name, deadline, status')
        .lt('deadline', now)
        .neq('status', 'completed')
        .order('deadline'),
      supabase
        .from('tasks')
        .select('title, status, priority, due_date, modules!tasks_module_id_fkey(title, projects!modules_project_id_fkey(name))')
        .lt('due_date', now)
        .not('status', 'in', '("done")')
        .order('due_date')
        .limit(15),
    ])

    return {
      overdueProjects: (projectsRes.data || []).map(p => ({
        name: p.name,
        client: p.client_name,
        deadline: p.deadline,
      })),
      overdueTasks: (tasksRes.data || []).map((t: any) => ({
        title: t.title,
        status: t.status,
        project: t.modules?.projects?.name,
        module: t.modules?.title,
      })),
    }
  },
})

export const getTeamOverview = tool({
  description: 'List all team members with their name, email, and organizational role.',
  inputSchema: z.object({}),
  execute: async () => {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, role')
      .order('created_at')

    if (error) return { error: error.message }
    return { members: data || [] }
  },
})

// ============================================
// WRITE TOOLS — Restricted by role
// ============================================

export const createTask = tool({
  description: 'Create a new task in a specific module. Requires the project name, module name/number, task title, and optionally priority and assignee.',
  inputSchema: z.object({
    projectName: z.string().describe('Name of the project'),
    moduleTitle: z.string().describe('Title or number of the module'),
    taskTitle: z.string().describe('Title of the new task'),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional().describe('Task priority, defaults to medium'),
    assigneeName: z.string().optional().describe('Name of the person to assign the task to'),
    dueDate: z.string().optional().describe('Optional ISO date string for the deadline (e.g., "2026-04-10T15:00:00Z")'),
    isConfirmed: z.boolean().optional().describe('Set to false first to propose the change to the user. MUST be true to actually write to the database.'),
  }),
  execute: async ({ projectName, moduleTitle, taskTitle, priority, assigneeName, dueDate, isConfirmed }) => {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const { data: projects } = await supabase
      .from('projects')
      .select('id, name')
      .ilike('name', `%${projectName}%`)
      .limit(1)

    if (!projects?.length) return { error: `Project "${projectName}" not found` }
    const project = projects[0]

    const { data: modules } = await supabase
      .from('modules')
      .select('id, title')
      .eq('project_id', project.id)
      .or(`title.ilike.%${moduleTitle}%,module_number.eq.${parseInt(moduleTitle) || 0}`)
      .limit(1)

    if (!modules?.length) return { error: `Module "${moduleTitle}" not found in ${project.name}` }
    const mod = modules[0]

    let assigneeId = null
    if (assigneeName) {
      const { data: people } = await supabase
        .from('profiles')
        .select('id, full_name')
        .ilike('full_name', `%${assigneeName}%`)
        .limit(1)

      if (people?.length) assigneeId = people[0].id
    }

    if (!isConfirmed) {
      return {
        dryRun: true,
        actionType: 'createTask',
        proposedData: {
          title: taskTitle,
          project: project.name,
          module: mod.title,
          priority: priority || 'medium',
          assignedTo: assigneeName || 'Unassigned',
          dueDate: dueDate || null,
        },
        message: 'Action proposed. Awaiting user confirmation.'
      }
    }

    const { data: task, error } = await supabase.from('tasks').insert({
      module_id: mod.id,
      title: taskTitle,
      priority: priority || 'medium',
      status: 'todo',
      assigned_to: assigneeId,
      due_date: dueDate || null,
      created_by: user.id,
    }).select('id, title').single()

    if (error) return { error: error.message }

    if (assigneeId && assigneeId !== user.id) {
      await supabase.from('notifications').insert({
        user_id: assigneeId,
        title: `New task: ${taskTitle}`,
        message: `You've been assigned "${taskTitle}" in ${project.name} → ${mod.title}`,
        type: 'assignment',
        link: `/projects/${project.id}/modules/${mod.id}`,
      })
    }

    return {
      success: true,
      task: { id: task.id, title: task.title },
      project: project.name,
      module: mod.title,
      assignedTo: assigneeName || 'Unassigned',
    }
  },
})

export const addMemberToProject = tool({
  description: 'Add a team member to a project with a specific role (lead, member, or intern). Admin/Manager only.',
  inputSchema: z.object({
    projectName: z.string().describe('Name of the project'),
    memberName: z.string().describe('Name of the person to add'),
    projectRole: z.enum(['lead', 'member', 'intern']).describe('Role in the project'),
    isConfirmed: z.boolean().optional().describe('Set to false first to propose the change. MUST be true to actually write to the database.'),
  }),
  execute: async ({ projectName, memberName, projectRole, isConfirmed }) => {
    const supabase = await createClient()

    const { data: projects } = await supabase
      .from('projects')
      .select('id, name')
      .ilike('name', `%${projectName}%`)
      .limit(1)

    if (!projects?.length) return { error: `Project "${projectName}" not found` }
    const project = projects[0]

    const { data: people } = await supabase
      .from('profiles')
      .select('id, full_name')
      .ilike('full_name', `%${memberName}%`)
      .limit(1)

    if (!people?.length) return { error: `Team member "${memberName}" not found` }
    const member = people[0]

    if (!isConfirmed) {
      return {
        dryRun: true,
        actionType: 'addMemberToProject',
        proposedData: {
          member: member.full_name,
          project: project.name,
          role: projectRole,
        },
        message: 'Action proposed. Awaiting user confirmation.'
      }
    }

    const { error } = await supabase.from('project_members').upsert({
      project_id: project.id,
      user_id: member.id,
      project_role: projectRole,
    }, { onConflict: 'project_id,user_id' })

    if (error) return { error: error.message }

    await supabase.from('notifications').insert({
      user_id: member.id,
      title: `Added to ${project.name}`,
      message: `You've been added as a ${projectRole} to "${project.name}"`,
      type: 'assignment',
      link: `/projects/${project.id}`,
    })

    return {
      success: true,
      member: member.full_name,
      project: project.name,
      role: projectRole,
    }
  },
})

export const updateTaskStatus = tool({
  description: 'Update the status of a task. Can set to: todo, in_progress, pending_review, done, blocked.',
  inputSchema: z.object({
    taskTitle: z.string().describe('Title (or partial title) of the task to update'),
    newStatus: z.enum(['todo', 'in_progress', 'pending_review', 'done', 'blocked']).describe('New status'),
    isConfirmed: z.boolean().optional().describe('Set to false first to propose the change. MUST be true to actually write to the database.'),
  }),
  execute: async ({ taskTitle, newStatus, isConfirmed }) => {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const { data: tasks } = await supabase
      .from('tasks')
      .select('id, title, status, modules!tasks_module_id_fkey(title, projects!modules_project_id_fkey(name))')
      .ilike('title', `%${taskTitle}%`)
      .limit(1)

    if (!tasks?.length) return { error: `Task "${taskTitle}" not found` }
    const task = tasks[0] as any

    const oldStatus = task.status

    if (!isConfirmed) {
      return {
        dryRun: true,
        actionType: 'updateTaskStatus',
        proposedData: {
          task: task.title,
          oldStatus,
          newStatus,
          project: task.modules?.projects?.name,
          module: task.modules?.title,
        },
        message: 'Action proposed. Awaiting user confirmation.'
      }
    }

    const { error } = await supabase
      .from('tasks')
      .update({ status: newStatus })
      .eq('id', task.id)

    if (error) return { error: error.message }

    return {
      success: true,
      task: task.title,
      oldStatus,
      newStatus,
      project: task.modules?.projects?.name,
      module: task.modules?.title,
    }
  },
})

export const updateTaskDeadline = tool({
  description: 'Update the due date of a task. Requires the task title and the new datetime.',
  inputSchema: z.object({
    taskTitle: z.string().describe('The title (or partial title) of the task to update'),
    newDueDate: z.string().describe('The new due date in ISO format (e.g., "2026-04-10T15:00:00Z")'),
    isConfirmed: z.boolean().optional().describe('Set to false first to propose the change. MUST be true to actually write to the database.'),
  }),
  execute: async ({ taskTitle, newDueDate, isConfirmed }) => {
    const supabase = await createClient()

    const { data: tasks } = await supabase
      .from('tasks')
      .select('id, title, due_date, modules!tasks_module_id_fkey(title, projects!modules_project_id_fkey(name))')
      .ilike('title', `%${taskTitle}%`)
      .limit(1)

    if (!tasks?.length) return { error: `Task "${taskTitle}" not found` }
    const task = tasks[0] as any

    if (!isConfirmed) {
      return {
        dryRun: true,
        actionType: 'updateTaskDeadline',
        proposedData: {
          task: task.title,
          oldDueDate: task.due_date,
          newDueDate,
        },
        message: 'Action proposed. Awaiting user confirmation.'
      }
    }

    const { error } = await supabase
      .from('tasks')
      .update({ due_date: newDueDate })
      .eq('id', task.id)

    if (error) return { error: error.message }

    return {
      success: true,
      task: task.title,
      oldDueDate: task.due_date,
      newDueDate,
      project: task.modules?.projects?.name,
      module: task.modules?.title,
    }
  },
})

export const updateProjectDeadline = tool({
  description: 'Update the deadline of a project. Requires the project name and the new datetime. Admin/Manager only.',
  inputSchema: z.object({
    projectName: z.string().describe('The name (or partial name) of the project to update'),
    newDeadline: z.string().describe('The new deadline in ISO format (e.g., "2026-04-10T15:00:00Z")'),
    isConfirmed: z.boolean().optional().describe('Set to false first to propose the change. MUST be true to actually write to the database.'),
  }),
  execute: async ({ projectName, newDeadline, isConfirmed }) => {
    const supabase = await createClient()

    const { data: projects } = await supabase
      .from('projects')
      .select('id, name, deadline')
      .ilike('name', `%${projectName}%`)
      .limit(1)

    if (!projects?.length) return { error: `Project "${projectName}" not found` }
    const project = projects[0]

    if (!isConfirmed) {
      return {
        dryRun: true,
        actionType: 'updateProjectDeadline',
        proposedData: {
          project: project.name,
          oldDeadline: project.deadline,
          newDeadline,
        },
        message: 'Action proposed. Awaiting user confirmation.'
      }
    }

    const { error } = await supabase
      .from('projects')
      .update({ deadline: newDeadline })
      .eq('id', project.id)

    if (error) return { error: error.message }

    return {
      success: true,
      project: project.name,
      oldDeadline: project.deadline,
      newDeadline,
    }
  },
})
// ============================================
// FILE TOOLS — Available to all roles
// ============================================

export const listModuleFiles = tool({
  description: 'List files uploaded to a specific module or project. Returns file names, categories, sizes, and who uploaded them.',
  inputSchema: z.object({
    projectName: z.string().describe('Project name to search files in'),
    moduleNumber: z.number().optional().describe('Optional module number to filter by'),
  }),
  execute: async ({ projectName, moduleNumber }) => {
    const supabase = await createClient()

    // Find project
    const { data: projects } = await supabase
      .from('projects')
      .select('id, name')
      .ilike('name', `%${projectName}%`)
      .limit(1)

    if (!projects?.length) return { error: `Project "${projectName}" not found` }
    const project = projects[0]

    let query = supabase
      .from('drive_files')
      .select('name, category, size_bytes, version, web_view_link, created_at, profiles!drive_files_uploaded_by_fkey(full_name), modules!drive_files_module_id_fkey(title, module_number)')
      .eq('project_id', project.id)
      .order('created_at', { ascending: false })

    if (moduleNumber) {
      const { data: modules } = await supabase
        .from('modules')
        .select('id')
        .eq('project_id', project.id)
        .eq('module_number', moduleNumber)
        .limit(1)

      if (modules?.length) {
        query = query.eq('module_id', modules[0].id)
      }
    }

    const { data: files, error } = await query.limit(20)
    if (error) return { error: error.message }

    return {
      project: project.name,
      moduleNumber: moduleNumber || 'all',
      fileCount: files?.length || 0,
      files: (files || []).map((f: any) => ({
        name: f.name,
        category: f.category,
        size: f.size_bytes,
        version: f.version,
        uploadedBy: f.profiles?.full_name,
        module: f.modules ? `Module ${f.modules.module_number}: ${f.modules.title}` : 'Project level',
        uploadedAt: f.created_at,
        driveLink: f.web_view_link,
      })),
    }
  },
})

export const getRecentUploads = tool({
  description: 'Get the most recently uploaded files across all projects. Useful for "what was uploaded today?" type questions.',
  inputSchema: z.object({
    limit: z.number().optional().default(10).describe('Number of recent files to return (default 10)'),
  }),
  execute: async ({ limit }) => {
    const supabase = await createClient()

    const { data: files, error } = await supabase
      .from('drive_files')
      .select('name, category, size_bytes, created_at, profiles!drive_files_uploaded_by_fkey(full_name), projects!drive_files_project_id_fkey(name), modules!drive_files_module_id_fkey(title, module_number)')
      .order('created_at', { ascending: false })
      .limit(limit || 10)

    if (error) return { error: error.message }

    return {
      recentFiles: (files || []).map((f: any) => ({
        name: f.name,
        category: f.category,
        size: f.size_bytes,
        project: f.projects?.name,
        module: f.modules ? `Module ${f.modules.module_number}: ${f.modules.title}` : null,
        uploadedBy: f.profiles?.full_name,
        uploadedAt: f.created_at,
      })),
    }
  },
})

// ============================================
// Tool collections by role
// ============================================

export function getToolsForRole(role: string) {
  const readTools = {
    getProjects,
    getProjectStatus,
    getMyTasks,
    getOverdueItems,
    getTeamOverview,
    listModuleFiles,
    getRecentUploads,
  }

  if (role === 'intern') return readTools

  if (role === 'employee') {
    return { ...readTools, createTask, updateTaskStatus, updateTaskDeadline }
  }

  // Admin/Manager: everything
  return { ...readTools, createTask, updateTaskStatus, updateTaskDeadline, addMemberToProject, updateProjectDeadline }
}
