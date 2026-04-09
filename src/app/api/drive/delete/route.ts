import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { deleteFileFromDrive } from '@/lib/google/drive'
import { logActivity } from '@/lib/actions/data'

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    // Check role — only admin/manager/employee can delete
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role === 'intern') {
      return Response.json({ error: 'Interns cannot delete files' }, { status: 403 })
    }

    const { fileId } = await req.json()
    if (!fileId) {
      return Response.json({ error: 'fileId is required' }, { status: 400 })
    }

    // Get the Drive file ID from our DB
    const { data: record } = await supabase
      .from('drive_files')
      .select('drive_file_id, name, module_id, project_id')
      .eq('id', fileId)
      .single()

    if (!record) {
      return Response.json({ error: 'File not found' }, { status: 404 })
    }

    // Delete from Google Drive
    try {
      await deleteFileFromDrive(record.drive_file_id)
    } catch (driveError) {
      console.error('Drive delete error (continuing with DB delete):', driveError)
    }

    // Delete from DB
    const { error } = await supabase
      .from('drive_files')
      .delete()
      .eq('id', fileId)

    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    // Log activity
    if (record.module_id) {
      await logActivity('file_deleted', `Deleted "${record.name}"`, { projectId: record.project_id, moduleId: record.module_id })
    }

    return Response.json({ success: true })
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}
