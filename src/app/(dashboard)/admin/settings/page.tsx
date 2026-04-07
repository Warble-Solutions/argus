import { HardDrive, Mail, Bell, Shield, CheckCircle, Lock } from 'lucide-react'
import { getDriveConnectionInfo } from '@/lib/google/drive'
import styles from './page.module.css'

export default async function SettingsPage() {
  let driveInfo: { connected: boolean; email?: string | null; connectedAt?: string | null; rootFolderId?: string | null } | null = null
  try {
    driveInfo = await getDriveConnectionInfo()
  } catch {}

  const isConnected = !!driveInfo?.connected

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Configure integrations and preferences</p>
        </div>
      </div>

      <div className={styles.settingsGrid}>
        {/* Google Drive */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">
              <HardDrive size={18} style={{ color: 'var(--color-accent-blue)' }} /> Google Drive
            </h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {isConnected ? (
              <>
                <div className={styles.connectionStatus}>
                  <span className="text-small text-muted">Connection Status:</span>
                  <span className="badge badge-emerald">
                    <CheckCircle size={12} style={{ marginRight: 4 }} /> Connected
                  </span>
                </div>
                <div className={styles.connectionStatus}>
                  <span className="text-small text-muted">Connected Account:</span>
                  <span className="text-small">{driveInfo?.email || 'Unknown'}</span>
                </div>
                <p className="text-tiny text-dim">
                  Files are automatically organized in the &quot;Argus Projects&quot; folder in your Drive.
                </p>
              </>
            ) : (
              <>
                <div className={styles.connectionStatus}>
                  <span className="text-small text-muted">Connection Status:</span>
                  <span className="badge badge-amber">Not Connected</span>
                </div>
                <p className="text-tiny text-dim">
                  Connect your Google Drive to enable automatic folder creation and file management for all projects.
                </p>
                <a href="/api/drive/connect" className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>
                  Connect Google Drive
                </a>
              </>
            )}
          </div>
        </div>

        {/* Zoho Mail — Coming Soon */}
        <div className="card" style={{ opacity: 0.6 }}>
          <div className="card-header">
            <h2 className="card-title">
              <Mail size={18} style={{ color: 'var(--color-accent-emerald)' }} /> Zoho Mail
            </h2>
            <span className="badge badge-neutral"><Lock size={10} /> Coming Soon</span>
          </div>
          <p className="text-small text-muted" style={{ lineHeight: 1.5 }}>
            Connect your Zoho Mail to automatically monitor client communications, extract action items, and send approval emails.
          </p>
        </div>

        {/* Notifications — Coming Soon */}
        <div className="card" style={{ opacity: 0.6 }}>
          <div className="card-header">
            <h2 className="card-title">
              <Bell size={18} style={{ color: 'var(--color-accent-amber)' }} /> Notification Preferences
            </h2>
            <span className="badge badge-neutral"><Lock size={10} /> Coming Soon</span>
          </div>
          <p className="text-small text-muted" style={{ lineHeight: 1.5 }}>
            Customize email digests, deadline alerts, and approval notification frequency.
          </p>
        </div>

        {/* Stage Gates — Coming Soon */}
        <div className="card" style={{ opacity: 0.6 }}>
          <div className="card-header">
            <h2 className="card-title">
              <Shield size={18} style={{ color: 'var(--color-accent-purple)' }} /> Stage Gate Rules
            </h2>
            <span className="badge badge-neutral"><Lock size={10} /> Coming Soon</span>
          </div>
          <p className="text-small text-muted" style={{ lineHeight: 1.5 }}>
            Configure stage transition rules, require manager approval, and enforce task completion before advancement.
          </p>
        </div>
      </div>
    </div>
  )
}
