import { Settings, HardDrive, Mail, Bell, FileText, Shield } from 'lucide-react'
import styles from './page.module.css'

export default function SettingsPage() {
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
            <div className="input-group">
              <label className="input-label">Root Folder Name</label>
              <input
                type="text"
                className="input-field"
                defaultValue="Argus_LMS_Production"
                placeholder="Root folder name in Google Drive"
              />
              <p className="text-tiny text-dim" style={{ marginTop: 'var(--space-1)' }}>
                All project folders will be created under this root folder.
              </p>
            </div>
            <div className={styles.connectionStatus}>
              <span className="text-small text-muted">Connection Status:</span>
              <span className="badge badge-amber">Not Connected</span>
            </div>
            <button className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>
              Connect Google Drive
            </button>
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
