// Server-only Google Drive library — do not import in client components

import { google } from 'googleapis'
import { createClient } from '@/lib/supabase/server'

const SCOPES = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/userinfo.email',
]

// ============================================
// OAuth Client
// ============================================

export function getOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/drive/callback`
  )
}

export function getAuthUrl() {
  const oauth2 = getOAuthClient()
  return oauth2.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
  })
}

export async function exchangeCodeForTokens(code: string) {
  const oauth2 = getOAuthClient()
  const { tokens } = await oauth2.getToken(code)
  return tokens
}

// ============================================
// Authenticated Drive Client
// ============================================

async function getStoredTokens() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('integration_tokens')
    .select('*')
    .eq('id', 'google_drive')
    .single()
  return data
}

async function updateStoredTokens(accessToken: string, expiryDate?: number | null) {
  const supabase = await createClient()
  await supabase
    .from('integration_tokens')
    .update({
      access_token: accessToken,
      expiry_date: expiryDate ?? null,
    })
    .eq('id', 'google_drive')
}

export async function getAuthenticatedDrive() {
  const tokenData = await getStoredTokens()
  if (!tokenData) return null

  const oauth2 = getOAuthClient()
  oauth2.setCredentials({
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token,
    expiry_date: tokenData.expiry_date ? Number(tokenData.expiry_date) : undefined,
  })

  // Auto-refresh listener
  oauth2.on('tokens', async (tokens) => {
    if (tokens.access_token) {
      await updateStoredTokens(tokens.access_token, tokens.expiry_date)
    }
  })

  return google.drive({ version: 'v3', auth: oauth2 })
}

export async function isDriveConnected(): Promise<boolean> {
  const tokens = await getStoredTokens()
  return !!tokens?.refresh_token
}

export async function getDriveConnectionInfo() {
  const tokens = await getStoredTokens()
  if (!tokens) return null
  return {
    connected: true,
    email: tokens.connected_email,
    connectedAt: tokens.connected_at,
    rootFolderId: tokens.root_folder_id,
  }
}

// ============================================
// Folder Operations
// ============================================

export async function createFolder(name: string, parentId: string): Promise<{ id: string; webViewLink: string } | null> {
  const drive = await getAuthenticatedDrive()
  if (!drive) return null

  const res = await drive.files.create({
    requestBody: {
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
    },
    fields: 'id, webViewLink',
  })

  return {
    id: res.data.id!,
    webViewLink: res.data.webViewLink || '',
  }
}

export async function findOrCreateFolder(name: string, parentId: string): Promise<string> {
  const drive = await getAuthenticatedDrive()
  if (!drive) throw new Error('Drive not connected')

  // Search for existing folder
  const query = `name='${name.replace(/'/g, "\\'")}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`
  const existing = await drive.files.list({
    q: query,
    fields: 'files(id)',
    pageSize: 1,
  })

  if (existing.data.files && existing.data.files.length > 0) {
    return existing.data.files[0].id!
  }

  // Create new
  const folder = await createFolder(name, parentId)
  if (!folder) throw new Error('Failed to create folder')
  return folder.id
}

export async function createProjectFolders(clientName: string, projectName: string, rootFolderId: string) {
  // Root / Client / Project
  const clientFolderId = await findOrCreateFolder(clientName, rootFolderId)
  const projectFolderId = await findOrCreateFolder(projectName, clientFolderId)

  // Create _Shared_Assets folder
  await findOrCreateFolder('_Shared_Assets', projectFolderId)

  return projectFolderId
}

export async function createModuleFolder(projectFolderId: string, moduleNumber: number, moduleTitle: string) {
  const folderName = `Module_${String(moduleNumber).padStart(2, '0')}_${moduleTitle.replace(/[^a-zA-Z0-9_ ]/g, '').trim()}`
  return await findOrCreateFolder(folderName, projectFolderId)
}

// ============================================
// Auto-create root folder on first connect
// ============================================

export async function ensureRootFolder(): Promise<string> {
  const supabase = await createClient()
  const { data: tokenData } = await supabase
    .from('integration_tokens')
    .select('root_folder_id')
    .eq('id', 'google_drive')
    .single()

  if (tokenData?.root_folder_id) return tokenData.root_folder_id

  // Create root folder in user's Drive
  const drive = await getAuthenticatedDrive()
  if (!drive) throw new Error('Drive not connected')

  const res = await drive.files.create({
    requestBody: {
      name: 'Argus Projects',
      mimeType: 'application/vnd.google-apps.folder',
    },
    fields: 'id',
  })

  const rootId = res.data.id!

  // Save it
  await supabase
    .from('integration_tokens')
    .update({ root_folder_id: rootId })
    .eq('id', 'google_drive')

  return rootId
}

// ============================================
// File Operations
// ============================================

export async function listDriveFiles(folderId: string) {
  const drive = await getAuthenticatedDrive()
  if (!drive) return []

  const res = await drive.files.list({
    q: `'${folderId}' in parents and trashed=false`,
    fields: 'files(id, name, mimeType, size, webViewLink, thumbnailLink, createdTime, modifiedTime)',
    orderBy: 'modifiedTime desc',
    pageSize: 100,
  })

  return res.data.files || []
}

export async function uploadFileToDrive(
  buffer: Buffer,
  fileName: string,
  mimeType: string,
  folderId: string
) {
  const drive = await getAuthenticatedDrive()
  if (!drive) throw new Error('Drive not connected')

  const { Readable } = await import('stream')
  const stream = new Readable()
  stream.push(buffer)
  stream.push(null)

  const res = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [folderId],
    },
    media: {
      mimeType,
      body: stream,
    },
    fields: 'id, name, mimeType, size, webViewLink, thumbnailLink',
  })

  return res.data
}

export async function deleteFileFromDrive(fileId: string) {
  const drive = await getAuthenticatedDrive()
  if (!drive) throw new Error('Drive not connected')

  await drive.files.delete({ fileId })
}

export async function getFileMetadata(fileId: string) {
  const drive = await getAuthenticatedDrive()
  if (!drive) return null

  const res = await drive.files.get({
    fileId,
    fields: 'id, name, mimeType, size, webViewLink, thumbnailLink, createdTime, modifiedTime',
  })

  return res.data
}
