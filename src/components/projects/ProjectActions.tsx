'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Trash2, AlertTriangle } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import DateTimePicker from '@/components/ui/DateTimePicker'
import { updateProject, deleteProject } from '@/lib/actions/data'
import styles from './ProjectActions.module.css'

interface ProjectActionsProps {
  project: {
    id: string
    name: string
    client_name: string
    client_email: string | null
    description: string | null
    deadline: string
    status: string
    is_vernacular?: boolean
  }
}

export default function ProjectActions({ project }: ProjectActionsProps) {
  const router = useRouter()
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [deleteConfirmText, setDeleteConfirmText] = useState('')

  const handleEdit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      try {
        await updateProject(project.id, formData)
        setShowEditModal(false)
      } catch (err: any) {
        setError(err.message || 'Failed to update project')
      }
    })
  }

  const handleDelete = () => {
    setError('')
    startTransition(async () => {
      try {
        await deleteProject(project.id)
        router.push('/projects')
      } catch (err: any) {
        setError(err.message || 'Failed to delete project')
      }
    })
  }

  const canDelete = deleteConfirmText.toLowerCase() === project.name.toLowerCase()

  return (
    <>
      <div className={styles.actions}>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => setShowEditModal(true)}
          id="edit-project-btn"
        >
          <Pencil size={14} /> Edit
        </button>
        <button
          className={`btn btn-ghost btn-sm ${styles.deleteBtn}`}
          onClick={() => setShowDeleteModal(true)}
          id="delete-project-btn"
        >
          <Trash2 size={14} /> Delete
        </button>
      </div>

      {/* ═══ Edit Modal ═══ */}
      <Modal
        isOpen={showEditModal}
        onClose={() => { setShowEditModal(false); setError('') }}
        title="Edit Project"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => { setShowEditModal(false); setError('') }}>Cancel</button>
            <button className="btn btn-primary" form="edit-project-form" type="submit" disabled={isPending}>
              {isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </>
        }
      >
        <form id="edit-project-form" onSubmit={handleEdit} className={styles.form}>
          {error && <div className={styles.errorBar}>{error}</div>}

          <div className="input-group">
            <label htmlFor="edit-name" className="input-label">Project Name *</label>
            <input
              id="edit-name"
              name="name"
              type="text"
              className="input-field"
              defaultValue={project.name}
              required
              autoFocus
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            <div className="input-group">
              <label htmlFor="edit-client-name" className="input-label">Client Name *</label>
              <input
                id="edit-client-name"
                name="client_name"
                type="text"
                className="input-field"
                defaultValue={project.client_name}
                required
              />
            </div>
            <div className="input-group">
              <label htmlFor="edit-client-email" className="input-label">Client Email</label>
              <input
                id="edit-client-email"
                name="client_email"
                type="email"
                className="input-field"
                defaultValue={project.client_email || ''}
              />
            </div>
          </div>

          <div className="input-group">
            <label htmlFor="edit-desc" className="input-label">Description</label>
            <textarea
              id="edit-desc"
              name="description"
              className="input-field"
              defaultValue={project.description || ''}
              rows={3}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            <div className="input-group">
              <label htmlFor="edit-deadline" className="input-label">Deadline *</label>
              <DateTimePicker
                id="edit-deadline"
                name="deadline"
                className="input-field"
                defaultValue={project.deadline}
                required
              />
            </div>
            <div className="input-group">
              <label htmlFor="edit-status" className="input-label">Status</label>
              <select
                id="edit-status"
                name="status"
                className="input-field"
                defaultValue={project.status}
              >
                <option value="active">Active</option>
                <option value="on_hold">On Hold</option>
                <option value="completed">Completed</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>

          {/* Vernacular Toggle */}
          <div className="input-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer' }}>
              <input type="checkbox" name="is_vernacular" value="true" defaultChecked={project.is_vernacular} style={{ width: 16, height: 16, accentColor: 'var(--color-accent-purple)' }} />
              <span className="input-label" style={{ margin: 0 }}>🌐 Vernacular Project</span>
            </label>
            <span className="text-tiny text-dim" style={{ marginTop: 2 }}>Enable to set language per module</span>
          </div>
        </form>
      </Modal>

      {/* ═══ Delete Confirmation Modal ═══ */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => { setShowDeleteModal(false); setDeleteConfirmText(''); setError('') }}
        title="Delete Project"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => { setShowDeleteModal(false); setDeleteConfirmText(''); setError('') }}>
              Cancel
            </button>
            <button
              className="btn btn-danger"
              onClick={handleDelete}
              disabled={!canDelete || isPending}
            >
              {isPending ? 'Deleting...' : 'Delete Project'}
            </button>
          </>
        }
      >
        <div className={styles.deleteContent}>
          {error && <div className={styles.errorBar}>{error}</div>}

          <div className={styles.deleteWarning}>
            <AlertTriangle size={20} />
            <div>
              <strong>This action cannot be undone.</strong>
              <p>This will permanently delete the project <strong>&quot;{project.name}&quot;</strong>, along with all its modules, tasks, files, and team assignments.</p>
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">
              Type <strong>{project.name}</strong> to confirm
            </label>
            <input
              type="text"
              className="input-field"
              placeholder={project.name}
              value={deleteConfirmText}
              onChange={e => setDeleteConfirmText(e.target.value)}
              autoComplete="off"
              spellCheck={false}
            />
          </div>
        </div>
      </Modal>
    </>
  )
}
