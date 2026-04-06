import { createClient } from '@/lib/supabase/server'
import OracleClient from './OracleClient'
import { redirect } from 'next/navigation'

export const metadata = {
  title: 'Oracle Chat | Argus',
}

export default async function ChatPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  // Load threads
  const { data: threads } = await supabase
    .from('oracle_threads')
    .select('id, title, updated_at')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })

  return (
    <OracleClient initialThreads={threads || []} userId={user.id} />
  )
}
