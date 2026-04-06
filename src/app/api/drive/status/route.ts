import { getDriveConnectionInfo } from '@/lib/google/drive'

export async function GET() {
  try {
    const info = await getDriveConnectionInfo()
    return Response.json(info || { connected: false })
  } catch {
    return Response.json({ connected: false })
  }
}
