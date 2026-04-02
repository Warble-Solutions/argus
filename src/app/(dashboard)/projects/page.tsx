import { getProjects } from '@/lib/actions/data'
import ProjectsClient from './ProjectsClient'

export default async function ProjectsPage() {
  const projects = await getProjects()
  return <ProjectsClient projects={projects} />
}
