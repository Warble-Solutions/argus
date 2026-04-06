'use client'

import { useState, useRef, useCallback } from 'react'
import {
  FolderOpen, Upload, Search, FileText, Image, Film, Music, Archive,
  Trash2, ExternalLink, Download, X, ChevronRight, HardDrive,
  File as FileIcon, Clock, User, Tag, AlertCircle, CheckCircle, Loader2,
} from 'lucide-react'
import styles from './page.module.css'

interface Project {
  id: string
  name: string
  client_name: string
  drive_folder_id: string | null
}

interface DriveFile {
  id: string
  project_id: string
  module_id: string | null
  drive_file_id: string
  name: string
  mime_type: string | null
  size_bytes: number | null
  category: string
  version: number
  web_view_link: string | null
  thumbnail_link: string | null
  uploaded_by: string
  created_at: string
  profiles?: { full_name: string }
  projects?: { name: string }
  modules?: { title: string; module_number: number } | null
}

interface FilesClientProps {
  driveConnected: boolean
  driveEmail: string | null
  projects: Project[]
  recentFiles: DriveFile[]
  userRole: string
}

function formatFileSize(bytes: number | null) {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

function getFileIcon(mimeType: string | null) {
  if (!mimeType) return <FileIcon size={20} />
  if (mimeType.startsWith('image/')) return <Image size={20} />
  if (mimeType.startsWith('video/')) return <Film size={20} />
  if (mimeType.startsWith('audio/')) return <Music size={20} />
  if (mimeType.includes('pdf')) return <FileText size={20} />
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('tar')) return <Archive size={20} />
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return <FileText size={20} />
  return <FileIcon size={20} />
}

function getFileIconClass(mimeType: string | null) {
  if (!mimeType) return styles.iconDefault
  if (mimeType.startsWith('image/')) return styles.iconImage
  if (mimeType.startsWith('video/')) return styles.iconVideo
  if (mimeType.startsWith('audio/')) return styles.iconAudio
  if (mimeType.includes('pdf')) return styles.iconPdf
  return styles.iconDefault
}

function getFileExtension(name: string): string {
  const parts = name.split('.')
  if (parts.length < 2) return 'FILE'
  return parts[parts.length - 1].toUpperCase()
}

function getPreviewIcon(mimeType: string | null) {
  if (!mimeType) return <FileIcon size={32} />
  if (mimeType.startsWith('video/')) return <Film size={32} />
  if (mimeType.startsWith('audio/')) return <Music size={32} />
  if (mimeType.includes('pdf')) return <FileText size={32} />
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('tar') || mimeType.includes('compressed')) return <Archive size={32} />
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return <FileText size={32} />
  return <FileIcon size={32} />
}

function isImageType(mimeType: string | null): boolean {
  return !!mimeType && mimeType.startsWith('image/')
}

function timeAgo(dateStr: string) {
  const d = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return d.toLocaleDateString()
}

export default function FilesClient({
  driveConnected,
  driveEmail,
  projects,
  recentFiles,
  userRole,
}: FilesClientProps) {
  const [files, setFiles] = useState<DriveFile[]>(recentFiles)
  const [selectedProject, setSelectedProject] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showUpload, setShowUpload] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProject, setUploadProject] = useState('')
  const [uploadCategory, setUploadCategory] = useState('general')
  const [customCategory, setCustomCategory] = useState('')
  const [dragActive, setDragActive] = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const canDelete = userRole !== 'intern'

  // Filter files by project and search
  const filteredFiles = files.filter(f => {
    if (selectedProject && f.project_id !== selectedProject) return false
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      return f.name.toLowerCase().includes(q) ||
        f.category.toLowerCase().includes(q) ||
        f.projects?.name?.toLowerCase().includes(q) ||
        f.modules?.title?.toLowerCase().includes(q)
    }
    return true
  })

  // Upload handler
  const handleUpload = useCallback(async (fileList: FileList) => {
    const targetProject = uploadProject
    if (!targetProject) return

    setUploading(true)
    const category = uploadCategory === 'custom' ? customCategory : uploadCategory

    try {
      for (const file of Array.from(fileList)) {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('projectId', targetProject)
        formData.append('category', category || 'general')

        const res = await fetch('/api/drive/upload', { method: 'POST', body: formData })
        const data = await res.json()

        if (data.success && data.file) {
          setFiles(prev => [data.file, ...prev])
        }
      }

      setUploadSuccess(`${fileList.length} file(s) uploaded successfully!`)
      setTimeout(() => setUploadSuccess(null), 3000)
      setShowUpload(false)
    } catch (err) {
      console.error('Upload failed:', err)
    } finally {
      setUploading(false)
    }
  }, [uploadProject, uploadCategory, customCategory])

  // Delete handler
  const handleDelete = async (fileId: string) => {
    try {
      const res = await fetch('/api/drive/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId }),
      })

      if (res.ok) {
        setFiles(prev => prev.filter(f => f.id !== fileId))
      }
    } catch (err) {
      console.error('Delete failed:', err)
    }
    setDeleteConfirm(null)
  }

  // Drag handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true)
    else if (e.type === 'dragleave') setDragActive(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files?.length) {
      handleUpload(e.dataTransfer.files)
    }
  }

  // Not connected state
  if (!driveConnected) {
    return (
      <div className="page-container">
        <div className="page-header">
          <div>
            <h1 className="page-title">File Manager</h1>
            <p className="page-subtitle">Browse and upload files to Google Drive</p>
          </div>
        </div>
        <div className="card">
          <div className="empty-state">
            <HardDrive size={48} className="empty-state-icon" />
            <h2 className="empty-state-title">Google Drive Not Connected</h2>
            <p className="empty-state-desc">
              An admin needs to connect Google Drive in Settings to enable file management.
            </p>
            {(userRole === 'admin' || userRole === 'manager') && (
              <a href="/admin/settings" className="btn btn-primary">
                Go to Settings
              </a>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">File Manager</h1>
          <p className="page-subtitle">
            <HardDrive size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
            Connected as {driveEmail}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowUpload(true)} id="upload-btn">
          <Upload size={16} /> Upload Files
        </button>
      </div>

      {/* Success toast */}
      {uploadSuccess && (
        <div className={styles.toast}>
          <CheckCircle size={16} /> {uploadSuccess}
        </div>
      )}

      {/* Filters */}
      <div className={styles.filters}>
        <div className={styles.searchBox}>
          <Search size={16} />
          <input
            type="text"
            placeholder="Search files..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
        </div>

        <div className={styles.projectTabs}>
          <button
            className={`${styles.projectTab} ${!selectedProject ? styles.projectTabActive : ''}`}
            onClick={() => setSelectedProject(null)}
          >
            All Files
          </button>
          {projects.map(p => (
            <button
              key={p.id}
              className={`${styles.projectTab} ${selectedProject === p.id ? styles.projectTabActive : ''}`}
              onClick={() => setSelectedProject(p.id)}
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      {/* Files grid */}
      {filteredFiles.length > 0 ? (
        <div className={styles.filesGrid}>
          {filteredFiles.map(file => (
            <div key={file.id} className={styles.fileCard}>
              {/* Preview area */}
              <div className={`${styles.filePreview} ${getFileIconClass(file.mime_type)}`}>
                {isImageType(file.mime_type) && file.thumbnail_link ? (
                  <img
                    src={file.thumbnail_link}
                    alt={file.name}
                    className={styles.previewImage}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                      (e.target as HTMLImageElement).parentElement!.classList.add(styles.previewFallback);
                    }}
                  />
                ) : (
                  <div className={styles.previewBadge}>
                    {getPreviewIcon(file.mime_type)}
                    <span className={styles.previewExt}>{getFileExtension(file.name)}</span>
                  </div>
                )}
                {/* Actions overlay */}
                <div className={styles.previewActions}>
                  {file.web_view_link && (
                    <a
                      href={file.web_view_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.previewAction}
                      title="Open in Drive"
                    >
                      <ExternalLink size={14} />
                    </a>
                  )}
                  {canDelete && (
                    <button
                      className={`${styles.previewAction} ${styles.previewActionDanger}`}
                      onClick={() => setDeleteConfirm(file.id)}
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Info area */}
              <div className={styles.fileInfo}>
                <h3 className={styles.fileName}>{file.name}</h3>

                <div className={styles.fileMeta}>
                  <span className={styles.fileMetaItem}>
                    <Tag size={12} /> {file.category}
                  </span>
                  {file.version > 1 && (
                    <span className={styles.fileMetaItem}>v{file.version}</span>
                  )}
                  <span className={styles.fileMetaItem}>
                    {formatFileSize(file.size_bytes)}
                  </span>
                </div>

                <div className={styles.fileFooter}>
                  <span className={styles.fileUploader}>
                    <User size={12} /> {file.profiles?.full_name || 'Unknown'}
                  </span>
                  <span className={styles.fileTime}>
                    <Clock size={12} /> {timeAgo(file.created_at)}
                  </span>
                </div>

                {(file.projects || file.modules) && (
                  <div className={styles.fileBreadcrumb}>
                    {file.projects?.name}
                    {file.modules && (
                      <>
                        <ChevronRight size={10} />
                        Module {file.modules.module_number}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card">
          <div className="empty-state">
            <FolderOpen size={48} className="empty-state-icon" />
            <h2 className="empty-state-title">
              {searchQuery ? 'No files match your search' : 'No files yet'}
            </h2>
            <p className="empty-state-desc">
              {searchQuery
                ? 'Try a different search term.'
                : 'Upload files to get started. They\'ll be organized in Google Drive automatically.'}
            </p>
            {!searchQuery && (
              <button className="btn btn-primary" onClick={() => setShowUpload(true)}>
                <Upload size={16} /> Upload First File
              </button>
            )}
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUpload && (
        <div className={styles.modalOverlay} onClick={() => !uploading && setShowUpload(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Upload Files</h2>
              <button className={styles.modalClose} onClick={() => setShowUpload(false)}>
                <X size={18} />
              </button>
            </div>

            <div className={styles.modalBody}>
              {/* Project selector */}
              <div className="input-group">
                <label className="input-label">Project *</label>
                <select
                  className="input-field"
                  value={uploadProject}
                  onChange={e => setUploadProject(e.target.value)}
                >
                  <option value="">Select a project</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name} — {p.client_name}</option>
                  ))}
                </select>
              </div>

              {/* Category */}
              <div className="input-group">
                <label className="input-label">Category</label>
                <select
                  className="input-field"
                  value={uploadCategory}
                  onChange={e => setUploadCategory(e.target.value)}
                >
                  <option value="general">General</option>
                  <option value="storyboard">Storyboard</option>
                  <option value="asset">Asset</option>
                  <option value="deliverable">Deliverable</option>
                  <option value="reference">Reference</option>
                  <option value="review">Review</option>
                  <option value="custom">Custom...</option>
                </select>
                {uploadCategory === 'custom' && (
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Enter category name"
                    value={customCategory}
                    onChange={e => setCustomCategory(e.target.value)}
                    style={{ marginTop: 8 }}
                  />
                )}
              </div>

              {/* Drop zone */}
              <div
                className={`${styles.dropZone} ${dragActive ? styles.dropZoneActive : ''}`}
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploading ? (
                  <div className={styles.uploadingState}>
                    <Loader2 size={32} className={styles.spinner} />
                    <p>Uploading to Google Drive...</p>
                  </div>
                ) : (
                  <>
                    <Upload size={32} className={styles.dropIcon} />
                    <p className={styles.dropText}>Drag & drop files here</p>
                    <p className={styles.dropHint}>or click to browse</p>
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className={styles.fileInput}
                  onChange={e => e.target.files && handleUpload(e.target.files)}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <div className={styles.modalOverlay} onClick={() => setDeleteConfirm(null)}>
          <div className={styles.confirmModal} onClick={e => e.stopPropagation()}>
            <AlertCircle size={32} className={styles.confirmIcon} />
            <h3>Delete this file?</h3>
            <p className={styles.confirmText}>This will remove it from Google Drive permanently.</p>
            <div className={styles.confirmActions}>
              <button className="btn" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => handleDelete(deleteConfirm)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
