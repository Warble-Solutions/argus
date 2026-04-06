import { redirect } from 'next/navigation'
import { getAuthUrl } from '@/lib/google/drive'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  // Only admin can connect
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'manager'].includes(profile.role)) {
    return new Response('Only admins can connect Google Drive', { status: 403 })
  }

  const url = getAuthUrl()
  redirect(url)
}
