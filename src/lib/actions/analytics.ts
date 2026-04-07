'use server'

import { createClient } from '@/lib/supabase/server'

export interface AnalyticsData {
  overview: {
    totalProjects: number
    activeProjects: number
    completedProjects: number
    totalModules: number
    deliveredModules: number
    totalTasks: number
    completedTasks: number
    pendingApprovals: number
  }
  modulesByStatus: { status: string; count: number }[]
  employeePerformance: {
    id: string
    name: string
    role: string
    tasksCompleted: number
    tasksInProgress: number
    tasksTotal: number
    completionRate: number
    avgTimeMinutes: number
    projectCount: number
  }[]
  projectHealth: {
    id: string
    name: string
    client: string
    progress: number
    deadline: string
    status: string
    modulesTotal: number
    modulesDelivered: number
    overdueModules: number
    tasksTotal: number
    tasksDone: number
  }[]
  recentCompletions: {
    title: string
    type: 'task' | 'module'
    project: string
    completedBy: string
    completedAt: string
  }[]
}

export async function getAnalyticsData(): Promise<AnalyticsData> {
  const supabase = await createClient()
  const now = new Date().toISOString()

  // ─── Overview Counts ───
  const [
    { count: totalProjects },
    { count: activeProjects },
    { count: completedProjects },
    { count: totalModules },
    { count: deliveredModules },
    { count: totalTasks },
    { count: completedTasks },
    { count: pendingApprovals },
  ] = await Promise.all([
    supabase.from('projects').select('*', { count: 'exact', head: true }),
    supabase.from('projects').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('projects').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
    supabase.from('modules').select('*', { count: 'exact', head: true }),
    supabase.from('modules').select('*', { count: 'exact', head: true }).eq('status', 'delivered'),
    supabase.from('tasks').select('*', { count: 'exact', head: true }),
    supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('status', 'done'),
    supabase.from('approvals').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
  ])

  // ─── Modules by Status ───
  const { data: allModules } = await supabase.from('modules').select('status')
  const statusCounts = new Map<string, number>()
  ;(allModules || []).forEach(m => {
    statusCounts.set(m.status, (statusCounts.get(m.status) || 0) + 1)
  })
  const modulesByStatus = Array.from(statusCounts.entries())
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => b.count - a.count)

  // ─── Employee Performance ───
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, role')
    .order('created_at')

  const { data: allTasks } = await supabase
    .from('tasks')
    .select('id, assigned_to, status, time_spent_minutes')

  const { data: allMemberships } = await supabase
    .from('project_members')
    .select('user_id, project_id')

  const employeePerformance = (profiles || []).map(profile => {
    const userTasks = (allTasks || []).filter(t => t.assigned_to === profile.id)
    const completed = userTasks.filter(t => t.status === 'done')
    const inProgress = userTasks.filter(t => t.status === 'in_progress')
    const totalTime = completed.reduce((sum, t) => sum + (t.time_spent_minutes || 0), 0)
    const projectIds = new Set((allMemberships || []).filter(m => m.user_id === profile.id).map(m => m.project_id))

    return {
      id: profile.id,
      name: profile.full_name,
      role: profile.role,
      tasksCompleted: completed.length,
      tasksInProgress: inProgress.length,
      tasksTotal: userTasks.length,
      completionRate: userTasks.length > 0 ? Math.round((completed.length / userTasks.length) * 100) : 0,
      avgTimeMinutes: completed.length > 0 ? Math.round(totalTime / completed.length) : 0,
      projectCount: projectIds.size,
    }
  })

  // ─── Project Health ───
  const { data: projects } = await supabase
    .from('projects')
    .select('id, name, client_name, progress, deadline, status, modules_count, completed_modules')
    .order('created_at', { ascending: false })

  const { data: projectModules } = await supabase
    .from('modules')
    .select('id, project_id, status, deadline')

  const { data: projectTasks } = await supabase
    .from('tasks')
    .select('id, status, module_id, modules!tasks_module_id_fkey(project_id)')

  const projectHealth = (projects || []).map(p => {
    const pModules = (projectModules || []).filter(m => m.project_id === p.id)
    const pDelivered = pModules.filter(m => m.status === 'delivered' || m.status === 'approved')
    const pOverdue = pModules.filter(m => m.deadline < now && m.status !== 'delivered' && m.status !== 'approved')
    const pTasks = (projectTasks || []).filter((t: any) => t.modules?.project_id === p.id)
    const pTasksDone = pTasks.filter((t: any) => t.status === 'done')

    return {
      id: p.id,
      name: p.name,
      client: p.client_name,
      progress: p.progress || 0,
      deadline: p.deadline,
      status: p.status,
      modulesTotal: pModules.length,
      modulesDelivered: pDelivered.length,
      overdueModules: pOverdue.length,
      tasksTotal: pTasks.length,
      tasksDone: pTasksDone.length,
    }
  })

  // ─── Recent Completions ───
  const { data: recentDoneTasks } = await supabase
    .from('tasks')
    .select('title, completed_at, profiles!tasks_assigned_to_fkey(full_name), modules!tasks_module_id_fkey(projects!modules_project_id_fkey(name))')
    .eq('status', 'done')
    .not('completed_at', 'is', null)
    .order('completed_at', { ascending: false })
    .limit(10)

  const recentCompletions = (recentDoneTasks || []).map((t: any) => ({
    title: t.title,
    type: 'task' as const,
    project: t.modules?.projects?.name || 'Unknown',
    completedBy: t.profiles?.full_name || 'Unknown',
    completedAt: t.completed_at,
  }))

  return {
    overview: {
      totalProjects: totalProjects || 0,
      activeProjects: activeProjects || 0,
      completedProjects: completedProjects || 0,
      totalModules: totalModules || 0,
      deliveredModules: deliveredModules || 0,
      totalTasks: totalTasks || 0,
      completedTasks: completedTasks || 0,
      pendingApprovals: pendingApprovals || 0,
    },
    modulesByStatus,
    employeePerformance,
    projectHealth,
    recentCompletions,
  }
}
