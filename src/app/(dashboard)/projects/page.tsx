import { getProjects, getTeamMembers } from '@/lib/actions/data'
import ProjectsClient from './ProjectsClient'

export default async function ProjectsPage() {
  const [projects, teamMembers] = await Promise.all([getProjects(), getTeamMembers()])
  return <ProjectsClient projects={projects} teamMembers={teamMembers} />
}
