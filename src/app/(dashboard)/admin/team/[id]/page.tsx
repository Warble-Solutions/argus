import Link from 'next/link'
import { ArrowLeft, Mail, Shield, FolderKanban, CheckSquare, Calendar, Clock } from 'lucide-react'
import { getMemberProfile } from '@/lib/actions/data'
import { getCurrentUser } from '@/lib/actions/auth'
import { getInitials, formatDate } from '@/lib/utils'
import RoleChanger from '@/components/admin/RoleChanger'
import styles from './page.module.css'

const roleConfig: Record<string, { label: string; color: string; badge: string }> = {
  admin: { label: 'Admin', color: 'var(--color-accent-red)', badge: 'badge-red' },
  manager: { label: 'Manager', color: 'var(--color-accent-purple)', badge: 'badge-purple' },
  employee: { label: 'Employee', color: 'var(--color-accent-blue)', badge: 'badge-blue' },
  intern: { label: 'Intern', color: 'var(--color-accent-amber)', badge: 'badge-amber' },
}

const statusBadge: Record<string, { label: string; cls: string }> = {
  active: { label: 'Active', cls: 'badge-emerald' },
  on_hold: { label: 'On Hold', cls: 'badge-amber' },
  completed: { label: 'Completed', cls: 'badge-blue' },
  todo: { label: 'To Do', cls: 'badge-neutral' },
  in_progress: { label: 'In Progress', cls: 'badge-blue' },
  done: { label: 'Done', cls: 'badge-emerald' },
  blocked: { label: 'Blocked', cls: 'badge-red' },
  pending_review: { label: 'Pending Review', cls: 'badge-amber' },
  revision: { label: 'Revision', cls: 'badge-purple' },
}

const projectRoleLabels: Record<string, string> = {
  lead: '🛡️ Lead',
  member: '👤 Member',
  intern: '🎓 Intern',
}

export default async function MemberProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { profile, projects, recentTasks } = await getMemberProfile(id)
  const currentUser = await getCurrentUser()
  const config = roleConfig[profile.role] || roleConfig.employee
  const isAdmin = currentUser?.role === 'admin'
  const isSelf = currentUser?.id === id

  const tasksTotal = recentTasks.length
  const tasksDone = recentTasks.filter((t: any) => t.status === 'done').length
  const tasksInProgress = recentTasks.filter((t: any) => t.status === 'in_progress').length

  return (
    <div className="page-container">
      {/* Back link */}
      <Link href="/admin/team" className={styles.backLink}>
        <ArrowLeft size={16} /> Back to Team
      </Link>

      {/* Profile Header */}
      <div className={styles.profileHeader}>
        <div className={styles.avatarLarge} style={{ '--accent': config.color } as React.CSSProperties}>
          {getInitials(profile.full_name)}
        </div>
        <div className={styles.headerInfo}>
          <h1 className={styles.profileName}>{profile.full_name}</h1>
          <div className={styles.profileMeta}>
            <span className={`badge ${config.badge}`}>{config.label}</span>
            <span className={styles.profileEmail}>
              <Mail size={14} /> {profile.email}
            </span>
          </div>
          <p className={styles.joinDate}>
            <Calendar size={12} /> Joined {formatDate(profile.created_at)}
          </p>
          {isAdmin && !isSelf && (
            <RoleChanger memberId={id} currentRole={profile.role} isAdmin={isAdmin} />
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid-stats" style={{ marginBottom: 'var(--space-6)' }}>
        <div className="card stat-card" style={{ '--stat-color': 'var(--color-accent-blue)' } as React.CSSProperties}>
          <div className="card-body">
            <div className="flex-row"><FolderKanban size={18} style={{ color: 'var(--color-accent-blue)' }} /><span className="text-small text-muted">Projects</span></div>
            <div className="stat-value">{projects.length}</div>
          </div>
        </div>
        <div className="card stat-card" style={{ '--stat-color': 'var(--color-accent-emerald)' } as React.CSSProperties}>
          <div className="card-body">
            <div className="flex-row"><CheckSquare size={18} style={{ color: 'var(--color-accent-emerald)' }} /><span className="text-small text-muted">Tasks Done</span></div>
            <div className="stat-value">{tasksDone}</div>
          </div>
        </div>
        <div className="card stat-card" style={{ '--stat-color': 'var(--color-accent-cyan)' } as React.CSSProperties}>
          <div className="card-body">
            <div className="flex-row"><Clock size={18} style={{ color: 'var(--color-accent-cyan)' }} /><span className="text-small text-muted">In Progress</span></div>
            <div className="stat-value">{tasksInProgress}</div>
          </div>
        </div>
      </div>

      <div className={styles.contentGrid}>
        {/* Projects Section */}
        <div className="card">
          <div className="card-body">
            <h2 className={styles.sectionTitle}><FolderKanban size={18} /> Assigned Projects</h2>
            {projects.length === 0 ? (
              <p className="text-small text-muted" style={{ padding: 'var(--space-4) 0' }}>Not assigned to any projects yet</p>
            ) : (
              <div className={styles.projectList}>
                {projects.map((pm: any) => {
                  const proj = pm.projects as any
                  if (!proj) return null
                  return (
                    <Link key={pm.project_id} href={`/projects/${proj.id}`} className={styles.projectItem}>
                      <div className={styles.projectInfo}>
                        <span className={styles.projectName}>{proj.name}</span>
                        <span className="text-tiny text-dim">{proj.client_name}</span>
                      </div>
                      <span className={styles.projectRole}>{projectRoleLabels[pm.role] || pm.role}</span>
                      <span className={`badge ${statusBadge[proj.status]?.cls || 'badge-neutral'}`}>
                        {statusBadge[proj.status]?.label || proj.status}
                      </span>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Recent Tasks Section */}
        <div className="card">
          <div className="card-body">
            <h2 className={styles.sectionTitle}><CheckSquare size={18} /> Recent Tasks</h2>
            {recentTasks.length === 0 ? (
              <p className="text-small text-muted" style={{ padding: 'var(--space-4) 0' }}>No tasks assigned yet</p>
            ) : (
              <div className={styles.taskList}>
                {recentTasks.map((task: any) => {
                  const mod = task.modules as any
                  const projName = mod?.projects?.name || ''
                  return (
                    <Link
                      key={task.id}
                      href={`/projects/${mod?.project_id}/modules/${task.module_id}`}
                      className={styles.taskItem}
                    >
                      <div className={styles.taskInfo}>
                        <span className={styles.taskTitle}>{task.title}</span>
                        <span className="text-tiny text-dim">{projName} {mod?.title ? `· ${mod.title}` : ''}</span>
                      </div>
                      <span className={`badge ${statusBadge[task.status]?.cls || 'badge-neutral'}`}>
                        {statusBadge[task.status]?.label || task.status}
                      </span>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
