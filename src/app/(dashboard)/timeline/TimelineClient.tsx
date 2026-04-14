'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Clock, ChevronDown, ChevronRight, FolderKanban, ArrowRight } from 'lucide-react'
import { formatDate, getInitials } from '@/lib/utils'
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
  is_vernacular?: boolean
}

interface TimelineClientProps {
  activeProjects: Project[]
  completedProjects: Project[]
}

export default function TimelineClient({ activeProjects, completedProjects }: TimelineClientProps) {
  const [showCompleted, setShowCompleted] = useState(false)

  const statusConfig: Record<string, { label: string; cls: string }> = {
    active: { label: 'Active', cls: 'badge-emerald' },
    on_hold: { label: 'On Hold', cls: 'badge-amber' },
    completed: { label: 'Completed', cls: 'badge-blue' },
    archived: { label: 'Archived', cls: 'badge-neutral' },
  }

  const renderProjectCard = (project: Project) => {
    const sc = statusConfig[project.status] || statusConfig.active
    return (
      <Link
        key={project.id}
        href={`/timeline/${project.id}`}
        className={`card card-interactive ${styles.projectCard}`}
      >
        <div className={styles.cardContent}>
          <div className={styles.cardTop}>
            <span className={`badge ${sc.cls}`}>{sc.label}</span>
            {project.is_vernacular && <span className="badge badge-purple">🌐 Vernacular</span>}
            <ArrowRight size={16} className={styles.arrow} />
          </div>
          <h3 className={styles.projectName}>{project.name}</h3>
          <span className="text-small text-muted">{project.client_name}</span>
          <div className={styles.cardStats}>
            <span className="text-tiny text-dim">
              {project.completed_modules}/{project.modules_count} modules
            </span>
            <span className="text-tiny text-dim">Due {formatDate(project.deadline)}</span>
          </div>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${project.progress}%` }} />
          </div>
        </div>
      </Link>
    )
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Timeline</h1>
          <p className="page-subtitle">Track module versions, feedback & SCORM delivery</p>
        </div>
      </div>

      {/* Active Projects */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          <FolderKanban size={18} /> Active Projects
          <span className="badge badge-neutral" style={{ marginLeft: 8 }}>{activeProjects.length}</span>
        </h2>
        {activeProjects.length === 0 ? (
          <p className="text-small text-muted" style={{ padding: 'var(--space-6) 0' }}>No active projects</p>
        ) : (
          <div className="grid-cards">
            {activeProjects.map(renderProjectCard)}
          </div>
        )}
      </section>

      {/* Completed Projects */}
      <section className={styles.section}>
        <button
          className={styles.sectionToggle}
          onClick={() => setShowCompleted(!showCompleted)}
        >
          {showCompleted ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          Completed Projects
          <span className="badge badge-neutral" style={{ marginLeft: 8 }}>{completedProjects.length}</span>
        </button>
        {showCompleted && completedProjects.length > 0 && (
          <div className="grid-cards" style={{ marginTop: 'var(--space-4)' }}>
            {completedProjects.map(renderProjectCard)}
          </div>
        )}
        {showCompleted && completedProjects.length === 0 && (
          <p className="text-small text-muted" style={{ padding: 'var(--space-4) 0' }}>No completed projects yet</p>
        )}
      </section>
    </div>
  )
}
