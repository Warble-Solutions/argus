'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, ArrowRight, Calendar } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import { mockProjects, getUserById } from '@/lib/mock-data'
import { formatDate, getDaysUntil, getDeadlineStatus, getInitials } from '@/lib/utils'
import styles from './page.module.css'

export default function ProjectsPage() {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    client_name: '',
    client_email: '',
    description: '',
    deadline: '',
  })

  const projects = mockProjects

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    // Mock create — will be replaced with Supabase insert
    alert(`Project "${formData.name}" would be created.\n\nThis will work once Supabase is connected.`)
    setShowCreateModal(false)
    setFormData({ name: '', client_name: '', client_email: '', description: '', deadline: '' })
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Projects</h1>
          <p className="page-subtitle">{projects.length} projects total</p>
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

      <div className="grid-cards">
        {projects.map((project) => {
          const creator = getUserById(project.created_by)
          const deadlineStatus = getDeadlineStatus(project.deadline)
          const progress = project.progress || 0

          return (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className={`card card-interactive ${styles.projectCard}`}
            >
              {/* Status bar */}
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
                {/* Header */}
                <div className={styles.cardTop}>
                  <span className={`badge ${project.status === 'active' ? 'badge-emerald' : project.status === 'on_hold' ? 'badge-amber' : 'badge-blue'}`}>
                    {project.status === 'active' ? 'Active' : project.status === 'on_hold' ? 'On Hold' : 'Completed'}
                  </span>
                  <ArrowRight size={16} className={styles.arrow} />
                </div>

                {/* Title */}
                <h3 className={styles.projectName}>{project.name}</h3>
                <p className={styles.clientName}>{project.client_name}</p>

                {/* Progress */}
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

                {/* Footer */}
                <div className={styles.cardBottom}>
                  <div className={styles.cardMeta}>
                    <span className={`${styles.deadline} ${styles[deadlineStatus]}`}>
                      <Calendar size={12} />
                      {formatDate(project.deadline)}
                    </span>
                  </div>
                  {creator && (
                    <div className="avatar avatar-sm" title={creator.full_name}>
                      {getInitials(creator.full_name)}
                    </div>
                  )}
                </div>
              </div>
            </Link>
          )
        })}
      </div>

      {/* Create Project Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Project"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setShowCreateModal(false)}>Cancel</button>
            <button className="btn btn-primary" form="create-project-form" type="submit">Create Project</button>
          </>
        }
      >
        <form id="create-project-form" onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div className="input-group">
            <label htmlFor="project-name" className="input-label">Project Name *</label>
            <input
              id="project-name"
              type="text"
              className="input-field"
              placeholder="e.g. Safety Training 2026"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              required
              autoFocus
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            <div className="input-group">
              <label htmlFor="client-name" className="input-label">Client Name *</label>
              <input
                id="client-name"
                type="text"
                className="input-field"
                placeholder="Acme Corporation"
                value={formData.client_name}
                onChange={e => setFormData({ ...formData, client_name: e.target.value })}
                required
              />
            </div>
            <div className="input-group">
              <label htmlFor="client-email" className="input-label">Client Email</label>
              <input
                id="client-email"
                type="email"
                className="input-field"
                placeholder="client@company.com"
                value={formData.client_email}
                onChange={e => setFormData({ ...formData, client_email: e.target.value })}
              />
            </div>
          </div>
          <div className="input-group">
            <label htmlFor="project-desc" className="input-label">Description</label>
            <textarea
              id="project-desc"
              className="input-field"
              placeholder="Brief project description..."
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>
          <div className="input-group">
            <label htmlFor="project-deadline" className="input-label">Deadline *</label>
            <input
              id="project-deadline"
              type="date"
              className="input-field"
              value={formData.deadline}
              onChange={e => setFormData({ ...formData, deadline: e.target.value })}
              required
            />
          </div>
        </form>
      </Modal>
    </div>
  )
}
