import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getProjectById, getProjectTimeline } from '@/lib/actions/data'
import { getCurrentUser } from '@/lib/actions/auth'
import TimelineTable from './TimelineTable'

export default async function ProjectTimelinePage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params
  const project = await getProjectById(projectId)
  const currentUser = await getCurrentUser()

  if (!project) {
    return (
      <div className="page-container">
        <div className="empty-state">
          <h2 className="empty-state-title">Project not found</h2>
          <Link href="/timeline" className="btn btn-primary">Back to Timeline</Link>
        </div>
      </div>
    )
  }

  const modules = await getProjectTimeline(projectId)

  return (
    <div className="page-container">
      <Link href="/timeline" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-4)', textDecoration: 'none' }}>
        <ArrowLeft size={16} /> Back to Timeline
      </Link>

      <div className="page-header" style={{ marginBottom: 'var(--space-6)' }}>
        <div>
          <h1 className="page-title">{project.name}</h1>
          <p className="page-subtitle">{project.client_name} · {modules.length} modules</p>
        </div>
      </div>

      <TimelineTable
        project={project}
        modules={modules}
        userRole={currentUser?.role || 'employee'}
      />
    </div>
  )
}
