import Link from 'next/link'
import { Upload, Lock, ChevronRight } from 'lucide-react'
import { getModuleById, getTasksByModule, getProjectById, getUserById, mockActivityLog, currentUser } from '@/lib/mock-data'
import { MODULE_STATUS_CONFIG, formatDate, formatRelativeDate, getDaysUntil, getDeadlineStatus, getInitials } from '@/lib/utils'
import TaskSection from '@/components/tasks/TaskSection'
import TimeTracker from '@/components/time/TimeTracker'
import styles from './page.module.css'

export default async function ModuleDetailPage({ params }: { params: Promise<{ id: string; moduleId: string }> }) {
  const { id, moduleId } = await params
  const mod = getModuleById(moduleId)
  const project = getProjectById(id)
  const tasks = getTasksByModule(moduleId)

  if (!mod || !project) {
    return (
      <div className="page-container">
        <div className="empty-state">
          <h2 className="empty-state-title">Module not found</h2>
          <Link href={`/projects/${id}`} className="btn btn-primary">Back to Project</Link>
        </div>
      </div>
    )
  }

  const statusConfig = MODULE_STATUS_CONFIG[mod.status]
  const assignee = getUserById(mod.assigned_to)
  const deadlineStatus = getDeadlineStatus(mod.deadline)
  const daysLeft = getDaysUntil(mod.deadline)
  const completedTasks = tasks.filter(t => t.status === 'done').length

  // Get relevant activity
  const moduleActivity = mockActivityLog.filter(a => a.module_id === moduleId).slice(0, 5)

  return (
    <div className="page-container">
      {/* Breadcrumb */}
      <div className={styles.breadcrumb}>
        <Link href="/projects" className={styles.breadcrumbLink}>Projects</Link>
        <ChevronRight size={14} />
        <Link href={`/projects/${id}`} className={styles.breadcrumbLink}>{project.name}</Link>
        <ChevronRight size={14} />
        <span className={styles.breadcrumbCurrent}>Module {mod.module_number}</span>
      </div>

      {/* Module Header */}
      <div className={styles.moduleHeader}>
        <div className={styles.headerLeft}>
          <div className={styles.moduleNumberBadge}>
            {String(mod.module_number).padStart(2, '0')}
          </div>
          <div>
            <h1 className="page-title">{mod.title}</h1>
            <p className="page-subtitle">{mod.description}</p>
          </div>
        </div>
        <div className={styles.headerRight}>
          <span className={`badge ${statusConfig.cssClass}`} style={{ fontSize: 'var(--text-sm)', padding: '4px 12px' }}>
            {statusConfig.label}
          </span>
          {mod.stage_gate_pending && (
            <span className="badge badge-amber" style={{ fontSize: 'var(--text-sm)', padding: '4px 12px' }}>
              <Lock size={13} /> Gate Pending
            </span>
          )}
        </div>
      </div>

      {/* Info Bar */}
      <div className={styles.infoBar}>
        <div className={styles.infoItem}>
          <span className="text-tiny text-dim">Assigned To</span>
          {assignee ? (
            <div className="flex-row gap-2">
              <div className="avatar avatar-sm">{getInitials(assignee.full_name)}</div>
              <span className="text-small">{assignee.full_name}</span>
            </div>
          ) : <span className="text-dim">Unassigned</span>}
        </div>
        <div className={styles.infoItem}>
          <span className="text-tiny text-dim">Deadline</span>
          <span className={`text-small ${deadlineStatus === 'overdue' ? styles.overdue : deadlineStatus === 'urgent' ? styles.urgent : ''}`}>
            {formatDate(mod.deadline)} ({daysLeft < 0 ? `${Math.abs(daysLeft)}d overdue` : `${daysLeft}d left`})
          </span>
        </div>
        <div className={styles.infoItem}>
          <span className="text-tiny text-dim">Version</span>
          <span className="text-small text-mono">v{mod.current_version}</span>
        </div>
        <div className={styles.infoItem}>
          <span className="text-tiny text-dim">Revisions</span>
          <span className={`text-small text-mono ${mod.revision_count > 1 ? styles.overdue : ''}`}>{mod.revision_count}</span>
        </div>
        <div className={styles.infoItem}>
          <span className="text-tiny text-dim">Tasks</span>
          <span className="text-small text-mono">{completedTasks}/{tasks.length}</span>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className={styles.moduleGrid}>
        {/* Tasks Section — Client Component */}
        <div className={`card ${styles.tasksSection}`}>
          <TaskSection tasks={tasks} moduleId={moduleId} userRole={currentUser.role} />
        </div>

        {/* Right Column */}
        <div className={styles.rightColumn}>
          {/* Files Section */}
          <div className={`card ${styles.filesSection}`}>
            <div className="card-header">
              <h2 className="card-title">📁 Files</h2>
              <button className="btn btn-ghost btn-sm" id="upload-file-btn">
                <Upload size={14} /> Upload
              </button>
            </div>
            <div className={styles.uploadZone}>
              <Upload size={28} style={{ color: 'var(--color-text-muted)', opacity: 0.5 }} />
              <p className="text-small text-muted">Drag files here or click Upload</p>
              <p className="text-tiny text-dim">Files will be uploaded to Google Drive</p>
            </div>
          </div>

          {/* Time Tracking — Client Component */}
          <TimeTracker moduleId={moduleId} totalMinutes={tasks.reduce((sum, t) => sum + t.time_spent_minutes, 0)} />

          {/* Activity Log */}
          <div className={`card ${styles.activitySection}`}>
            <div className="card-header">
              <h2 className="card-title">📜 Activity</h2>
            </div>
            <div className={styles.activityList}>
              {moduleActivity.length === 0 ? (
                <p className="text-small text-muted" style={{ padding: 'var(--space-4) 0' }}>No activity yet</p>
              ) : (
                moduleActivity.map(entry => (
                  <div key={entry.id} className={styles.activityItem}>
                    <div className={styles.activityDot} />
                    <div className={styles.activityContent}>
                      <p className="text-small">{entry.description}</p>
                      <span className="text-tiny text-dim">{formatRelativeDate(entry.created_at)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
