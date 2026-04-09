'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Trash2, AlertTriangle } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import DateTimePicker from '@/components/ui/DateTimePicker'
import { updateModule, deleteModule } from '@/lib/actions/data'
import { MODULE_STATUS_CONFIG } from '@/lib/utils'
import styles from './ModuleActions.module.css'

interface ModuleActionsProps {
  module: {
    id: string
    project_id: string
    title: string
    description: string | null
    assigned_to: string | null
    deadline: string
    status: string
  }
  teamMembers: any[]
}

export default function ModuleActions({ module: mod, teamMembers }: ModuleActionsProps) {
  const router = useRouter()
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  const employees = teamMembers.filter((u: any) => u.role !== 'intern')

  const handleEdit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      try {
        await updateModule(mod.id, formData)
        setShowEditModal(false)
      } catch (err: any) {
        setError(err.message || 'Failed to update module')
      }
    })
  }

  const handleDelete = () => {
    setError('')
    startTransition(async () => {
      try {
        await deleteModule(mod.id)
        router.push(`/projects/${mod.project_id}`)
      } catch (err: any) {
        setError(err.message || 'Failed to delete module')
      }
    })
  }

  const allStatuses = Object.entries(MODULE_STATUS_CONFIG).map(([key, val]) => ({
    value: key,
    label: val.label,
  }))

  return (
    <>
      <div className={styles.actions}>
        <button className="btn btn-ghost btn-sm" onClick={() => setShowEditModal(true)} id="edit-module-btn">
          <Pencil size={14} /> Edit
        </button>
        <button className={`btn btn-ghost btn-sm ${styles.deleteBtn}`} onClick={() => setShowDeleteModal(true)} id="delete-module-btn">
          <Trash2 size={14} /> Delete
        </button>
      </div>

      {/* ═══ Edit Modal ═══ */}
      <Modal
        isOpen={showEditModal}
        onClose={() => { setShowEditModal(false); setError('') }}
        title="Edit Module"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => { setShowEditModal(false); setError('') }}>Cancel</button>
            <button className="btn btn-primary" form="edit-module-form" type="submit" disabled={isPending}>
              {isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </>
        }
      >
        <form id="edit-module-form" onSubmit={handleEdit} className={styles.form}>
          {error && <div className={styles.errorBar}>{error}</div>}

          <div className="input-group">
            <label htmlFor="edit-mod-title" className="input-label">Title *</label>
            <input id="edit-mod-title" name="title" type="text" className="input-field" defaultValue={mod.title} required autoFocus />
          </div>

          <div className="input-group">
            <label htmlFor="edit-mod-desc" className="input-label">Description</label>
            <textarea id="edit-mod-desc" name="description" className="input-field" defaultValue={mod.description || ''} rows={3} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            <div className="input-group">
              <label htmlFor="edit-mod-assignee" className="input-label">Assigned To</label>
              <select id="edit-mod-assignee" name="assigned_to" className="input-field" defaultValue={mod.assigned_to || ''}>
                <option value="">Unassigned</option>
                {employees.map((u: any) => (
                  <option key={u.id} value={u.id}>{u.full_name}</option>
                ))}
              </select>
            </div>
            <div className="input-group">
              <label htmlFor="edit-mod-status" className="input-label">Status</label>
              <select id="edit-mod-status" name="status" className="input-field" defaultValue={mod.status}>
                {allStatuses.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="input-group">
            <label htmlFor="edit-mod-deadline" className="input-label">Deadline *</label>
            <DateTimePicker id="edit-mod-deadline" name="deadline" className="input-field" defaultValue={mod.deadline} required />
          </div>
        </form>
      </Modal>

      {/* ═══ Delete Modal ═══ */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => { setShowDeleteModal(false); setError('') }}
        title="Delete Module"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => { setShowDeleteModal(false); setError('') }}>Cancel</button>
            <button className="btn btn-danger" onClick={handleDelete} disabled={isPending}>
              {isPending ? 'Deleting...' : 'Delete Module'}
            </button>
          </>
        }
      >
        <div>
          {error && <div className={styles.errorBar} style={{ marginBottom: 'var(--space-3)' }}>{error}</div>}
          <div className={styles.deleteWarning}>
            <AlertTriangle size={20} />
            <div>
              <strong>This action cannot be undone.</strong>
              <p>This will permanently delete module <strong>&quot;{mod.title}&quot;</strong> and all its tasks, time entries, and files.</p>
            </div>
          </div>
        </div>
      </Modal>
    </>
  )
}
