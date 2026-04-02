'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Plus, ArrowRight, Calendar, FolderKanban } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import { createProject } from '@/lib/actions/data'
import { formatDate, getDeadlineStatus, getInitials } from '@/lib/utils'
import styles from './page.module.css'

interface Project {
  id: string
  name: string
  client_name: string
  status: string
  deadline: string
  progress: number
  modules_count: number
  completed_modules: number
  profiles?: { full_name: string } | null
}

interface ProjectsClientProps {
  projects: Project[]
}

export default function ProjectsClient({ projects }: ProjectsClientProps) {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      try {
        await createProject(formData)
        setShowCreateModal(false)
      } catch (err: any) {
        setError(err.message || 'Failed to create project')
      }
    })
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Projects</h1>
          <p className="page-subtitle">{projects.length} project{projects.length !== 1 ? 's' : ''} total</p>
        </div>
        <button
          className="btn btn-primary"
          id="new-project-btn"
          onClick={() => setShowCreateModal(true)}
        >
          <Plus size={16} />
          New Project
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="empty-state" style={{ marginTop: 'var(--space-10)' }}>
          <FolderKanban size={48} className="empty-state-icon" />
          <h2 className="empty-state-title">No projects yet</h2>
          <p className="empty-state-desc">Create your first project to get started</p>
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            <Plus size={16} /> Create Project
          </button>
        </div>
      ) : (
        <div className="grid-cards">
          {projects.map((project) => {
            const deadlineStatus = getDeadlineStatus(project.deadline)
            const progress = project.progress || 0
            const creatorName = project.profiles?.full_name

            return (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className={`card card-interactive ${styles.projectCard}`}
              >
                <div
                  className={styles.statusBar}
                  style={{
                    background: project.status === 'active'
                      ? 'linear-gradient(90deg, var(--color-accent-blue), var(--color-accent-cyan))'
                      : project.status === 'on_hold'
                      ? 'linear-gradient(90deg, var(--color-accent-amber), #ef4444)'
                      : 'linear-gradient(90deg, var(--color-accent-emerald), var(--color-accent-cyan))'
                  }}
                />
                <div className={styles.cardContent}>
                  <div className={styles.cardTop}>
                    <span className={`badge ${project.status === 'active' ? 'badge-emerald' : project.status === 'on_hold' ? 'badge-amber' : 'badge-blue'}`}>
                      {project.status === 'active' ? 'Active' : project.status === 'on_hold' ? 'On Hold' : 'Completed'}
                    </span>
                    <ArrowRight size={16} className={styles.arrow} />
                  </div>
                  <h3 className={styles.projectName}>{project.name}</h3>
                  <p className={styles.clientName}>{project.client_name}</p>
                  <div className={styles.progressSection}>
                    <div className="flex-between">
                      <span className="text-small text-muted">Progress</span>
                      <span className="text-small text-mono" style={{ color: 'var(--color-text-primary)' }}>{progress}%</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
                    </div>
                    <div className="flex-between" style={{ marginTop: 'var(--space-1)' }}>
                      <span className="text-tiny text-dim">
                        {project.completed_modules}/{project.modules_count} modules
                      </span>
                    </div>
                  </div>
                  <div className={styles.cardBottom}>
                    <div className={styles.cardMeta}>
                      <span className={`${styles.deadline} ${styles[deadlineStatus]}`}>
                        <Calendar size={12} />
                        {formatDate(project.deadline)}
                      </span>
                    </div>
                    {creatorName && (
                      <div className="avatar avatar-sm" title={creatorName}>
                        {getInitials(creatorName)}
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {/* Create Project Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Project"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setShowCreateModal(false)}>Cancel</button>
            <button className="btn btn-primary" form="create-project-form" type="submit" disabled={isPending}>
              {isPending ? 'Creating...' : 'Create Project'}
            </button>
          </>
        }
      >
        <form id="create-project-form" onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {error && <div style={{ padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)', color: '#f87171', fontSize: 'var(--text-sm)' }}>{error}</div>}
          <div className="input-group">
            <label htmlFor="project-name" className="input-label">Project Name *</label>
            <input id="project-name" name="name" type="text" className="input-field" placeholder="e.g. Safety Training 2026" required autoFocus />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            <div className="input-group">
              <label htmlFor="client-name" className="input-label">Client Name *</label>
              <input id="client-name" name="client_name" type="text" className="input-field" placeholder="Acme Corporation" required />
            </div>
            <div className="input-group">
              <label htmlFor="client-email" className="input-label">Client Email</label>
              <input id="client-email" name="client_email" type="email" className="input-field" placeholder="client@company.com" />
            </div>
          </div>
          <div className="input-group">
            <label htmlFor="project-desc" className="input-label">Description</label>
            <textarea id="project-desc" name="description" className="input-field" placeholder="Brief project description..." rows={3} />
          </div>
          <div className="input-group">
            <label htmlFor="project-deadline" className="input-label">Deadline *</label>
            <input id="project-deadline" name="deadline" type="date" className="input-field" required />
          </div>
        </form>
      </Modal>
    </div>
  )
}
