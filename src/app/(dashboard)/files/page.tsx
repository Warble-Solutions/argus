import { createClient } from '@/lib/supabase/server'
import { getDriveConnectionInfo } from '@/lib/google/drive'
import FilesClient from './FilesClient'

export default async function FilesPage() {
  const supabase = await createClient()

  // Get Drive connection status
  let driveInfo = null
  try {
    driveInfo = await getDriveConnectionInfo()
  } catch {}

  // Get projects for the file browser
  const { data: projects } = await supabase
    .from('projects')
    .select('id, name, client_name, drive_folder_id')
    .order('name')

  // Get recent files
  const { data: recentFiles } = await supabase
    .from('drive_files')
    .select('*, profiles!drive_files_uploaded_by_fkey(full_name), projects!drive_files_project_id_fkey(name), modules!drive_files_module_id_fkey(title, module_number)')
    .order('created_at', { ascending: false })
    .limit(20)

  // Get user role
  const { data: { user } } = await supabase.auth.getUser()
  let userRole = 'employee'
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    userRole = profile?.role || 'employee'
  }

  return (
    <FilesClient
      driveConnected={!!driveInfo?.connected}
      driveEmail={driveInfo?.email || null}
      projects={projects || []}
      recentFiles={recentFiles || []}
      userRole={userRole}
    />
  )
}
