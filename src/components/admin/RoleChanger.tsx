'use client'

import { useState, useTransition } from 'react'
import { Shield } from 'lucide-react'
import { updateMemberRole } from '@/lib/actions/auth'

interface RoleChangerProps {
  memberId: string
  currentRole: string
  isAdmin: boolean
}

const roles = [
  { value: 'admin', label: 'Admin', badge: 'badge-red' },
  { value: 'manager', label: 'Manager', badge: 'badge-purple' },
  { value: 'employee', label: 'Employee', badge: 'badge-blue' },
  { value: 'intern', label: 'Intern', badge: 'badge-amber' },
]

export default function RoleChanger({ memberId, currentRole, isAdmin }: RoleChangerProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  if (!isAdmin) return null

  const handleChange = (newRole: string) => {
    if (newRole === currentRole) return
    setError('')
    setSuccess(false)

    startTransition(async () => {
      try {
        await updateMemberRole(memberId, newRole)
        setSuccess(true)
        setTimeout(() => setSuccess(false), 2000)
      } catch (err: any) {
        setError(err.message || 'Failed to update role')
      }
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
        <Shield size={14} style={{ color: 'var(--color-text-muted)' }} />
        <span className="text-tiny text-dim">Change Role</span>
      </div>
      <select
        defaultValue={currentRole}
        onChange={(e) => handleChange(e.target.value)}
        disabled={isPending}
        className="input-field"
        style={{ fontSize: 'var(--text-sm)', padding: 'var(--space-2) var(--space-3)' }}
      >
        {roles.map(r => (
          <option key={r.value} value={r.value}>{r.label}</option>
        ))}
      </select>
      {error && <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-accent-red)' }}>{error}</span>}
      {success && <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-accent-emerald)' }}>✓ Role updated</span>}
    </div>
  )
}
