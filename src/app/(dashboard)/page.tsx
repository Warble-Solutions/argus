import Link from 'next/link'
import {
  FolderKanban,
  ClipboardList,
  AlertTriangle,
  TrendingUp,
  ArrowRight,
  Clock,
  CheckCircle2,
  Circle,
  MessageSquare,
} from 'lucide-react'
import { mockProjects, mockTasks, mockModules, mockApprovals, mockActivityLog, currentUser, getUserById } from '@/lib/mock-data'
import { MODULE_STATUS_CONFIG, TASK_STATUS_CONFIG, TASK_PRIORITY_CONFIG, formatRelativeDate, getDaysUntil, getDeadlineStatus, getInitials } from '@/lib/utils'
import styles from './page.module.css'

export default function DashboardHome() {
  const user = currentUser

  // Stats
  const activeProjects = mockProjects.filter(p => p.status === 'active').length
  const totalTasks = mockTasks.length
  const activeTasks = mockTasks.filter(t => t.status === 'in_progress').length
  const pendingApprovals = mockApprovals.filter(a => a.status === 'pending').length
  const overdueModules = mockModules.filter(m => {
    const days = getDaysUntil(m.deadline)
    return days < 0 && m.status !== 'approved' && m.status !== 'delivered'
  }).length

  // My tasks (for current user)
  const myTasks = mockTasks.filter(t => t.status !== 'done').slice(0, 5)

  // Upcoming deadlines
  const upcomingDeadlines = [...mockModules]
    .filter(m => m.status !== 'approved' && m.status !== 'delivered')
    .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
    .slice(0, 4)

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Welcome back, {user.full_name}</p>
        </div>
        <div className="flex-row">
          <Link href="/chat" className="btn btn-primary">
            <MessageSquare size={16} />
            Open Chat
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className={`grid-stats ${styles.statsSection}`}>
        <div className="card stat-card" style={{ '--stat-color': 'var(--color-accent-blue)' } as React.CSSProperties}>
          <div className="card-body">
            <div className="flex-row">
              <FolderKanban size={20} style={{ color: 'var(--color-accent-blue)' }} />
              <span className="text-small text-muted">Active Projects</span>
            </div>
            <div className="stat-value">{activeProjects}</div>
            <div className="stat-change positive">
              <TrendingUp size={12} />
              <span>2 ahead of schedule</span>
            </div>
          </div>
        </div>

        <div className="card stat-card" style={{ '--stat-color': 'var(--color-accent-emerald)' } as React.CSSProperties}>
          <div className="card-body">
            <div className="flex-row">
              <ClipboardList size={20} style={{ color: 'var(--color-accent-emerald)' }} />
              <span className="text-small text-muted">Active Tasks</span>
            </div>
            <div className="stat-value">{activeTasks}<span className="text-small text-muted"> / {totalTasks}</span></div>
            <div className="stat-change positive">
              <CheckCircle2 size={12} />
              <span>{mockTasks.filter(t => t.status === 'done').length} completed</span>
            </div>
          </div>
        </div>

        <div className="card stat-card" style={{ '--stat-color': 'var(--color-accent-amber)' } as React.CSSProperties}>
          <div className="card-body">
            <div className="flex-row">
              <Clock size={20} style={{ color: 'var(--color-accent-amber)' }} />
              <span className="text-small text-muted">Pending Approvals</span>
            </div>
            <div className="stat-value">{pendingApprovals}</div>
            <Link href="/approvals" className="stat-change" style={{ color: 'var(--color-accent-blue)' }}>
              <span>Review now</span>
              <ArrowRight size={12} />
            </Link>
          </div>
        </div>

        <div className="card stat-card" style={{ '--stat-color': overdueModules > 0 ? 'var(--color-accent-red)' : 'var(--color-accent-emerald)' } as React.CSSProperties}>
          <div className="card-body">
            <div className="flex-row">
              <AlertTriangle size={20} style={{ color: overdueModules > 0 ? 'var(--color-accent-red)' : 'var(--color-accent-emerald)' }} />
              <span className="text-small text-muted">Overdue</span>
            </div>
            <div className="stat-value" style={{ color: overdueModules > 0 ? 'var(--color-accent-red)' : undefined }}>{overdueModules}</div>
            <div className={`stat-change ${overdueModules > 0 ? 'negative' : 'positive'}`}>
              <span>{overdueModules > 0 ? 'Needs attention' : 'All on track'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className={styles.contentGrid}>
        {/* My Tasks */}
        <div className={`card ${styles.tasksCard}`}>
          <div className="card-header">
            <h2 className="card-title">Active Tasks</h2>
            <Link href="/projects" className="btn btn-ghost btn-sm">
              View All <ArrowRight size={14} />
            </Link>
          </div>
          <div className={styles.tasksList}>
            {myTasks.map((task) => {
              const statusConfig = TASK_STATUS_CONFIG[task.status]
              const priorityConfig = TASK_PRIORITY_CONFIG[task.priority]
              const assignee = getUserById(task.assigned_to)
              const deadlineStatus = getDeadlineStatus(task.due_date)

              return (
                <div key={task.id} className={styles.taskRow}>
                  <div className={styles.taskLeft}>
                    <span className={`status-dot ${statusConfig.dotClass}`} />
                    <div className={styles.taskInfo}>
                      <span className={styles.taskTitle}>{task.title}</span>
                      <div className={styles.taskMeta}>
                        <span className={`badge ${priorityConfig.cssClass}`}>{priorityConfig.label}</span>
                        <span className={`${styles.taskDeadline} ${deadlineStatus === 'overdue' ? styles.overdue : ''} ${deadlineStatus === 'urgent' ? styles.urgent : ''}`}>
                          <Clock size={11} />
                          {getDaysUntil(task.due_date) < 0
                            ? `${Math.abs(getDaysUntil(task.due_date))}d overdue`
                            : getDaysUntil(task.due_date) === 0
                            ? 'Due today'
                            : `${getDaysUntil(task.due_date)}d left`
                          }
                        </span>
                      </div>
                    </div>
                  </div>
                  {assignee && (
                    <div className="avatar avatar-sm" title={assignee.full_name}>
                      {getInitials(assignee.full_name)}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Upcoming Deadlines */}
        <div className={`card ${styles.deadlinesCard}`}>
          <div className="card-header">
            <h2 className="card-title">Upcoming Deadlines</h2>
          </div>
          <div className={styles.deadlinesList}>
            {upcomingDeadlines.map((mod) => {
              const statusConfig = MODULE_STATUS_CONFIG[mod.status]
              const deadlineStatus = getDeadlineStatus(mod.deadline)
              const daysLeft = getDaysUntil(mod.deadline)
              const assignee = getUserById(mod.assigned_to)

              return (
                <Link
                  key={mod.id}
                  href={`/projects/${mod.project_id}/modules/${mod.id}`}
                  className={styles.deadlineItem}
                >
                  <div className={styles.deadlineLeft}>
                    <div className={`${styles.deadlineIndicator} ${styles[deadlineStatus]}`} />
                    <div className={styles.deadlineInfo}>
                      <span className={styles.deadlineTitle}>Module {mod.module_number}: {mod.title}</span>
                      <div className={styles.deadlineMeta}>
                        <span className={`badge ${statusConfig.cssClass}`}>{statusConfig.label}</span>
                        {mod.stage_gate_pending && (
                          <span className="badge badge-amber">🔒 Gate Pending</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className={styles.deadlineRight}>
                    <span className={`${styles.daysLabel} ${styles[deadlineStatus]}`}>
                      {daysLeft < 0 ? `${Math.abs(daysLeft)}d overdue` : daysLeft === 0 ? 'Today' : `${daysLeft}d`}
                    </span>
                    {assignee && (
                      <div className="avatar avatar-sm" title={assignee.full_name}>
                        {getInitials(assignee.full_name)}
                      </div>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Recent Activity */}
        <div className={`card ${styles.activityCard}`}>
          <div className="card-header">
            <h2 className="card-title">Recent Activity</h2>
          </div>
          <div className={styles.activityList}>
            {mockActivityLog.map((entry) => {
              const user = entry.user

              return (
                <div key={entry.id} className={styles.activityItem}>
                  <div className={styles.activityTimeline}>
                    <div className={styles.activityDot} />
                    <div className={styles.activityLine} />
                  </div>
                  <div className={styles.activityContent}>
                    <div className={styles.activityHeader}>
                      {user && (
                        <div className="avatar avatar-sm">
                          {getInitials(user.full_name)}
                        </div>
                      )}
                      <span className={styles.activityUser}>{user?.full_name}</span>
                      <span className={styles.activityTime}>{formatRelativeDate(entry.created_at)}</span>
                    </div>
                    <p className={styles.activityDesc}>{entry.description}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Quick Actions */}
        <div className={`card ${styles.quickActionsCard}`}>
          <div className="card-header">
            <h2 className="card-title">Quick Actions</h2>
          </div>
          <div className={styles.quickActions}>
            <Link href="/chat" className={styles.quickAction}>
              <div className={styles.qaIcon} style={{ background: 'linear-gradient(135deg, var(--color-accent-blue), var(--color-accent-purple))' }}>
                <MessageSquare size={20} />
              </div>
              <span>Chat with Argus</span>
            </Link>
            <Link href="/projects" className={styles.quickAction}>
              <div className={styles.qaIcon} style={{ background: 'linear-gradient(135deg, var(--color-accent-emerald), var(--color-accent-cyan))' }}>
                <FolderKanban size={20} />
              </div>
              <span>View Projects</span>
            </Link>
            <Link href="/approvals" className={styles.quickAction}>
              <div className={styles.qaIcon} style={{ background: 'linear-gradient(135deg, var(--color-accent-amber), #ef4444)' }}>
                <ClipboardList size={20} />
              </div>
              <span>Pending Approvals</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
