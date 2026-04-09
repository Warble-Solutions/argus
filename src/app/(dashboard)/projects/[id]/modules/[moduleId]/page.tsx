import Link from 'next/link'
import { Lock, ChevronRight } from 'lucide-react'
import { getModuleById, getTasksByModule, getProjectById, getTeamMembers } from '@/lib/actions/data'
import { getCurrentUser } from '@/lib/actions/auth'
import { MODULE_STATUS_CONFIG, formatDate, getDaysUntil, getDeadlineStatus, getInitials, formatMinutes } from '@/lib/utils'
import TaskSection from '@/components/tasks/TaskSection'
import ModuleActions from '@/components/projects/ModuleActions'
import ModuleFiles from '@/components/projects/ModuleFiles'
import styles from './page.module.css'

export default async function ModuleDetailPage({ params }: { params: Promise<{ id: string; moduleId: string }> }) {
  const { id, moduleId } = await params
  const mod = await getModuleById(moduleId)
  const project = await getProjectById(id)
  const currentUser = await getCurrentUser()

  if (!mod || !project) {
    return (
      <div className="page-container">
        <div className="empty-state">
          <h2 className="empty-state-title">Module not found</h2>
          <Link href="/projects" className="btn btn-primary">Back to Projects</Link>
        </div>
      </div>
    )
  }

  const tasks = await getTasksByModule(moduleId)
  const teamMembers = await getTeamMembers()
  const statusConfig = MODULE_STATUS_CONFIG[mod.status as keyof typeof MODULE_STATUS_CONFIG] || { label: mod.status, cssClass: 'badge-neutral' }
  const assigneeName = mod.profiles?.full_name
  const deadlineStatus = getDeadlineStatus(mod.deadline)
  const daysLeft = getDaysUntil(mod.deadline)
  const totalMinutes = tasks.reduce((sum: number, t: any) => sum + (t.time_spent_minutes || 0), 0)

  return (
    <div className="page-container">
      {/* Breadcrumb */}
      <div className={styles.breadcrumb}>
        <Link href="/projects">Projects</Link>
        <ChevronRight size={14} />
        <Link href={`/projects/${project.id}`}>{project.name}</Link>
        <ChevronRight size={14} />
        <span>Module {mod.module_number}</span>
      </div>

      {/* Module Header */}
      <div className={styles.moduleHeader}>
        <div className={styles.moduleTitle}>
          <div className={styles.moduleNumber}>{String(mod.module_number).padStart(2, '0')}</div>
          <div>
            <h1 className="page-title">{mod.title}</h1>
            {mod.description && <p className="page-subtitle">{mod.description}</p>}
          </div>
        </div>
        <div className={styles.moduleActions}>
          <span className={`badge ${statusConfig.cssClass}`}>{statusConfig.label}</span>
          {mod.stage_gate_pending && (
            <span className={`badge badge-amber ${styles.gateTag}`}>
              <Lock size={12} /> Gate Pending
            </span>
          )}
          <ModuleActions module={{
            id: mod.id,
            project_id: project.id,
            title: mod.title,
            description: mod.description,
            assigned_to: mod.assigned_to,
            deadline: mod.deadline,
            status: mod.status,
          }} teamMembers={teamMembers} />
        </div>
      </div>

      {/* Info Bar */}
      <div className={styles.infoBar}>
        <div className={styles.infoItem}>
          <span className="text-tiny text-dim">Assigned To</span>
          {assigneeName ? (
            <div className="flex-row gap-2">
              <div className="avatar avatar-sm">{getInitials(assigneeName)}</div>
              <span className="text-small">{assigneeName}</span>
            </div>
          ) : (
            <span className="text-dim">Unassigned</span>
          )}
        </div>
        <div className={styles.infoItem}>
          <span className="text-tiny text-dim">Deadline</span>
          <span className={`text-small ${deadlineStatus === 'overdue' ? 'text-danger' : deadlineStatus === 'urgent' ? 'text-warning' : ''}`}>
            {formatDate(mod.deadline)} ({daysLeft < 0 ? `${Math.abs(daysLeft)}d late` : `${daysLeft}d left`})
          </span>
        </div>
        <div className={styles.infoItem}>
          <span className="text-tiny text-dim">Version</span>
          <span className="text-small text-mono">v{mod.current_version}</span>
        </div>
        <div className={styles.infoItem}>
          <span className="text-tiny text-dim">Revisions</span>
          <span className="text-small text-mono">{mod.revision_count}</span>
        </div>
        <div className={styles.infoItem}>
          <span className="text-tiny text-dim">Tasks</span>
          <span className="text-small text-mono">{tasks.filter((t: any) => t.status === 'done').length}/{tasks.length}</span>
        </div>
      </div>

      {/* Main Grid */}
      <div className={styles.moduleGrid}>
        {/* Tasks Section */}
        <div className={`card ${styles.tasksSection}`}>
          <TaskSection
            tasks={tasks}
            moduleId={moduleId}
            userRole={currentUser?.role || 'employee'}
            teamMembers={teamMembers}
          />
        </div>

        {/* Right Column */}
        <div className={styles.rightColumn}>
          {/* Files */}
          <ModuleFiles projectId={id} moduleId={moduleId} />

          {/* Time Summary */}
          <div className={`card ${styles.filesSection}`}>
            <div className="card-header">
              <h2 className="card-title">⏱ Time Tracked</h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', padding: 'var(--space-2) 0' }}>
              <div className="flex-between">
                <span className="text-small text-muted">Total logged</span>
                <span className="text-small text-mono" style={{ fontWeight: 'var(--weight-semibold)' }}>{formatMinutes(totalMinutes)}</span>
              </div>
              <div className="flex-between">
                <span className="text-small text-muted">Tasks tracked</span>
                <span className="text-small text-mono">{tasks.filter((t: any) => (t.time_spent_minutes || 0) > 0).length}/{tasks.length}</span>
              </div>
            </div>
            <p className="text-tiny text-dim" style={{ marginTop: 'var(--space-2)' }}>
              Use the ▶ button on each task to start tracking time.
            </p>
          </div>

          {/* Activity Log */}
          <div className={`card ${styles.activitySection}`}>
            <div className="card-header">
              <h2 className="card-title">📜 Activity</h2>
            </div>
            <div className={styles.activityList}>
              <p className="text-small text-muted" style={{ padding: 'var(--space-4) 0' }}>Activity will appear here as changes are made</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
