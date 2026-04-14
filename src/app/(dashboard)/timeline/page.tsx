import { getProjects } from '@/lib/actions/data'
import TimelineClient from './TimelineClient'

export default async function TimelinePage() {
  const projects = await getProjects()

  const active = projects.filter((p: any) => ['active', 'on_hold'].includes(p.status))
  const completed = projects.filter((p: any) => ['completed', 'archived'].includes(p.status))

  return <TimelineClient activeProjects={active} completedProjects={completed} />
}
