'use client'

import { useState, useTransition, useMemo, useRef, useEffect } from 'react'
import Link from 'next/link'
import { Users, UserPlus, Search, X, Shield, Trash2 } from 'lucide-react'
import { addProjectMember, removeProjectMember } from '@/lib/actions/data'
import { getInitials } from '@/lib/utils'
import styles from './ProjectTeam.module.css'

interface ProjectMember {
  id: string
  user_id: string
  project_role: string
  profiles: {
    id: string
    full_name: string
    email: string
    role: string
  }
}

interface TeamMember {
  id: string
  full_name: string
  email: string
  role: string
}

interface ProjectTeamProps {
  projectId: string
  members: ProjectMember[]
  allTeamMembers: TeamMember[]
}

const projectRoleLabels: Record<string, { label: string, emoji: string, cls: string }> = {
  lead: { label: 'Lead', emoji: '🛡️', cls: 'badge-amber' },
  member: { label: 'Member', emoji: '👤', cls: 'badge-blue' },
  intern: { label: 'Intern', emoji: '🎓', cls: 'badge-purple' },
}

export default function ProjectTeam({ projectId, members, allTeamMembers }: ProjectTeamProps) {
  const [showAdd, setShowAdd] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedRole, setSelectedRole] = useState('member')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  const existingIds = new Set(members.map(m => m.user_id))
  const available = useMemo(() =>
    allTeamMembers.filter(m =>
      !existingIds.has(m.id) &&
      (m.full_name.toLowerCase().includes(search.toLowerCase()) ||
       m.email.toLowerCase().includes(search.toLowerCase()))
    ), [allTeamMembers, existingIds, search])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowAdd(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleAdd = (userId: string) => {
    setError('')
    startTransition(async () => {
      try {
        await addProjectMember(projectId, userId, selectedRole)
        setSearch('')
        setShowAdd(false)
      } catch (err: any) {
        setError(err.message)
      }
    })
  }

  const handleRemove = (userId: string) => {
    setError('')
    startTransition(async () => {
      try {
        await removeProjectMember(projectId, userId)
      } catch (err: any) {
        setError(err.message)
      }
    })
  }

  const roleColors: Record<string, string> = {
    admin: 'badge-red',
    manager: 'badge-amber',
    employee: 'badge-blue',
    intern: 'badge-purple',
  }

  return (
    <div className={styles.teamSection}>
      <div className={styles.teamHeader}>
        <h2 className={styles.teamTitle}><Users size={18} /> Team ({members.length})</h2>
        <button className="btn btn-ghost btn-sm" onClick={() => setShowAdd(!showAdd)}>
          <UserPlus size={14} /> Add Member
        </button>
      </div>

      {error && (
        <div className={styles.errorBar}>{error}</div>
      )}

      {/* Add Member Dropdown */}
      {showAdd && (
        <div className={styles.addPanel} ref={dropdownRef}>
          <div className={styles.addRow}>
            <div className={styles.searchWrap}>
              <Search size={14} className={styles.searchIcon} />
              <input
                type="text"
                className="input-field"
                placeholder="Search by name or email..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                autoFocus
                style={{ paddingLeft: 'var(--space-8)', fontSize: 'var(--text-sm)' }}
              />
            </div>
            <select
              className={styles.roleSelect}
              value={selectedRole}
              onChange={e => setSelectedRole(e.target.value)}
            >
              <option value="lead">Lead</option>
              <option value="member">Member</option>
              <option value="intern">Intern</option>
            </select>
          </div>
          <div className={styles.addList}>
            {available.length === 0 ? (
              <div className={styles.addEmpty}>
                {search ? 'No matches' : 'All members assigned'}
              </div>
            ) : (
              available.slice(0, 5).map(m => (
                <button
                  key={m.id}
                  className={styles.addItem}
                  onClick={() => handleAdd(m.id)}
                  disabled={isPending}
                >
                  <div className="avatar avatar-sm">{getInitials(m.full_name)}</div>
                  <div className={styles.addInfo}>
                    <span className={styles.addName}>{m.full_name}</span>
                    <span className={styles.addEmail}>{m.email}</span>
                  </div>
                  <span className={`badge ${roleColors[m.role] || 'badge-neutral'}`}>{m.role}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* Members List */}
      {members.length === 0 ? (
        <p className="text-small text-muted" style={{ padding: 'var(--space-4) 0' }}>
          No team members assigned yet. Click &ldquo;Add Member&rdquo; to get started.
        </p>
      ) : (
        <div className={styles.memberList}>
          {members.map(m => {
            const profile = m.profiles as any
            if (!profile) return null
            const pRole = projectRoleLabels[m.project_role] || projectRoleLabels.member
            return (
              <div key={m.id} className={styles.memberItem}>
                <Link href={`/admin/team/${profile.id}`} className={styles.memberLink}>
                  <div className="avatar avatar-sm">{getInitials(profile.full_name)}</div>
                  <div className={styles.memberInfo}>
                    <span className={styles.memberName}>{profile.full_name}</span>
                    <span className={styles.memberEmail}>{profile.email}</span>
                  </div>
                </Link>
                <span className={`badge ${pRole.cls}`}>{pRole.emoji} {pRole.label}</span>
                <button
                  className={styles.removeBtn}
                  onClick={() => handleRemove(m.user_id)}
                  disabled={isPending}
                  title="Remove from project"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
