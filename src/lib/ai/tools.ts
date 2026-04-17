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
// TIMELINE / VERSION TOOLS
// ============================================

export const getProjectTimeline = tool({
  description: 'Get the version delivery timeline for a project — shows all modules with their story/SCORM versions, delivery dates, and feedback dates.',
  inputSchema: z.object({ projectName: z.string().describe('Name of the project') }),
  execute: async ({ projectName }) => {
    const supabase = await createClient()
    const { data: projects } = await supabase.from('projects').select('id, name, is_vernacular').ilike('name', `%${projectName}%`).limit(1)
    if (!projects?.length) return { error: `Project "${projectName}" not found` }
    const project = projects[0]
    const { data: modules } = await supabase.from('modules')
      .select('id, title, module_number, language, remark, status, current_version, scorm_status, scorm_approved_at, module_versions(*)')
      .eq('project_id', project.id).order('module_number')
    return {
      project: project.name, isVernacular: project.is_vernacular,
      modules: (modules || []).map((m: any) => {
        const sv = m.module_versions.filter((v: any) => v.type === 'story').sort((a: any, b: any) => b.version_number - a.version_number)
        const sc = m.module_versions.filter((v: any) => v.type === 'scorm').sort((a: any, b: any) => b.version_number - a.version_number)
        return { number: m.module_number, title: m.title, language: m.language, status: m.status, latestStoryVersion: sv[0]?.version_number || 0, lastDelivered: sv[0]?.delivered_at, lastFeedback: sv[0]?.feedback_received_at, scormStatus: m.scorm_status, scormApprovedAt: m.scorm_approved_at, totalStoryVersions: sv.length, totalScormVersions: sc.length, remark: m.remark }
      }),
    }
  },
})

export const getModuleVersionHistory = tool({
  description: 'Get the complete version-by-version history for a specific module, including all story and SCORM versions with dates.',
  inputSchema: z.object({ projectName: z.string(), moduleTitle: z.string().describe('Module title or number') }),
  execute: async ({ projectName, moduleTitle }) => {
    const supabase = await createClient()
    const { data: projects } = await supabase.from('projects').select('id').ilike('name', `%${projectName}%`).limit(1)
    if (!projects?.length) return { error: `Project "${projectName}" not found` }
    const { data: modules } = await supabase.from('modules').select('id, title, module_number, language, remark, status, scorm_status, scorm_approved_at')
      .eq('project_id', projects[0].id).or(`title.ilike.%${moduleTitle}%,module_number.eq.${parseInt(moduleTitle) || 0}`).limit(1)
    if (!modules?.length) return { error: `Module "${moduleTitle}" not found` }
    const mod = modules[0]
    const { data: versions } = await supabase.from('module_versions').select('*').eq('module_id', mod.id).order('type').order('version_number')
    return {
      module: mod.title, status: mod.status, language: mod.language, remark: mod.remark, scormStatus: mod.scorm_status, scormApprovedAt: mod.scorm_approved_at,
      versions: (versions || []).map(v => ({ type: v.type, version: v.version_number, deliveredAt: v.delivered_at, feedbackAt: v.feedback_received_at, notes: v.notes })),
    }
  },
})

export const recordVersion = tool({
  description: 'Record that a new story or SCORM version was delivered for a module. Auto-assigns next version number.',
  inputSchema: z.object({ projectName: z.string(), moduleTitle: z.string(), type: z.enum(['story', 'scorm']), isConfirmed: z.boolean().optional() }),
  execute: async ({ projectName, moduleTitle, type, isConfirmed }) => {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }
    const { data: projects } = await supabase.from('projects').select('id, name').ilike('name', `%${projectName}%`).limit(1)
    if (!projects?.length) return { error: `Project "${projectName}" not found` }
    const { data: modules } = await supabase.from('modules').select('id, title').eq('project_id', projects[0].id)
      .or(`title.ilike.%${moduleTitle}%,module_number.eq.${parseInt(moduleTitle) || 0}`).limit(1)
    if (!modules?.length) return { error: `Module "${moduleTitle}" not found` }
    const mod = modules[0]
    const { data: existing } = await supabase.from('module_versions').select('version_number').eq('module_id', mod.id).eq('type', type).order('version_number', { ascending: false }).limit(1)
    const nextVersion = (existing?.length ? existing[0].version_number : 0) + 1
    if (!isConfirmed) return { dryRun: true, actionType: 'recordVersion', proposedData: { module: mod.title, type, version: nextVersion, project: projects[0].name }, message: 'Action proposed. Awaiting confirmation.' }
    const { error } = await supabase.from('module_versions').insert({ module_id: mod.id, version_number: nextVersion, type, delivered_at: new Date().toISOString() })
    if (error) return { error: error.message }
    if (type === 'story') await supabase.from('modules').update({ current_version: nextVersion }).eq('id', mod.id)
    else await supabase.from('modules').update({ scorm_status: 'in_progress' }).eq('id', mod.id)
    return { success: true, module: mod.title, type, version: nextVersion }
  },
})

export const recordFeedback = tool({
  description: 'Record that feedback was received on the latest pending version (story or SCORM) of a module.',
  inputSchema: z.object({ projectName: z.string(), moduleTitle: z.string(), type: z.enum(['story', 'scorm']), isConfirmed: z.boolean().optional() }),
  execute: async ({ projectName, moduleTitle, type, isConfirmed }) => {
    const supabase = await createClient()
    const { data: projects } = await supabase.from('projects').select('id, name').ilike('name', `%${projectName}%`).limit(1)
    if (!projects?.length) return { error: `Project "${projectName}" not found` }
    const { data: modules } = await supabase.from('modules').select('id, title').eq('project_id', projects[0].id)
      .or(`title.ilike.%${moduleTitle}%,module_number.eq.${parseInt(moduleTitle) || 0}`).limit(1)
    if (!modules?.length) return { error: `Module "${moduleTitle}" not found` }
    const { data: pending } = await supabase.from('module_versions').select('id, version_number')
      .eq('module_id', modules[0].id).eq('type', type).is('feedback_received_at', null).not('delivered_at', 'is', null)
      .order('version_number', { ascending: false }).limit(1)
    if (!pending?.length) return { error: `No pending ${type} version for "${modules[0].title}"` }
    if (!isConfirmed) return { dryRun: true, actionType: 'recordFeedback', proposedData: { module: modules[0].title, type, version: pending[0].version_number }, message: 'Action proposed. Awaiting confirmation.' }
    await supabase.from('module_versions').update({ feedback_received_at: new Date().toISOString() }).eq('id', pending[0].id)
    return { success: true, module: modules[0].title, type, version: pending[0].version_number }
  },
})

export const approveScorm = tool({
  description: 'Mark the SCORM for a module as approved — final sign-off.',
  inputSchema: z.object({ projectName: z.string(), moduleTitle: z.string(), isConfirmed: z.boolean().optional() }),
  execute: async ({ projectName, moduleTitle, isConfirmed }) => {
    const supabase = await createClient()
    const { data: projects } = await supabase.from('projects').select('id, name').ilike('name', `%${projectName}%`).limit(1)
    if (!projects?.length) return { error: `Project "${projectName}" not found` }
    const { data: modules } = await supabase.from('modules').select('id, title').eq('project_id', projects[0].id)
      .or(`title.ilike.%${moduleTitle}%,module_number.eq.${parseInt(moduleTitle) || 0}`).limit(1)
    if (!modules?.length) return { error: `Module "${moduleTitle}" not found` }
    if (!isConfirmed) return { dryRun: true, actionType: 'approveScorm', proposedData: { module: modules[0].title, project: projects[0].name }, message: 'Action proposed. Awaiting confirmation.' }
    await supabase.from('modules').update({ scorm_status: 'approved', scorm_approved_at: new Date().toISOString() }).eq('id', modules[0].id)
    return { success: true, module: modules[0].title }
  },
})

// ============================================
// APPROVAL TOOLS
// ============================================

export const getApprovals = tool({
  description: 'List pending approvals (intern task requests, task reviews, stage gates). Optionally filter by status.',
  inputSchema: z.object({ status: z.enum(['pending', 'approved', 'rejected', 'all']).optional().default('pending') }),
  execute: async ({ status }) => {
    const supabase = await createClient()
    let query = supabase.from('approvals').select('id, type, status, title, description, feedback, created_at, profiles!approvals_requested_by_fkey(full_name)')
      .order('created_at', { ascending: false }).limit(15)
    if (status && status !== 'all') query = query.eq('status', status)
    const { data, error } = await query
    if (error) return { error: error.message }
    return { approvals: (data || []).map((a: any) => ({ id: a.id, type: a.type, status: a.status, title: a.title, description: a.description, feedback: a.feedback, requestedBy: a.profiles?.full_name, createdAt: a.created_at })) }
  },
})

export const handleApproval = tool({
  description: 'Approve or reject a pending approval by its title.',
  inputSchema: z.object({ approvalTitle: z.string(), action: z.enum(['approve', 'reject']), feedback: z.string().optional(), isConfirmed: z.boolean().optional() }),
  execute: async ({ approvalTitle, action, feedback, isConfirmed }) => {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }
    const { data: approvals } = await supabase.from('approvals').select('id, title, type, requested_by').ilike('title', `%${approvalTitle}%`).eq('status', 'pending').limit(1)
    if (!approvals?.length) return { error: `No pending approval matching "${approvalTitle}"` }
    const approval = approvals[0]
    if (!isConfirmed) return { dryRun: true, actionType: 'handleApproval', proposedData: { title: approval.title, type: approval.type, action }, message: 'Action proposed. Awaiting confirmation.' }
    const newStatus = action === 'approve' ? 'approved' : 'rejected'
    await supabase.from('approvals').update({ status: newStatus, reviewed_by: user.id, feedback: feedback || null }).eq('id', approval.id)
    await supabase.from('notifications').insert({ user_id: approval.requested_by, title: `Approval ${newStatus}: ${approval.title}`, message: `Your request "${approval.title}" was ${newStatus}.${feedback ? ` Feedback: ${feedback}` : ''}`, type: 'approval' })
    return { success: true, title: approval.title, action: newStatus }
  },
})

// ============================================
// ACTIVITY LOG & ANALYTICS
// ============================================

export const getActivityLog = tool({
  description: 'Get recent activity — task updates, file uploads, status changes. Optionally filter by project.',
  inputSchema: z.object({ projectName: z.string().optional(), limit: z.number().optional().default(15) }),
  execute: async ({ projectName, limit }) => {
    const supabase = await createClient()
    let query = supabase.from('activity_log').select('action, description, created_at, profiles!activity_log_user_id_fkey(full_name)')
      .order('created_at', { ascending: false }).limit(limit || 15)
    if (projectName) {
      const { data: projects } = await supabase.from('projects').select('id').ilike('name', `%${projectName}%`).limit(1)
      if (projects?.length) query = query.eq('project_id', projects[0].id)
    }
    const { data, error } = await query
    if (error) return { error: error.message }
    return { activities: (data || []).map((a: any) => ({ action: a.action, description: a.description, by: a.profiles?.full_name, at: a.created_at })) }
  },
})

export const getAnalytics = tool({
  description: 'Get dashboard analytics — project counts by status, task counts by status, overdue counts, team size.',
  inputSchema: z.object({}),
  execute: async () => {
    const supabase = await createClient()
    const now = new Date().toISOString()
    const [pRes, tRes, teamRes, opRes, otRes] = await Promise.all([
      supabase.from('projects').select('id, status'),
      supabase.from('tasks').select('id, status'),
      supabase.from('profiles').select('id', { count: 'exact' }),
      supabase.from('projects').select('id', { count: 'exact' }).lt('deadline', now).neq('status', 'completed'),
      supabase.from('tasks').select('id', { count: 'exact' }).lt('due_date', now).not('status', 'in', '("done")'),
    ])
    const p = pRes.data || [], t = tRes.data || []
    return {
      projects: { total: p.length, active: p.filter(x => x.status === 'active').length, completed: p.filter(x => x.status === 'completed').length, onHold: p.filter(x => x.status === 'on_hold').length, overdue: opRes.count || 0 },
      tasks: { total: t.length, todo: t.filter(x => x.status === 'todo').length, inProgress: t.filter(x => x.status === 'in_progress').length, done: t.filter(x => x.status === 'done').length, blocked: t.filter(x => x.status === 'blocked').length, pendingReview: t.filter(x => x.status === 'pending_review').length, overdue: otRes.count || 0 },
      teamSize: teamRes.count || 0,
    }
  },
})

// ============================================
// PROJECT CRUD
// ============================================

export const createProjectTool = tool({
  description: 'Create a new project. Admin/Manager only.',
  inputSchema: z.object({ name: z.string(), clientName: z.string(), deadline: z.string().describe('ISO date'), description: z.string().optional(), isVernacular: z.boolean().optional(), isConfirmed: z.boolean().optional() }),
  execute: async ({ name, clientName, deadline, description, isVernacular, isConfirmed }) => {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }
    if (!isConfirmed) return { dryRun: true, actionType: 'createProject', proposedData: { name, clientName, deadline, isVernacular: !!isVernacular }, message: 'Action proposed. Awaiting confirmation.' }
    const { data, error } = await supabase.from('projects').insert({ name, client_name: clientName, deadline, description: description || null, is_vernacular: !!isVernacular, created_by: user.id }).select('id, name').single()
    if (error) return { error: error.message }
    return { success: true, project: data }
  },
})

export const updateProjectStatus = tool({
  description: 'Change a project\'s status (active, on_hold, completed, archived).',
  inputSchema: z.object({ projectName: z.string(), newStatus: z.enum(['active', 'on_hold', 'completed', 'archived']), isConfirmed: z.boolean().optional() }),
  execute: async ({ projectName, newStatus, isConfirmed }) => {
    const supabase = await createClient()
    const { data: projects } = await supabase.from('projects').select('id, name, status').ilike('name', `%${projectName}%`).limit(1)
    if (!projects?.length) return { error: `Project "${projectName}" not found` }
    if (!isConfirmed) return { dryRun: true, actionType: 'updateProjectStatus', proposedData: { project: projects[0].name, oldStatus: projects[0].status, newStatus }, message: 'Action proposed. Awaiting confirmation.' }
    const { error } = await supabase.from('projects').update({ status: newStatus }).eq('id', projects[0].id)
    if (error) return { error: error.message }
    return { success: true, project: projects[0].name, oldStatus: projects[0].status, newStatus }
  },
})

export const deleteProjectTool = tool({
  description: 'Permanently delete a project and ALL its data. Irreversible. Admin/Manager only.',
  inputSchema: z.object({ projectName: z.string(), isConfirmed: z.boolean().optional() }),
  execute: async ({ projectName, isConfirmed }) => {
    const supabase = await createClient()
    const { data: projects } = await supabase.from('projects').select('id, name, modules_count').ilike('name', `%${projectName}%`).limit(1)
    if (!projects?.length) return { error: `Project "${projectName}" not found` }
    if (!isConfirmed) return { dryRun: true, actionType: 'deleteProject', proposedData: { project: projects[0].name, modulesCount: projects[0].modules_count, warning: 'Permanently deletes ALL data.' }, message: 'Action proposed. Awaiting confirmation.' }
    const { error } = await supabase.from('projects').delete().eq('id', projects[0].id)
    if (error) return { error: error.message }
    return { success: true, deleted: projects[0].name }
  },
})

// ============================================
// MODULE CRUD
// ============================================

export const createModuleTool = tool({
  description: 'Create a new module in a project. Auto-assigns next module number.',
  inputSchema: z.object({ projectName: z.string(), title: z.string(), deadline: z.string().describe('ISO date'), language: z.string().optional(), assigneeName: z.string().optional(), isConfirmed: z.boolean().optional() }),
  execute: async ({ projectName, title, deadline, language, assigneeName, isConfirmed }) => {
    const supabase = await createClient()
    const { data: projects } = await supabase.from('projects').select('id, name').ilike('name', `%${projectName}%`).limit(1)
    if (!projects?.length) return { error: `Project "${projectName}" not found` }
    const { data: existing } = await supabase.from('modules').select('module_number').eq('project_id', projects[0].id).order('module_number', { ascending: false }).limit(1)
    const nextNumber = (existing?.length ? existing[0].module_number : 0) + 1
    let assigneeId = null
    if (assigneeName) { const { data: people } = await supabase.from('profiles').select('id').ilike('full_name', `%${assigneeName}%`).limit(1); if (people?.length) assigneeId = people[0].id }
    if (!isConfirmed) return { dryRun: true, actionType: 'createModule', proposedData: { project: projects[0].name, title, moduleNumber: nextNumber, language, assignee: assigneeName || 'Unassigned' }, message: 'Action proposed. Awaiting confirmation.' }
    const { data, error } = await supabase.from('modules').insert({ project_id: projects[0].id, module_number: nextNumber, title, deadline, language: language || null, assigned_to: assigneeId }).select('id, title, module_number').single()
    if (error) return { error: error.message }
    await supabase.rpc('increment_modules_count', { project_uuid: projects[0].id })
    return { success: true, module: data }
  },
})

export const updateModuleStatus = tool({
  description: 'Change a module\'s workflow status.',
  inputSchema: z.object({ projectName: z.string(), moduleTitle: z.string(), newStatus: z.enum(['not_started', 'storyboard', 'video_production', 'articulate_build', 'review', 'revision', 'approved', 'delivered']), isConfirmed: z.boolean().optional() }),
  execute: async ({ projectName, moduleTitle, newStatus, isConfirmed }) => {
    const supabase = await createClient()
    const { data: projects } = await supabase.from('projects').select('id, name').ilike('name', `%${projectName}%`).limit(1)
    if (!projects?.length) return { error: `Project "${projectName}" not found` }
    const { data: modules } = await supabase.from('modules').select('id, title, status').eq('project_id', projects[0].id)
      .or(`title.ilike.%${moduleTitle}%,module_number.eq.${parseInt(moduleTitle) || 0}`).limit(1)
    if (!modules?.length) return { error: `Module "${moduleTitle}" not found` }
    if (!isConfirmed) return { dryRun: true, actionType: 'updateModuleStatus', proposedData: { module: modules[0].title, oldStatus: modules[0].status, newStatus }, message: 'Action proposed. Awaiting confirmation.' }
    const { error } = await supabase.from('modules').update({ status: newStatus }).eq('id', modules[0].id)
    if (error) return { error: error.message }
    return { success: true, module: modules[0].title, oldStatus: modules[0].status, newStatus }
  },
})

export const deleteModuleTool = tool({
  description: 'Delete a module and all its tasks. Admin/Manager only.',
  inputSchema: z.object({ projectName: z.string(), moduleTitle: z.string(), isConfirmed: z.boolean().optional() }),
  execute: async ({ projectName, moduleTitle, isConfirmed }) => {
    const supabase = await createClient()
    const { data: projects } = await supabase.from('projects').select('id, name').ilike('name', `%${projectName}%`).limit(1)
    if (!projects?.length) return { error: `Project "${projectName}" not found` }
    const { data: modules } = await supabase.from('modules').select('id, title').eq('project_id', projects[0].id)
      .or(`title.ilike.%${moduleTitle}%,module_number.eq.${parseInt(moduleTitle) || 0}`).limit(1)
    if (!modules?.length) return { error: `Module "${moduleTitle}" not found` }
    if (!isConfirmed) return { dryRun: true, actionType: 'deleteModule', proposedData: { module: modules[0].title, project: projects[0].name, warning: 'Deletes the module and ALL its tasks.' }, message: 'Action proposed. Awaiting confirmation.' }
    const { error } = await supabase.from('modules').delete().eq('id', modules[0].id)
    if (error) return { error: error.message }
    return { success: true, deleted: modules[0].title }
  },
})

export const deleteTaskTool = tool({
  description: 'Delete a task by title.',
  inputSchema: z.object({ taskTitle: z.string(), isConfirmed: z.boolean().optional() }),
  execute: async ({ taskTitle, isConfirmed }) => {
    const supabase = await createClient()
    const { data: tasks } = await supabase.from('tasks').select('id, title, modules!tasks_module_id_fkey(title, projects!modules_project_id_fkey(name))').ilike('title', `%${taskTitle}%`).limit(1)
    if (!tasks?.length) return { error: `Task "${taskTitle}" not found` }
    const task = tasks[0] as any
    if (!isConfirmed) return { dryRun: true, actionType: 'deleteTask', proposedData: { task: task.title, module: task.modules?.title, project: task.modules?.projects?.name }, message: 'Action proposed. Awaiting confirmation.' }
    const { error } = await supabase.from('tasks').delete().eq('id', task.id)
    if (error) return { error: error.message }
    return { success: true, deleted: task.title }
  },
})

export const updateMemberRole = tool({
  description: 'Change a team member\'s role (admin, manager, employee, intern). Admin only. Cannot change own role.',
  inputSchema: z.object({ memberName: z.string(), newRole: z.enum(['admin', 'manager', 'employee', 'intern']), isConfirmed: z.boolean().optional() }),
  execute: async ({ memberName, newRole, isConfirmed }) => {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }
    const { data: people } = await supabase.from('profiles').select('id, full_name, role').ilike('full_name', `%${memberName}%`).limit(1)
    if (!people?.length) return { error: `"${memberName}" not found` }
    if (people[0].id === user.id) return { error: 'Cannot change your own role' }
    if (!isConfirmed) return { dryRun: true, actionType: 'updateMemberRole', proposedData: { member: people[0].full_name, oldRole: people[0].role, newRole }, message: 'Action proposed. Awaiting confirmation.' }
    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', people[0].id)
    if (error) return { error: error.message }
    return { success: true, member: people[0].full_name, oldRole: people[0].role, newRole }
  },
})

// ============================================
// Tool collections by role
// ============================================

export function getToolsForRole(role: string) {
  const readTools = {
    getProjects, getProjectStatus, getMyTasks, getOverdueItems, getTeamOverview,
    listModuleFiles, getRecentUploads, getProjectTimeline, getModuleVersionHistory,
    getApprovals, getActivityLog, getAnalytics,
  }

  if (role === 'intern') return readTools

  const employeeWrite = { createTask, updateTaskStatus, updateTaskDeadline, deleteTaskTool, recordVersion, recordFeedback, handleApproval }
  if (role === 'employee') return { ...readTools, ...employeeWrite }

  const managerWrite = { ...employeeWrite, addMemberToProject, updateProjectDeadline, updateProjectStatus, createProjectTool, deleteProjectTool, createModuleTool, updateModuleStatus, deleteModuleTool, approveScorm }
  if (role === 'manager') return { ...readTools, ...managerWrite }

  // Admin: everything including role management
  return { ...readTools, ...managerWrite, updateMemberRole }
}
