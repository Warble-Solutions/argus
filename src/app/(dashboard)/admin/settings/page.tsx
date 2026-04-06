import { HardDrive, Mail, Bell, Shield, CheckCircle } from 'lucide-react'
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

        {/* Zoho Mail */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">
              <Mail size={18} style={{ color: 'var(--color-accent-emerald)' }} /> Zoho Mail
            </h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div className="input-group">
              <label className="input-label">Monitored Inbox</label>
              <input
                type="email"
                className="input-field"
                placeholder="lms@company.com"
              />
            </div>
            <div className="input-group">
              <label className="input-label">Webhook URL</label>
              <input
                type="text"
                className="input-field"
                defaultValue="https://your-app.vercel.app/api/zoho/webhook"
                readOnly
                style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}
              />
            </div>
            <div className={styles.connectionStatus}>
              <span className="text-small text-muted">Status:</span>
              <span className="badge badge-amber">Not Connected</span>
            </div>
            <button className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>
              Connect Zoho Mail
            </button>
          </div>
        </div>

        {/* Notifications */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">
              <Bell size={18} style={{ color: 'var(--color-accent-amber)' }} /> Notifications
            </h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <label className={styles.toggleRow}>
              <div>
                <span className="text-small">Email Digests</span>
                <p className="text-tiny text-dim">Receive daily task summary via email</p>
              </div>
              <input type="checkbox" className={styles.toggle} defaultChecked />
            </label>
            <label className={styles.toggleRow}>
              <div>
                <span className="text-small">Deadline Alerts</span>
                <p className="text-tiny text-dim">Get notified 48h before deadlines</p>
              </div>
              <input type="checkbox" className={styles.toggle} defaultChecked />
            </label>
            <label className={styles.toggleRow}>
              <div>
                <span className="text-small">Approval Notifications</span>
                <p className="text-tiny text-dim">Notify when new approvals are pending</p>
              </div>
              <input type="checkbox" className={styles.toggle} defaultChecked />
            </label>
          </div>
        </div>

        {/* Stage Gates */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">
              <Shield size={18} style={{ color: 'var(--color-accent-purple)' }} /> Stage Gate Rules
            </h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <label className={styles.toggleRow}>
              <div>
                <span className="text-small">Require Approval for Stage Transitions</span>
                <p className="text-tiny text-dim">Modules require manager approval before advancing stages</p>
              </div>
              <input type="checkbox" className={styles.toggle} defaultChecked />
            </label>
            <label className={styles.toggleRow}>
              <div>
                <span className="text-small">Require All Tasks Complete</span>
                <p className="text-tiny text-dim">All tasks must be &quot;Done&quot; before stage can advance</p>
              </div>
              <input type="checkbox" className={styles.toggle} />
            </label>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 'var(--space-6)', display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn btn-primary">Save Settings</button>
      </div>
    </div>
  )
}
