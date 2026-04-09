'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Upload, Trash2, FileText, Image, Film, FileSpreadsheet, File, ExternalLink, Loader2 } from 'lucide-react'
import { formatDate, getInitials } from '@/lib/utils'
import styles from './ModuleFiles.module.css'

interface DriveFile {
  id: string
  name: string
  mime_type: string
  size_bytes: number
  category: string
  version: number
  web_view_link: string | null
  thumbnail_link: string | null
  created_at: string
  profiles?: { full_name: string } | null
}

interface ModuleFilesProps {
  projectId: string
  moduleId: string
}

const FILE_ICONS: Record<string, typeof FileText> = {
  'image': Image,
  'video': Film,
  'spreadsheet': FileSpreadsheet,
  'presentation': FileSpreadsheet,
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return Image
  if (mimeType.startsWith('video/')) return Film
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return FileSpreadsheet
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return FileSpreadsheet
  if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('word')) return FileText
  return File
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

function getExtension(name: string): string {
  const parts = name.split('.')
  return parts.length > 1 ? parts.pop()!.toUpperCase() : '—'
}

export default function ModuleFiles({ projectId, moduleId }: ModuleFilesProps) {
  const [files, setFiles] = useState<DriveFile[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState('')
  const [error, setError] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropRef = useRef<HTMLDivElement>(null)

  const fetchFiles = useCallback(async () => {
    try {
      const res = await fetch(`/api/drive/files?moduleId=${moduleId}`)
      const data = await res.json()
      if (data.files) setFiles(data.files)
    } catch {
      console.error('Failed to fetch files')
    } finally {
      setLoading(false)
    }
  }, [moduleId])

  useEffect(() => { fetchFiles() }, [fetchFiles])

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    const droppedFiles = Array.from(e.dataTransfer.files)
    if (droppedFiles.length > 0) {
      await uploadFiles(droppedFiles)
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files
    if (selected && selected.length > 0) {
      await uploadFiles(Array.from(selected))
    }
    // Reset input so same file can be selected again
    e.target.value = ''
  }

  const uploadFiles = async (fileList: globalThis.File[]) => {
    setUploading(true)
    setError('')

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i]
      setUploadProgress(`Uploading ${file.name}${fileList.length > 1 ? ` (${i + 1}/${fileList.length})` : ''}...`)

      try {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('projectId', projectId)
        formData.append('moduleId', moduleId)
        formData.append('category', 'general')

        const res = await fetch('/api/drive/upload', { method: 'POST', body: formData })
        const data = await res.json()

        if (!res.ok) {
          setError(data.error || `Failed to upload ${file.name}`)
          break
        }
      } catch (err: any) {
        setError(err.message || `Failed to upload ${file.name}`)
        break
      }
    }

    setUploading(false)
    setUploadProgress('')
    await fetchFiles()
  }

  const handleDelete = async (fileId: string, fileName: string) => {
    if (!confirm(`Delete "${fileName}"? This removes it from Google Drive.`)) return

    try {
      const res = await fetch('/api/drive/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to delete file')
        return
      }
      setFiles(prev => prev.filter(f => f.id !== fileId))
    } catch {
      setError('Failed to delete file')
    }
  }

  return (
    <div className={`card ${styles.filesCard}`}>
      <div className="card-header">
        <h2 className="card-title">📁 Files</h2>
        <div className={styles.headerActions}>
          {files.length > 0 && (
            <span className="text-tiny text-dim">{files.length} file{files.length !== 1 ? 's' : ''}</span>
          )}
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <Upload size={14} /> Upload
          </button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />

      {error && (
        <div className={styles.errorBar}>{error}
          <button className={styles.dismissBtn} onClick={() => setError('')}>×</button>
        </div>
      )}

      {uploading && (
        <div className={styles.uploadingBar}>
          <Loader2 size={14} className={styles.spinner} />
          <span>{uploadProgress}</span>
        </div>
      )}

      {/* Drop Zone / File List */}
      <div
        ref={dropRef}
        className={`${styles.dropZone} ${isDragging ? styles.dropZoneActive : ''} ${files.length > 0 ? styles.dropZoneCompact : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {loading ? (
          <div className={styles.loadingState}>
            <Loader2 size={20} className={styles.spinner} />
            <span className="text-small text-muted">Loading files...</span>
          </div>
        ) : files.length === 0 ? (
          <div className={styles.emptyState} onClick={() => fileInputRef.current?.click()}>
            <Upload size={28} style={{ color: 'var(--color-text-muted)', opacity: 0.5 }} />
            <p className="text-small text-muted">Drag files here or click to upload</p>
            <p className="text-tiny text-dim">Files are stored in Google Drive</p>
          </div>
        ) : (
          <div className={styles.fileList}>
            {files.map(file => {
              const Icon = getFileIcon(file.mime_type)
              const ext = getExtension(file.name)
              const uploaderName = file.profiles?.full_name

              return (
                <div key={file.id} className={styles.fileRow}>
                  <div className={styles.fileIcon}>
                    <Icon size={16} />
                    <span className={styles.extBadge}>{ext}</span>
                  </div>
                  <div className={styles.fileInfo}>
                    <span className={styles.fileName}>{file.name}</span>
                    <span className="text-tiny text-dim">
                      {formatFileSize(file.size_bytes)}
                      {file.version > 1 && ` · v${file.version}`}
                      {uploaderName && ` · ${uploaderName}`}
                    </span>
                  </div>
                  <div className={styles.fileActions}>
                    {file.web_view_link && (
                      <a
                        href={file.web_view_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.fileActionBtn}
                        title="Open in Drive"
                      >
                        <ExternalLink size={14} />
                      </a>
                    )}
                    <button
                      className={`${styles.fileActionBtn} ${styles.deleteFileBtn}`}
                      onClick={() => handleDelete(file.id, file.name)}
                      title="Delete file"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              )
            })}

            {/* Compact drop target at bottom */}
            <div
              className={styles.addMoreZone}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={14} />
              <span>Drop files or click to add more</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
