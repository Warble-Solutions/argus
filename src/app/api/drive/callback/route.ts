import { NextRequest } from 'next/server'
import { redirect } from 'next/navigation'
import { exchangeCodeForTokens, getOAuthClient, ensureRootFolder } from '@/lib/google/drive'
import { createClient } from '@/lib/supabase/server'
import { google } from 'googleapis'

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')
  const error = req.nextUrl.searchParams.get('error')

  if (error) {
    console.error('Google OAuth error:', error)
    return redirect(`/admin/settings?drive=error&reason=${error}`)
  }

  if (!code) {
    return redirect('/admin/settings?drive=error&reason=no_code')
  }

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return redirect('/admin/settings?drive=error&reason=unauthorized')

    console.log('[Drive] Exchanging code for tokens...')

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code)
    console.log('[Drive] Got tokens:', {
      hasAccessToken: !!tokens.access_token,
      hasRefreshToken: !!tokens.refresh_token,
      expiryDate: tokens.expiry_date,
    })

    if (!tokens.access_token || !tokens.refresh_token) {
      return redirect('/admin/settings?drive=error&reason=no_tokens')
    }

    // Get user's email from Google
    const oauth2 = getOAuthClient()
    oauth2.setCredentials(tokens)
    const oauth2Client = google.oauth2({ version: 'v2', auth: oauth2 })
    const userInfo = await oauth2Client.userinfo.get()
    const email = userInfo.data.email || 'unknown'
    console.log('[Drive] Connected as:', email)

    // Store tokens (upsert — replaces any existing connection)
    const { error: dbError } = await supabase.from('integration_tokens').upsert({
      id: 'google_drive',
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry_date: tokens.expiry_date ?? null,
      connected_by: user.id,
      connected_email: email,
      connected_at: new Date().toISOString(),
    })

    if (dbError) {
      console.error('[Drive] DB error saving tokens:', dbError)
      return redirect('/admin/settings?drive=error&reason=db_error')
    }

    console.log('[Drive] Tokens saved. Creating root folder...')

    // Auto-create root folder
    try {
      await ensureRootFolder()
      console.log('[Drive] Root folder ready.')
    } catch (folderErr) {
      console.error('[Drive] Root folder error (non-blocking):', folderErr)
    }

    return redirect('/admin/settings?drive=success')
  } catch (err: any) {
    console.error('[Drive] Callback error:', err?.message || err)
    console.error('[Drive] Full error:', JSON.stringify(err?.response?.data || err, null, 2))
    const reason = encodeURIComponent(err?.message?.substring(0, 100) || 'exchange_failed')
    return redirect(`/admin/settings?drive=error&reason=${reason}`)
  }
}

