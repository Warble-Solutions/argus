'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Plus, Lock, FolderOpen } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import DateTimePicker from '@/components/ui/DateTimePicker'
import { createModule } from '@/lib/actions/data'
import { MODULE_STATUS_CONFIG, formatDate, getDaysUntil, getDeadlineStatus, getInitials } from '@/lib/utils'
import styles from './ModulesTable.module.css'

interface ModulesTableProps {
  modules: any[]
  projectId: string
  nextModuleNumber: number
  teamMembers: any[]
}

export default function ModulesTable({ modules, projectId, nextModuleNumber, teamMembers }: ModulesTableProps) {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  const employees = teamMembers.filter((u: any) => u.role !== 'intern')

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    const formData = new FormData(e.currentTarget)
    formData.append('project_id', projectId)
    formData.append('module_number', String(nextModuleNumber))

    startTransition(async () => {
      try {
        await createModule(formData)
        setShowCreateModal(false)
      } catch (err: any) {
        setError(err.message || 'Failed to create module')
      }
    })
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
        <h2 className="heading-3">Modules</h2>
        <button className="btn btn-primary btn-sm" id="add-module-btn" onClick={() => setShowCreateModal(true)}>
          <Plus size={14} /> Add Module
        </button>
      </div>

      {modules.length === 0 ? (
        <div className="empty-state" style={{ padding: 'var(--space-8) 0' }}>
          <FolderOpen size={40} className="empty-state-icon" />
          <p className="empty-state-title">No modules yet</p>
          <p className="empty-state-desc">Click &quot;Add Module&quot; to create the first module for this project</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>#</th>
                <th>Title</th>
                <th>Status</th>
                <th>Assigned To</th>
                <th>Deadline</th>
                <th>Version</th>
                <th>Revisions</th>
              </tr>
            </thead>
            <tbody>
              {modules.map((mod: any) => {
                const statusConfig = MODULE_STATUS_CONFIG[mod.status as keyof typeof MODULE_STATUS_CONFIG] || { label: mod.status, cssClass: 'badge-neutral' }
                const assigneeName = mod.profiles?.full_name
                const deadlineStatus = getDeadlineStatus(mod.deadline)
                const daysLeft = getDaysUntil(mod.deadline)

                return (
                  <tr key={mod.id}>
                    <td>
                      <span className="text-mono" style={{ color: 'var(--color-text-muted)' }}>
                        {String(mod.module_number).padStart(2, '0')}
                      </span>
                    </td>
                    <td>
                      <Link href={`/projects/${projectId}/modules/${mod.id}`} className={styles.moduleLink}>
                        {mod.title}
                        {mod.stage_gate_pending && <Lock size={13} className={styles.lockIcon} />}
                      </Link>
                    </td>
                    <td>
                      <span className={`badge ${statusConfig.cssClass}`}>{statusConfig.label}</span>
                    </td>
                    <td>
                      {assigneeName ? (
                        <div className="flex-row gap-2">
                          <div className="avatar avatar-sm">{getInitials(assigneeName)}</div>
                          <span className="text-small">{assigneeName}</span>
                        </div>
                      ) : (
                        <span className="text-dim">Unassigned</span>
                      )}
                    </td>
                    <td>
                      <span className={`text-small ${deadlineStatus === 'overdue' ? styles.overdue : deadlineStatus === 'urgent' ? styles.urgent : ''}`}>
                        {formatDate(mod.deadline)}
                        {daysLeft <= 2 && mod.status !== 'approved' && mod.status !== 'delivered' && (
                          <span className={styles.daysTag}>
                            {daysLeft < 0 ? `${Math.abs(daysLeft)}d late` : daysLeft === 0 ? 'Today' : `${daysLeft}d`}
                          </span>
                        )}
                      </span>
                    </td>
                    <td><span className="text-mono text-small">v{mod.current_version}</span></td>
                    <td>
                      <span className={`text-mono text-small ${mod.revision_count > 1 ? styles.highRevisions : ''}`}>
                        {mod.revision_count}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Module Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Add New Module"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setShowCreateModal(false)}>Cancel</button>
            <button className="btn btn-primary" form="create-module-form" type="submit" disabled={isPending}>
              {isPending ? 'Creating...' : 'Create Module'}
            </button>
          </>
        }
      >
        <form id="create-module-form" onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {error && <div style={{ padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)', color: '#f87171', fontSize: 'var(--text-sm)' }}>{error}</div>}
          <div className="input-group">
            <label htmlFor="module-number" className="input-label">Module Number</label>
            <input id="module-number" type="text" className="input-field" value={`Module ${nextModuleNumber}`} readOnly style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }} />
          </div>
          <div className="input-group">
            <label htmlFor="module-title" className="input-label">Title *</label>
            <input id="module-title" name="title" type="text" className="input-field" placeholder="e.g. Emergency Evacuation Procedures" required autoFocus />
          </div>
          <div className="input-group">
            <label htmlFor="module-desc" className="input-label">Description</label>
            <textarea id="module-desc" name="description" className="input-field" placeholder="Brief module description..." rows={3} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            <div className="input-group">
              <label htmlFor="module-assignee" className="input-label">Assign To</label>
              <select id="module-assignee" name="assigned_to" className="input-field">
                <option value="">Select team member</option>
                {employees.map((u: any) => (
                  <option key={u.id} value={u.id}>{u.full_name}</option>
                ))}
              </select>
            </div>
            <div className="input-group">
              <label htmlFor="module-deadline" className="input-label">Deadline *</label>
              <DateTimePicker id="module-deadline" name="deadline" className="input-field" required />
            </div>
          </div>
        </form>
      </Modal>
    </>
  )
}
