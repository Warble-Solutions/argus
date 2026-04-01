import { FolderOpen, Upload, Search } from 'lucide-react'

export default function FilesPage() {
  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">File Manager</h1>
          <p className="page-subtitle">Browse and upload files to Google Drive</p>
        </div>
        <button className="btn btn-primary" id="upload-btn">
          <Upload size={16} /> Upload Files
        </button>
      </div>

      <div className="card">
        <div className="empty-state">
          <FolderOpen size={48} className="empty-state-icon" />
          <h2 className="empty-state-title">Connect Google Drive</h2>
          <p className="empty-state-desc">
            Connect your Google Drive account to browse, upload, and manage LMS production files directly from Argus.
          </p>
          <button className="btn btn-primary">
            Connect Google Drive
          </button>
        </div>
      </div>
    </div>
  )
}
