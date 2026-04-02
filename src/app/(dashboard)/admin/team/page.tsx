import { Users, UserPlus, Shield, Award } from 'lucide-react'
import { getTeamMembers } from '@/lib/actions/data'
import { getInitials } from '@/lib/utils'
import styles from './page.module.css'

const roleConfig: Record<string, { label: string; color: string }> = {
  admin: { label: 'Admin', color: 'var(--color-accent-red)' },
  manager: { label: 'Manager', color: 'var(--color-accent-purple)' },
  employee: { label: 'Employee', color: 'var(--color-accent-blue)' },
  intern: { label: 'Intern', color: 'var(--color-accent-amber)' },
}

export default async function TeamPage() {
  const teamMembers = await getTeamMembers()
  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Team Management</h1>
          <p className="page-subtitle">{teamMembers.length} team member{teamMembers.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="btn btn-primary" id="invite-member-btn">
          <UserPlus size={16} /> Invite Member
        </button>
      </div>

      {/* Team stats */}
      <div className="grid-stats" style={{ marginBottom: 'var(--space-6)' }}>
        {(['manager', 'employee', 'intern'] as const).map(role => {
          const count = teamMembers.filter((u: any) => u.role === role).length
          const config = roleConfig[role]
          return (
            <div key={role} className="card stat-card" style={{ '--stat-color': config.color } as React.CSSProperties}>
              <div className="card-body">
                <div className="flex-row">
                  <Shield size={18} style={{ color: config.color }} />
                  <span className="text-small text-muted">{config.label}s</span>
                </div>
                <div className="stat-value">{count}</div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Team Table */}
      <div className="card">
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {teamMembers.map((user: any) => {
                const config = roleConfig[user.role]
                return (
                  <tr key={user.id}>
                    <td>
                      <div className="flex-row gap-3">
                        <div className="avatar avatar-sm">{getInitials(user.full_name)}</div>
                        <span style={{ fontWeight: 'var(--weight-medium)' }}>{user.full_name}</span>
                      </div>
                    </td>
                    <td>
                      <span className="text-small text-muted">{user.email}</span>
                    </td>
                    <td>
                      <select
                        className={styles.roleSelect}
                        defaultValue={user.role}
                        aria-label={`Role for ${user.full_name}`}
                      >
                        <option value="manager">Manager</option>
                        <option value="employee">Employee</option>
                        <option value="intern">Intern</option>
                      </select>
                    </td>
                    <td>
                      <span className="badge badge-emerald">Active</span>
                    </td>
                    <td>
                      <div className="flex-row gap-2">
                        <button className="btn btn-ghost btn-sm" title="View Profile">
                          <Award size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
