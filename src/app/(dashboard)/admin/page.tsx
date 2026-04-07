import {
  BarChart3, TrendingUp, Users, Clock, CheckCircle,
  FolderKanban, Package, AlertTriangle, Star, Target, ArrowRight,
} from 'lucide-react'
import Link from 'next/link'
import { getAnalyticsData } from '@/lib/actions/analytics'
import { getCurrentUser } from '@/lib/actions/auth'
import { formatDate, getDeadlineStatus, getInitials, formatRelativeDate } from '@/lib/utils'
import { MODULE_STATUS_CONFIG } from '@/lib/utils'
import { redirect } from 'next/navigation'
import styles from './page.module.css'

export default async function AnalyticsPage() {
  const user = await getCurrentUser()
  if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
    redirect('/')
  }

  const data = await getAnalyticsData()
  const { overview, modulesByStatus, employeePerformance, projectHealth } = data

  const taskCompletionRate = overview.totalTasks > 0
    ? Math.round((overview.completedTasks / overview.totalTasks) * 100)
    : 0

  const moduleDeliveryRate = overview.totalModules > 0
    ? Math.round((overview.deliveredModules / overview.totalModules) * 100)
    : 0

  // Sort employees by completion rate for ranking
  const rankedEmployees = [...employeePerformance]
    .filter(e => e.tasksTotal > 0)
    .sort((a, b) => b.completionRate - a.completionRate || b.tasksCompleted - a.tasksCompleted)

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Analytics</h1>
          <p className="page-subtitle">Team performance and production metrics — live data</p>
        </div>
      </div>

      {/* ═══ Headline Stats ═══ */}
      <div className="grid-stats" style={{ marginBottom: 'var(--space-8)' }}>
        <div className="card stat-card" style={{ '--stat-color': 'var(--color-accent-blue)' } as React.CSSProperties}>
          <div className="card-body">
            <div className="flex-row">
              <FolderKanban size={20} style={{ color: 'var(--color-accent-blue)' }} />
              <span className="text-small text-muted">Active Projects</span>
            </div>
            <div className="stat-value">{overview.activeProjects}</div>
            <div className="stat-change positive">
              <span>{overview.totalProjects} total · {overview.completedProjects} completed</span>
            </div>
          </div>
        </div>

        <div className="card stat-card" style={{ '--stat-color': 'var(--color-accent-emerald)' } as React.CSSProperties}>
          <div className="card-body">
            <div className="flex-row">
              <CheckCircle size={20} style={{ color: 'var(--color-accent-emerald)' }} />
              <span className="text-small text-muted">Task Completion</span>
            </div>
            <div className="stat-value">{taskCompletionRate}<span className="text-small text-muted">%</span></div>
            <div className="stat-change positive">
              <span>{overview.completedTasks}/{overview.totalTasks} tasks done</span>
            </div>
          </div>
        </div>

        <div className="card stat-card" style={{ '--stat-color': 'var(--color-accent-purple)' } as React.CSSProperties}>
          <div className="card-body">
            <div className="flex-row">
              <Package size={20} style={{ color: 'var(--color-accent-purple)' }} />
              <span className="text-small text-muted">Modules Delivered</span>
            </div>
            <div className="stat-value">{overview.deliveredModules}</div>
            <div className="stat-change positive">
              <span>{moduleDeliveryRate}% delivery rate</span>
            </div>
          </div>
        </div>

        <div className="card stat-card" style={{ '--stat-color': 'var(--color-accent-amber)' } as React.CSSProperties}>
          <div className="card-body">
            <div className="flex-row">
              <Clock size={20} style={{ color: 'var(--color-accent-amber)' }} />
              <span className="text-small text-muted">Pending Approvals</span>
            </div>
            <div className="stat-value">{overview.pendingApprovals}</div>
            <div className="stat-change positive">
              <Link href="/approvals" style={{ color: 'inherit', textDecoration: 'underline', textUnderlineOffset: '2px' }}>
                View queue →
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.analyticsGrid}>
        {/* ═══ Employee Performance ═══ */}
        <div className={`card ${styles.performanceCard}`}>
          <div className="card-header">
            <h2 className="card-title"><Users size={18} /> Team Performance</h2>
          </div>
          <div className={styles.performanceList}>
            {employeePerformance.length === 0 ? (
              <div className="empty-state" style={{ padding: 'var(--space-6) 0' }}>
                <Users size={32} className="empty-state-icon" />
                <p className="empty-state-title">No team data yet</p>
                <p className="empty-state-desc">Performance data will appear as tasks are assigned and completed.</p>
              </div>
            ) : (
              employeePerformance.map((emp, idx) => {
                const rank = rankedEmployees.findIndex(r => r.id === emp.id)
                const isTopPerformer = rank === 0 && emp.tasksCompleted > 0

                return (
                  <Link
                    key={emp.id}
                    href={`/admin/team/${emp.id}`}
                    className={styles.performanceRow}
                  >
                    <div className={styles.perfLeft}>
                      <div className={`avatar avatar-sm ${isTopPerformer ? styles.topPerformerAvatar : ''}`}>
                        {getInitials(emp.name)}
                      </div>
                      <div className={styles.perfInfo}>
                        <span className={styles.perfName}>
                          {emp.name}
                          {isTopPerformer && <Star size={12} className={styles.starIcon} />}
                        </span>
                        <span className="text-tiny text-dim">
                          {emp.role} · {emp.projectCount} project{emp.projectCount !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                    <div className={styles.perfStats}>
                      <div className={styles.perfStat}>
                        <span className="text-tiny text-dim">Done</span>
                        <span className={styles.perfValue}>{emp.tasksCompleted}</span>
                      </div>
                      <div className={styles.perfStat}>
                        <span className="text-tiny text-dim">Active</span>
                        <span className={styles.perfValue}>{emp.tasksInProgress}</span>
                      </div>
                      <div className={styles.perfStat}>
                        <span className="text-tiny text-dim">Rate</span>
                        <span className={`${styles.perfValue} ${
                          emp.completionRate >= 80 ? styles.rateGood :
                          emp.completionRate >= 50 ? styles.rateOk :
                          emp.tasksTotal === 0 ? '' : styles.rateLow
                        }`}>
                          {emp.tasksTotal > 0 ? `${emp.completionRate}%` : '—'}
                        </span>
                      </div>
                    </div>
                    <div className={styles.perfBar}>
                      <div className={styles.perfBarTrack}>
                        <div
                          className={styles.perfBarFill}
                          style={{ width: `${emp.completionRate}%` }}
                        />
                      </div>
                    </div>
                  </Link>
                )
              })
            )}
          </div>
        </div>

        {/* ═══ Module Pipeline ═══ */}
        <div className={`card ${styles.pipelineCard}`}>
          <div className="card-header">
            <h2 className="card-title"><BarChart3 size={18} /> Module Pipeline</h2>
          </div>
          {modulesByStatus.length === 0 ? (
            <div className="empty-state" style={{ padding: 'var(--space-6) 0' }}>
              <Package size={32} className="empty-state-icon" />
              <p className="empty-state-title">No modules yet</p>
            </div>
          ) : (
            <div className={styles.pipelineList}>
              {modulesByStatus.map(({ status, count }) => {
                const config = MODULE_STATUS_CONFIG[status as keyof typeof MODULE_STATUS_CONFIG]
                const pct = overview.totalModules > 0 ? Math.round((count / overview.totalModules) * 100) : 0
                return (
                  <div key={status} className={styles.pipelineRow}>
                    <div className={styles.pipelineLabel}>
                      <span className={`badge ${config?.cssClass || 'badge-neutral'}`}>
                        {config?.label || status}
                      </span>
                      <span className="text-small text-mono">{count}</span>
                    </div>
                    <div className={styles.pipelineBar}>
                      <div
                        className={styles.pipelineBarFill}
                        style={{
                          width: `${pct}%`,
                          backgroundColor: config?.color || 'var(--color-border-subtle)',
                        }}
                      />
                    </div>
                    <span className="text-tiny text-dim">{pct}%</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ═══ Project Health ═══ */}
      <div className={`card ${styles.healthCard}`} style={{ marginTop: 'var(--space-6)' }}>
        <div className="card-header">
          <h2 className="card-title"><Target size={18} /> Project Health</h2>
          <Link href="/projects" className="btn btn-ghost btn-sm">View All <ArrowRight size={14} /></Link>
        </div>
        {projectHealth.length === 0 ? (
          <div className="empty-state" style={{ padding: 'var(--space-6) 0' }}>
            <FolderKanban size={32} className="empty-state-icon" />
            <p className="empty-state-title">No projects yet</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Status</th>
                  <th>Progress</th>
                  <th>Modules</th>
                  <th>Tasks</th>
                  <th>Deadline</th>
                  <th>Health</th>
                </tr>
              </thead>
              <tbody>
                {projectHealth.map(p => {
                  const deadlineStatus = getDeadlineStatus(p.deadline)
                  const hasIssues = p.overdueModules > 0 || deadlineStatus === 'overdue'
                  const isHealthy = p.progress >= 70 && !hasIssues

                  return (
                    <tr key={p.id}>
                      <td>
                        <Link href={`/projects/${p.id}`} style={{ color: 'var(--color-text-primary)', fontWeight: 'var(--weight-medium)' }}>
                          {p.name}
                        </Link>
                        <div className="text-tiny text-dim">{p.client}</div>
                      </td>
                      <td>
                        <span className={`badge ${p.status === 'active' ? 'badge-emerald' : p.status === 'completed' ? 'badge-blue' : 'badge-amber'}`}>
                          {p.status}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                          <div className="progress-bar" style={{ width: '80px' }}>
                            <div className="progress-bar-fill" style={{ width: `${p.progress}%` }} />
                          </div>
                          <span className="text-small text-mono">{p.progress}%</span>
                        </div>
                      </td>
                      <td>
                        <span className="text-small text-mono">{p.modulesDelivered}/{p.modulesTotal}</span>
                        {p.overdueModules > 0 && (
                          <span className="badge badge-red" style={{ marginLeft: 'var(--space-1)', fontSize: '10px' }}>
                            {p.overdueModules} late
                          </span>
                        )}
                      </td>
                      <td>
                        <span className="text-small text-mono">{p.tasksDone}/{p.tasksTotal}</span>
                      </td>
                      <td>
                        <span className={`text-small ${deadlineStatus === 'overdue' ? 'text-danger' : deadlineStatus === 'urgent' ? 'text-warning' : ''}`}>
                          {formatDate(p.deadline)}
                        </span>
                      </td>
                      <td>
                        {hasIssues ? (
                          <span className="badge badge-red"><AlertTriangle size={11} /> At Risk</span>
                        ) : isHealthy ? (
                          <span className="badge badge-emerald"><CheckCircle size={11} /> Healthy</span>
                        ) : (
                          <span className="badge badge-amber"><Clock size={11} /> On Track</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
