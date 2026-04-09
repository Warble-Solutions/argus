'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export async function getCurrentUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return profile
}

export async function updateProfile(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const full_name = formData.get('full_name') as string
  if (!full_name?.trim()) throw new Error('Name is required')

  const { error } = await supabase
    .from('profiles')
    .update({ full_name: full_name.trim() })
    .eq('id', user.id)

  if (error) throw new Error(error.message)
  revalidatePath('/', 'layout')
}

export async function updateMemberRole(memberId: string, newRole: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Verify caller is admin
  const { data: callerProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!callerProfile || callerProfile.role !== 'admin') {
    throw new Error('Only admins can change roles')
  }

  // Prevent changing own role
  if (memberId === user.id) {
    throw new Error('Cannot change your own role')
  }

  const validRoles = ['admin', 'manager', 'employee', 'intern']
  if (!validRoles.includes(newRole)) {
    throw new Error('Invalid role')
  }

  const { error } = await supabase
    .from('profiles')
    .update({ role: newRole })
    .eq('id', memberId)

  if (error) throw new Error(error.message)
  revalidatePath('/admin/team')
  revalidatePath(`/admin/team/${memberId}`)
}

export async function requestPasswordReset(email: string) {
  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/callback?next=/login`,
  })

  if (error) throw new Error(error.message)
}
