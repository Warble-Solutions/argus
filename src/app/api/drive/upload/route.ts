import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { uploadFileToDrive, ensureRootFolder, findOrCreateFolder } from '@/lib/google/drive'
import { logActivity } from '@/lib/actions/data'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const formData = await req.formData()
    const file = formData.get('file') as File
    const projectId = formData.get('projectId') as string
    const moduleId = (formData.get('moduleId') as string) || null
    const category = (formData.get('category') as string) || 'general'

    if (!file || !projectId) {
      return Response.json({ error: 'File and projectId are required' }, { status: 400 })
    }

    // Get project info to find/create Drive folder
    const { data: project } = await supabase
      .from('projects')
      .select('id, name, client_name, drive_folder_id')
      .eq('id', projectId)
      .single()

    if (!project) {
      return Response.json({ error: 'Project not found' }, { status: 404 })
    }

    // Determine target folder
    let targetFolderId: string

    if (moduleId) {
      // Upload to module folder
      const { data: mod } = await supabase
        .from('modules')
        .select('id, drive_folder_id, module_number, title')
        .eq('id', moduleId)
        .single()

      if (mod?.drive_folder_id) {
        targetFolderId = mod.drive_folder_id
      } else if (project.drive_folder_id) {
        // Create module folder on the fly
        const folderName = `Module_${String(mod?.module_number || 0).padStart(2, '0')}_${(mod?.title || '').replace(/[^a-zA-Z0-9_ ]/g, '').trim()}`
        targetFolderId = await findOrCreateFolder(folderName, project.drive_folder_id)

        // Save the folder ID back
        if (mod) {
          await supabase.from('modules').update({ drive_folder_id: targetFolderId }).eq('id', moduleId)
        }
      } else {
        // Project has no folder yet — create the whole structure
        const rootId = await ensureRootFolder()
        const clientFolderId = await findOrCreateFolder(project.client_name, rootId)
        const projectFolderId = await findOrCreateFolder(project.name, clientFolderId)
        await supabase.from('projects').update({ drive_folder_id: projectFolderId }).eq('id', projectId)

        const folderName = `Module_${String(mod?.module_number || 0).padStart(2, '0')}_${(mod?.title || '').replace(/[^a-zA-Z0-9_ ]/g, '').trim()}`
        targetFolderId = await findOrCreateFolder(folderName, projectFolderId)

        if (mod) {
          await supabase.from('modules').update({ drive_folder_id: targetFolderId }).eq('id', moduleId)
        }
      }
    } else if (project.drive_folder_id) {
      targetFolderId = project.drive_folder_id
    } else {
      // Create project folders on the fly
      const rootId = await ensureRootFolder()
      const clientFolderId = await findOrCreateFolder(project.client_name, rootId)
      targetFolderId = await findOrCreateFolder(project.name, clientFolderId)
      await supabase.from('projects').update({ drive_folder_id: targetFolderId }).eq('id', projectId)
    }

    // Upload to Drive
    const buffer = Buffer.from(await file.arrayBuffer())
    const driveFile = await uploadFileToDrive(buffer, file.name, file.type, targetFolderId)

    // Determine version (count existing files with same name in same module/project)
    let version = 1
    if (moduleId) {
      const { count } = await supabase
        .from('drive_files')
        .select('*', { count: 'exact', head: true })
        .eq('module_id', moduleId)
        .eq('name', file.name)
      version = (count || 0) + 1
    }

    // Insert record into DB
    const { data: record, error } = await supabase.from('drive_files').insert({
      project_id: projectId,
      module_id: moduleId,
      drive_file_id: driveFile.id!,
      drive_folder_id: targetFolderId,
      name: file.name,
      mime_type: file.type || driveFile.mimeType,
      size_bytes: file.size,
      category,
      version,
      web_view_link: driveFile.webViewLink || null,
      thumbnail_link: driveFile.thumbnailLink || null,
      uploaded_by: user.id,
    }).select('*').single()

    if (error) {
      console.error('DB insert error:', error)
      return Response.json({ error: 'File uploaded to Drive but failed to save record' }, { status: 500 })
    }

    // Log activity
    if (moduleId) {
      await logActivity('file_uploaded', `Uploaded "${file.name}"`, { projectId, moduleId })
    }

    return Response.json({ success: true, file: record })
  } catch (error: any) {
    console.error('Upload error:', error)
    return Response.json({ error: error.message || 'Upload failed' }, { status: 500 })
  }
}
