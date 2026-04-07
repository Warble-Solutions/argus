import Link from 'next/link'
import {
  FolderKanban,
  ClipboardList,
  AlertTriangle,
  TrendingUp,
  ArrowRight,
  MessageSquare,
  Plus,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/actions/auth'
import { formatDate, getDeadlineStatus, getInitials } from '@/lib/utils'
import styles from './page.module.css'

export default async function DashboardPage() {
  const supabase = await createClient()
  const user = await getCurrentUser()

  // Fetch real counts
  const { count: projectCount } = await supabase.from('projects').select('*', { count: 'exact', head: true }).eq('status', 'active')
  const { count: taskCount } = await supabase.from('tasks').select('*', { count: 'exact', head: true }).neq('status', 'done')
  const { count: approvalCount } = await supabase.from('approvals').select('*', { count: 'exact', head: true }).eq('status', 'pending')

  // Fetch overdue modules
  const { count: overdueCount } = await supabase
    .from('modules')
    .select('*', { count: 'exact', head: true })
    .lt('deadline', new Date().toISOString())
    .not('status', 'in', '("approved","delivered")')

  // Fetch recent projects
  const { data: recentProjects } = await supabase
    .from('projects')
    .select('id, name, client_name, status, deadline, progress, modules_count, completed_modules')
    .order('created_at', { ascending: false })
    .limit(3)

  // Fetch my tasks
  const { data: myTasks } = await supabase
    .from('tasks')
    .select('id, title, priority, status, task_type, module_id')
    .eq('assigned_to', user?.id || '')
    .neq('status', 'done')
    .order('created_at', { ascending: false })
    .limit(5)

  const stats = [
    { label: 'Active Projects', value: projectCount || 0, icon: <FolderKanban size={22} />, accent: 'blue', href: '/projects' },
    { label: 'Open Tasks', value: taskCount || 0, icon: <ClipboardList size={22} />, accent: 'cyan', href: '/projects' },
    { label: 'Pending Approvals', value: approvalCount || 0, icon: <TrendingUp size={22} />, accent: 'amber', href: '/approvals' },
    { label: 'Overdue Items', value: overdueCount || 0, icon: <AlertTriangle size={22} />, accent: 'red', href: '/projects' },
  ]

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Welcome back, {user?.full_name?.split(' ')[0] || 'there'}</h1>
          <p className="page-subtitle">Here&apos;s what&apos;s happening across your projects</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className={styles.statsGrid}>
        {stats.map(stat => (
          <Link key={stat.label} href={stat.href} className={`card card-interactive ${styles.statCard}`}>
            <div className={styles.statIcon} data-accent={stat.accent}>{stat.icon}</div>
            <div className={styles.statInfo}>
              <span className={styles.statValue}>{stat.value}</span>
              <span className={styles.statLabel}>{stat.label}</span>
            </div>
          </Link>
        ))}
      </div>

      <div className={styles.dashboardGrid}>
        {/* My Tasks */}
        <div className={`card ${styles.tasksCard}`}>
          <div className="card-header">
            <h2 className="card-title">📋 My Tasks</h2>
            <Link href="/projects" className="btn btn-ghost btn-sm">View All <ArrowRight size={14} /></Link>
          </div>
          <div className={styles.tasksList}>
            {(!myTasks || myTasks.length === 0) ? (
              <div className="empty-state" style={{ padding: 'var(--space-6) 0' }}>
                <ClipboardList size={32} className="empty-state-icon" />
                <p className="empty-state-title">No open tasks</p>
                <p className="empty-state-desc">Create tasks in your project modules</p>
              </div>
            ) : (
              myTasks.map(task => (
                <div key={task.id} className={styles.taskItem}>
                  <div className={styles.taskLeft}>
                    <span className={styles.taskTitle}>{task.title}</span>
                    <div className={styles.taskMeta}>
                      <span className={`badge badge-${task.priority === 'urgent' ? 'red' : task.priority === 'high' ? 'amber' : 'neutral'}`}>
                        {task.priority}
                      </span>
                      <span className="badge badge-neutral">{task.task_type}</span>
                    </div>
                  </div>
                  <span className={`badge ${task.status === 'in_progress' ? 'badge-blue' : task.status === 'blocked' ? 'badge-red' : 'badge-neutral'}`}>
                    {task.status === 'in_progress' ? 'In Progress' : task.status === 'blocked' ? 'Blocked' : 'To Do'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Projects */}
        <div className={`card ${styles.projectsCard}`}>
          <div className="card-header">
            <h2 className="card-title">🗂 Recent Projects</h2>
            <Link href="/projects" className="btn btn-ghost btn-sm">View All <ArrowRight size={14} /></Link>
          </div>
          <div className={styles.projectsList}>
            {(!recentProjects || recentProjects.length === 0) ? (
              <div className="empty-state" style={{ padding: 'var(--space-6) 0' }}>
                <FolderKanban size={32} className="empty-state-icon" />
                <p className="empty-state-title">No projects yet</p>
                <p className="empty-state-desc">Create your first project to get started</p>
                <Link href="/projects" className="btn btn-primary btn-sm"><Plus size={14} /> New Project</Link>
              </div>
            ) : (
              recentProjects.map(project => {
                const deadlineStatus = getDeadlineStatus(project.deadline)
                return (
                  <Link key={project.id} href={`/projects/${project.id}`} className={styles.projectItem}>
                    <div className={styles.projectLeft}>
                      <span className={styles.projectName}>{project.name}</span>
                      <span className="text-tiny text-dim">{project.client_name}</span>
                    </div>
                    <div className={styles.projectRight}>
                      <span className={`text-tiny ${styles[deadlineStatus] || ''}`}>
                        {formatDate(project.deadline)}
                      </span>
                      <div className="progress-bar" style={{ width: '60px' }}>
                        <div className="progress-bar-fill" style={{ width: `${project.progress || 0}%` }} />
                      </div>
                    </div>
                  </Link>
                )
              })
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className={`card ${styles.quickCard}`}>
          <div className="card-header">
            <h2 className="card-title">⚡ Quick Actions</h2>
          </div>
          <div className={styles.quickActions}>
            <Link href="/chat" className={`btn btn-ghost ${styles.quickBtn}`}>
              <MessageSquare size={18} /> Ask Oracle
            </Link>
            <Link href="/projects" className={`btn btn-ghost ${styles.quickBtn}`}>
              <FolderKanban size={18} /> Browse Projects
            </Link>
            <Link href="/approvals" className={`btn btn-ghost ${styles.quickBtn}`}>
              <TrendingUp size={18} /> Review Approvals
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
