import { Package, MessageSquare, CheckCircle, Plus } from 'lucide-react'
import styles from './ModuleHistoryPopup.module.css'

interface Version {
  id: string
  version_number: number
  type: 'story' | 'scorm'
  delivered_at: string | null
  feedback_received_at: string | null
  notes: string | null
}

interface Module {
  id: string
  title: string
  module_number: number
  language: string | null
  remark: string | null
  status: string
  current_version: number
  scorm_status: string
  scorm_approved_at: string | null
  module_versions: Version[]
}

interface Props {
  module: Module
  onRecordVersion: (type: 'story' | 'scorm') => void
  onRecordFeedback: (versionId: string) => void
  onApproveScorm: () => void
  canManage: boolean
  isPending: boolean
}

function fmtDate(d: string | null): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function ModuleHistoryPopup({ module: mod, onRecordVersion, onRecordFeedback, onApproveScorm, canManage, isPending }: Props) {
  const storyVersions = mod.module_versions
    .filter(v => v.type === 'story')
    .sort((a, b) => a.version_number - b.version_number)

  const scormVersions = mod.module_versions
    .filter(v => v.type === 'scorm')
    .sort((a, b) => a.version_number - b.version_number)

  return (
    <div className={styles.popup}>
      {/* Module info */}
      <div className={styles.infoRow}>
        <span className="text-tiny text-dim">Module #{mod.module_number}</span>
        {mod.language && <span className="badge badge-purple">{mod.language}</span>}
        <span className={`badge ${mod.status === 'approved' || mod.status === 'delivered' ? 'badge-emerald' : 'badge-blue'}`}>
          {mod.status}
        </span>
      </div>
      {mod.remark && (
        <p className="text-small text-muted" style={{ marginBottom: 'var(--space-4)' }}>
          <strong>Remark:</strong> {mod.remark}
        </p>
      )}

      {/* Story Versions */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>📦 Story Versions</h3>
          {canManage && (
            <button className="btn btn-ghost btn-sm" onClick={() => onRecordVersion('story')} disabled={isPending}>
              <Plus size={12} /> Record Delivery
            </button>
          )}
        </div>
        {storyVersions.length === 0 ? (
          <p className="text-small text-muted" style={{ padding: 'var(--space-3) 0' }}>No story versions recorded yet</p>
        ) : (
          <div className={styles.versionList}>
            {storyVersions.map((v) => (
              <div key={v.id} className={styles.versionRow}>
                <span className={styles.versionBadge}>v{v.version_number}</span>
                <div className={styles.versionDates}>
                  <div className={styles.dateRow}>
                    <Package size={12} />
                    <span>Delivered: <strong>{fmtDate(v.delivered_at)}</strong></span>
                  </div>
                  <div className={styles.dateRow}>
                    <MessageSquare size={12} />
                    <span>Feedback: <strong>{v.feedback_received_at ? fmtDate(v.feedback_received_at) : (
                      canManage && v.delivered_at ? (
                        <button className={styles.recordBtn} onClick={() => onRecordFeedback(v.id)} disabled={isPending}>
                          Record Feedback
                        </button>
                      ) : <span className={styles.pendingLabel}>Pending</span>
                    )}</strong></span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SCORM Versions */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>🎯 SCORM Versions</h3>
          {canManage && (
            <button className="btn btn-ghost btn-sm" onClick={() => onRecordVersion('scorm')} disabled={isPending}>
              <Plus size={12} /> Record Delivery
            </button>
          )}
        </div>
        {scormVersions.length === 0 ? (
          <p className="text-small text-muted" style={{ padding: 'var(--space-3) 0' }}>No SCORM versions yet</p>
        ) : (
          <div className={styles.versionList}>
            {scormVersions.map((v) => (
              <div key={v.id} className={styles.versionRow}>
                <span className={`${styles.versionBadge} ${styles.scormBadge}`}>v{v.version_number}</span>
                <div className={styles.versionDates}>
                  <div className={styles.dateRow}>
                    <Package size={12} />
                    <span>Delivered: <strong>{fmtDate(v.delivered_at)}</strong></span>
                  </div>
                  <div className={styles.dateRow}>
                    <MessageSquare size={12} />
                    <span>Feedback: <strong>{v.feedback_received_at ? fmtDate(v.feedback_received_at) : (
                      canManage && v.delivered_at ? (
                        <button className={styles.recordBtn} onClick={() => onRecordFeedback(v.id)} disabled={isPending}>
                          Record Feedback
                        </button>
                      ) : <span className={styles.pendingLabel}>Pending</span>
                    )}</strong></span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* SCORM Approval */}
        {mod.scorm_status === 'approved' ? (
          <div className={styles.approvedBanner}>
            <CheckCircle size={16} />
            SCORM Approved on {fmtDate(mod.scorm_approved_at)}
          </div>
        ) : canManage && scormVersions.length > 0 ? (
          <button className="btn btn-primary btn-sm" onClick={onApproveScorm} disabled={isPending} style={{ marginTop: 'var(--space-3)' }}>
            <CheckCircle size={14} /> Approve SCORM
          </button>
        ) : null}
      </div>
    </div>
  )
}
