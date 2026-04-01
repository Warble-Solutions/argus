'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, Lock } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import { getUserById, mockUsers } from '@/lib/mock-data'
import { MODULE_STATUS_CONFIG, formatDate, getDaysUntil, getDeadlineStatus, getInitials } from '@/lib/utils'
import type { Module } from '@/types'
import styles from './ModulesTable.module.css'

interface ModulesTableProps {
  modules: Module[]
  projectId: string
  nextModuleNumber: number
}

export default function ModulesTable({ modules, projectId, nextModuleNumber }: ModulesTableProps) {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assigned_to: '',
    deadline: '',
  })

  const employees = mockUsers.filter(u => u.role !== 'intern')

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    alert(`Module "${formData.title}" (Module #${nextModuleNumber}) would be created.\n\nThis will work once Supabase is connected.`)
    setShowCreateModal(false)
    setFormData({ title: '', description: '', assigned_to: '', deadline: '' })
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
        <h2 className="heading-3">Modules</h2>
        <button className="btn btn-primary btn-sm" id="add-module-btn" onClick={() => setShowCreateModal(true)}>
          <Plus size={14} /> Add Module
        </button>
      </div>

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
            {modules.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--color-text-muted)' }}>
                  No modules yet. Click &quot;Add Module&quot; to create one.
                </td>
              </tr>
            ) : (
              modules.map((mod) => {
                const statusConfig = MODULE_STATUS_CONFIG[mod.status]
                const assignee = getUserById(mod.assigned_to)
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
                      <Link
                        href={`/projects/${projectId}/modules/${mod.id}`}
                        className={styles.moduleLink}
                      >
                        {mod.title}
                        {mod.stage_gate_pending && (
                          <Lock size={13} className={styles.lockIcon} />
                        )}
                      </Link>
                    </td>
                    <td>
                      <span className={`badge ${statusConfig.cssClass}`}>
                        {statusConfig.label}
                      </span>
                    </td>
                    <td>
                      {assignee ? (
                        <div className="flex-row gap-2">
                          <div className="avatar avatar-sm">{getInitials(assignee.full_name)}</div>
                          <span className="text-small">{assignee.full_name}</span>
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
                    <td>
                      <span className="text-mono text-small">v{mod.current_version}</span>
                    </td>
                    <td>
                      <span className={`text-mono text-small ${mod.revision_count > 1 ? styles.highRevisions : ''}`}>
                        {mod.revision_count}
                      </span>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Create Module Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Add New Module"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setShowCreateModal(false)}>Cancel</button>
            <button className="btn btn-primary" form="create-module-form" type="submit">Create Module</button>
          </>
        }
      >
        <form id="create-module-form" onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div className="input-group">
            <label htmlFor="module-number" className="input-label">Module Number</label>
            <input
              id="module-number"
              type="text"
              className="input-field"
              value={`Module ${nextModuleNumber}`}
              readOnly
              style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}
            />
          </div>
          <div className="input-group">
            <label htmlFor="module-title" className="input-label">Title *</label>
            <input
              id="module-title"
              type="text"
              className="input-field"
              placeholder="e.g. Emergency Evacuation Procedures"
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
              required
              autoFocus
            />
          </div>
          <div className="input-group">
            <label htmlFor="module-desc" className="input-label">Description</label>
            <textarea
              id="module-desc"
              className="input-field"
              placeholder="Brief module description..."
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            <div className="input-group">
              <label htmlFor="module-assignee" className="input-label">Assign To</label>
              <select
                id="module-assignee"
                className="input-field"
                value={formData.assigned_to}
                onChange={e => setFormData({ ...formData, assigned_to: e.target.value })}
              >
                <option value="">Select team member</option>
                {employees.map(u => (
                  <option key={u.id} value={u.id}>{u.full_name}</option>
                ))}
              </select>
            </div>
            <div className="input-group">
              <label htmlFor="module-deadline" className="input-label">Deadline *</label>
              <input
                id="module-deadline"
                type="date"
                className="input-field"
                value={formData.deadline}
                onChange={e => setFormData({ ...formData, deadline: e.target.value })}
                required
              />
            </div>
          </div>
        </form>
      </Modal>
    </>
  )
}
