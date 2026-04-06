import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const projectId = req.nextUrl.searchParams.get('projectId')
    const moduleId = req.nextUrl.searchParams.get('moduleId')

    let query = supabase
      .from('drive_files')
      .select('*, profiles!drive_files_uploaded_by_fkey(full_name, avatar_url)')
      .order('created_at', { ascending: false })

    if (moduleId) {
      query = query.eq('module_id', moduleId)
    } else if (projectId) {
      query = query.eq('project_id', projectId)
    }

    const { data, error } = await query.limit(100)

    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ files: data || [] })
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}
