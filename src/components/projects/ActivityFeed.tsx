import { getModuleActivity } from '@/lib/actions/data'
import { getInitials } from '@/lib/utils'
import styles from './ActivityFeed.module.css'

const ACTION_CONFIG: Record<string, { icon: string; color: string }> = {
  task_created: { icon: '➕', color: 'var(--color-accent-emerald)' },
  task_completed: { icon: '✅', color: 'var(--color-accent-emerald)' },
  task_deleted: { icon: '🗑️', color: 'var(--color-accent-red)' },
  task_updated: { icon: '✏️', color: 'var(--color-accent-blue)' },
  task_status_changed: { icon: '🔄', color: 'var(--color-accent-amber)' },
  module_updated: { icon: '📦', color: 'var(--color-accent-blue)' },
  time_logged: { icon: '⏱', color: 'var(--color-accent-cyan)' },
  file_uploaded: { icon: '📎', color: 'var(--color-accent-blue)' },
  file_deleted: { icon: '🗑️', color: 'var(--color-accent-red)' },
}

function timeAgo(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHrs = Math.floor(diffMins / 60)
  if (diffHrs < 24) return `${diffHrs}h ago`
  const diffDays = Math.floor(diffHrs / 24)
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

interface ActivityFeedProps {
  moduleId: string
}

export default async function ActivityFeed({ moduleId }: ActivityFeedProps) {
  const activities = await getModuleActivity(moduleId)

  return (
    <div className={`card ${styles.activityCard}`}>
      <div className="card-header">
        <h2 className="card-title">📜 Activity</h2>
        {activities.length > 0 && (
          <span className="text-tiny text-dim">{activities.length} events</span>
        )}
      </div>
      <div className={styles.activityList}>
        {activities.length === 0 ? (
          <p className="text-small text-muted" style={{ padding: 'var(--space-4) 0', textAlign: 'center' }}>
            Activity will appear here as changes are made
          </p>
        ) : (
          activities.map((entry: any) => {
            const config = ACTION_CONFIG[entry.action] || { icon: '•', color: 'var(--color-text-muted)' }
            const userName = entry.profiles?.full_name || 'Unknown'

            return (
              <div key={entry.id} className={styles.activityItem}>
                <div className={styles.activityIcon}>
                  <span>{config.icon}</span>
                </div>
                <div className={styles.activityContent}>
                  <p className={styles.activityText}>
                    <strong>{userName}</strong>{' '}
                    {entry.description}
                  </p>
                  <span className={styles.activityTime}>{timeAgo(entry.created_at)}</span>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
