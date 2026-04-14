import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const projectId = req.nextUrl.searchParams.get('projectId')
    if (!projectId) return Response.json({ error: 'Missing projectId' }, { status: 400 })

    // Get project
    const { data: project } = await supabase
      .from('projects')
      .select('name, client_name, is_vernacular')
      .eq('id', projectId)
      .single()

    if (!project) return Response.json({ error: 'Project not found' }, { status: 404 })

    // Get modules with versions
    const { data: modules } = await supabase
      .from('modules')
      .select('*, module_versions(*)')
      .eq('project_id', projectId)
      .order('module_number', { ascending: true })

    if (!modules) return Response.json({ error: 'No modules' }, { status: 404 })

    // Find max story and scorm version counts
    let maxStoryVersions = 0
    let maxScormVersions = 0
    for (const mod of modules) {
      const storyCount = mod.module_versions.filter((v: any) => v.type === 'story').length
      const scormCount = mod.module_versions.filter((v: any) => v.type === 'scorm').length
      if (storyCount > maxStoryVersions) maxStoryVersions = storyCount
      if (scormCount > maxScormVersions) maxScormVersions = scormCount
    }

    // Build header row
    const headers: string[] = []
    if (project.is_vernacular) headers.push('Language')
    headers.push('S. No.', 'Module')

    // Story version columns
    for (let i = 1; i <= maxStoryVersions; i++) {
      const ordinal = getOrdinal(i)
      headers.push(`${ordinal} Version Delivered (Date)`)
      headers.push(`${ordinal} Feedback Received (Date)`)
    }

    // SCORM version columns
    for (let i = 1; i <= maxScormVersions; i++) {
      const ordinal = getOrdinal(i)
      headers.push(`${ordinal} SCORM Delivered (Date)`)
      headers.push(`${ordinal} SCORM Feedback (Date)`)
    }

    headers.push('Module Approved for SCORM (Date)', 'Remark')

    // Build data rows
    const rows: string[][] = []
    let currentLang = ''

    for (const mod of modules) {
      const row: string[] = []

      if (project.is_vernacular) {
        const lang = mod.language || ''
        row.push(lang !== currentLang ? lang : '')
        currentLang = lang
      }

      row.push(String(mod.module_number))
      row.push(mod.title)

      const storyVersions = mod.module_versions
        .filter((v: any) => v.type === 'story')
        .sort((a: any, b: any) => a.version_number - b.version_number)

      for (let i = 0; i < maxStoryVersions; i++) {
        const v = storyVersions[i]
        row.push(v ? fmtDate(v.delivered_at) : 'NA')
        row.push(v ? fmtDate(v.feedback_received_at) : 'NA')
      }

      const scormVersions = mod.module_versions
        .filter((v: any) => v.type === 'scorm')
        .sort((a: any, b: any) => a.version_number - b.version_number)

      for (let i = 0; i < maxScormVersions; i++) {
        const v = scormVersions[i]
        row.push(v ? fmtDate(v.delivered_at) : 'NA')
        row.push(v ? fmtDate(v.feedback_received_at) : 'NA')
      }

      row.push(mod.scorm_approved_at ? fmtDate(mod.scorm_approved_at) : 'NA')
      row.push(mod.remark || '')

      rows.push(row)
    }

    // Build CSV
    const csvLines = [headers.map(escapeCsv).join(',')]
    for (const row of rows) {
      csvLines.push(row.map(escapeCsv).join(','))
    }
    const csv = csvLines.join('\r\n')

    const filename = `${project.client_name} - ${project.name} Timeline.csv`

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}

function fmtDate(d: string | null): string {
  if (!d) return 'NA'
  const date = new Date(d)
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}-${month}-${year}`
}

function escapeCsv(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function getOrdinal(n: number): string {
  const ordinals = ['', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th']
  if (n <= 10) return ordinals[n]
  const s = String(n)
  const last = s.slice(-1)
  const lastTwo = s.slice(-2)
  if (lastTwo === '11' || lastTwo === '12' || lastTwo === '13') return `${n}th`
  if (last === '1') return `${n}st`
  if (last === '2') return `${n}nd`
  if (last === '3') return `${n}rd`
  return `${n}th`
}
