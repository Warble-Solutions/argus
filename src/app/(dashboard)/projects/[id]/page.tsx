import Link from 'next/link'
import { ArrowLeft, Calendar } from 'lucide-react'
import { getProjectById, getModulesByProject } from '@/lib/mock-data'
import { formatDate, getDeadlineStatus } from '@/lib/utils'
import ModulesTable from '@/components/projects/ModulesTable'
import styles from './page.module.css'

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const project = getProjectById(id)
  const modules = getModulesByProject(id)

  if (!project) {
    return (
      <div className="page-container">
        <div className="empty-state">
          <h2 className="empty-state-title">Project not found</h2>
          <Link href="/projects" className="btn btn-primary">Back to Projects</Link>
        </div>
      </div>
    )
  }

  const progress = project.progress || 0
  const nextModuleNumber = modules.length > 0 ? Math.max(...modules.map(m => m.module_number)) + 1 : 1

  return (
    <div className="page-container">
      {/* Back link + Header */}
      <Link href="/projects" className={styles.backLink}>
        <ArrowLeft size={16} /> Back to Projects
      </Link>

      <div className="page-header">
        <div>
          <h1 className="page-title">{project.name}</h1>
          <p className="page-subtitle">{project.client_name} · {project.description}</p>
        </div>
      </div>

      {/* Project Stats Bar */}
      <div className={styles.statsBar}>
        <div className={styles.statItem}>
          <span className="text-tiny text-dim">Status</span>
          <span className={`badge ${project.status === 'active' ? 'badge-emerald' : 'badge-amber'}`}>
            {project.status === 'active' ? 'Active' : 'On Hold'}
          </span>
        </div>
        <div className={styles.statItem}>
          <span className="text-tiny text-dim">Deadline</span>
          <span className={`text-small ${getDeadlineStatus(project.deadline) === 'overdue' ? styles.overdue : ''}`}>
            <Calendar size={13} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '4px' }} />
            {formatDate(project.deadline)}
          </span>
        </div>
        <div className={styles.statItem}>
          <span className="text-tiny text-dim">Modules</span>
          <span className="text-small text-mono">{project.completed_modules}/{project.modules_count}</span>
        </div>
        <div className={styles.statItem}>
          <span className="text-tiny text-dim">Progress</span>
          <div className={styles.miniProgress}>
            <div className="progress-bar" style={{ width: '100px' }}>
              <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
            </div>
            <span className="text-small text-mono">{progress}%</span>
          </div>
        </div>
      </div>

      {/* Modules Table — Client Component */}
      <div className={styles.modulesSection}>
        <ModulesTable modules={modules} projectId={project.id} nextModuleNumber={nextModuleNumber} />
      </div>
    </div>
  )
}
