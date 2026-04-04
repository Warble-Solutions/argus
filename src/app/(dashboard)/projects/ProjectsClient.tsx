'use client'

import { useState, useTransition, useMemo, useRef, useEffect } from 'react'
import Link from 'next/link'
import { Plus, ArrowRight, Calendar, FolderKanban, Search, X, Shield } from 'lucide-react'
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

interface TeamMember {
  id: string
  full_name: string
  email: string
  role: string
}

interface ProjectsClientProps {
  projects: Project[]
  teamMembers: TeamMember[]
}

export default function ProjectsClient({ projects, teamMembers }: ProjectsClientProps) {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  // Lead selector state
  const [selectedLeads, setSelectedLeads] = useState<TeamMember[]>([])
  const [leadSearch, setLeadSearch] = useState('')
  const [showLeadDropdown, setShowLeadDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const filteredMembers = useMemo(() => {
    return teamMembers.filter(m =>
      !selectedLeads.find(s => s.id === m.id) &&
      (m.full_name.toLowerCase().includes(leadSearch.toLowerCase()) ||
       m.email.toLowerCase().includes(leadSearch.toLowerCase()))
    )
  }, [teamMembers, selectedLeads, leadSearch])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowLeadDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const addLead = (member: TeamMember) => {
    setSelectedLeads(prev => [...prev, member])
    setLeadSearch('')
    setShowLeadDropdown(false)
  }

  const removeLead = (id: string) => {
    setSelectedLeads(prev => prev.filter(m => m.id !== id))
  }

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    const formData = new FormData(e.currentTarget)

    // Append selected lead IDs
    selectedLeads.forEach(lead => {
      formData.append('lead_ids', lead.id)
    })

    startTransition(async () => {
      try {
        await createProject(formData)
        setShowCreateModal(false)
        setSelectedLeads([])
        setLeadSearch('')
      } catch (err: any) {
        setError(err.message || 'Failed to create project')
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
        onClose={() => { setShowCreateModal(false); setSelectedLeads([]); setLeadSearch('') }}
        title="Create New Project"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => { setShowCreateModal(false); setSelectedLeads([]); setLeadSearch('') }}>Cancel</button>
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

          {/* Searchable Lead Selector */}
          <div className="input-group" ref={dropdownRef}>
            <label className="input-label">
              <Shield size={14} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '4px' }} />
              Project Lead(s)
            </label>

            {/* Selected leads chips */}
            {selectedLeads.length > 0 && (
              <div className={styles.selectedLeads}>
                {selectedLeads.map(lead => (
                  <span key={lead.id} className={styles.leadChip}>
                    <span className="avatar avatar-sm" style={{ width: 20, height: 20, fontSize: '9px' }}>
                      {getInitials(lead.full_name)}
                    </span>
                    {lead.full_name}
                    <button type="button" className={styles.chipRemove} onClick={() => removeLead(lead.id)}>
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Search input */}
            <div className={styles.searchInputWrapper}>
              <Search size={14} className={styles.searchIcon} />
              <input
                type="text"
                className="input-field"
                placeholder="Search team members to add as lead..."
                value={leadSearch}
                onChange={e => { setLeadSearch(e.target.value); setShowLeadDropdown(true) }}
                onFocus={() => setShowLeadDropdown(true)}
                style={{ paddingLeft: 'var(--space-8)' }}
              />
            </div>

            {/* Dropdown */}
            {showLeadDropdown && (
              <div className={styles.leadDropdown}>
                {filteredMembers.length === 0 ? (
                  <div className={styles.dropdownEmpty}>
                    {leadSearch ? 'No matches found' : 'All members selected'}
                  </div>
                ) : (
                  filteredMembers.map(member => (
                    <button
                      key={member.id}
                      type="button"
                      className={styles.dropdownItem}
                      onClick={() => addLead(member)}
                    >
                      <div className="avatar avatar-sm">{getInitials(member.full_name)}</div>
                      <div className={styles.dropdownInfo}>
                        <span className={styles.dropdownName}>{member.full_name}</span>
                        <span className={styles.dropdownEmail}>{member.email}</span>
                      </div>
                      <span className={`badge ${roleColors[member.role] || 'badge-neutral'}`}>{member.role}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </form>
      </Modal>
    </div>
  )
}
