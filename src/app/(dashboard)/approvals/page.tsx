import { CheckCircle, XCircle, Edit3, Clock } from 'lucide-react'
import { mockApprovals, getUserById } from '@/lib/mock-data'
import { getInitials, formatRelativeDate } from '@/lib/utils'
import styles from './page.module.css'

export default function ApprovalsPage() {
  const pendingApprovals = mockApprovals.filter(a => a.status === 'pending')

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Approval Queue</h1>
          <p className="page-subtitle">{pendingApprovals.length} pending approvals</p>
        </div>
      </div>

      <div className={styles.approvalList}>
        {pendingApprovals.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <CheckCircle size={40} className="empty-state-icon" />
              <h2 className="empty-state-title">All caught up!</h2>
              <p className="empty-state-desc">No pending approvals at the moment.</p>
            </div>
          </div>
        ) : (
          pendingApprovals.map(approval => {
            const requester = getUserById(approval.requester_id)
            const payload = approval.payload as Record<string, string>

            return (
              <div key={approval.id} className={`card ${styles.approvalCard}`}>
                <div className={styles.approvalHeader}>
                  <div className={styles.approvalType}>
                    <span className={`badge ${approval.type === 'task_creation' ? 'badge-blue' : approval.type === 'stage_gate' ? 'badge-amber' : 'badge-purple'}`}>
                      {approval.type === 'task_creation' ? '📝 Task Request' : approval.type === 'stage_gate' ? '🔒 Stage Gate' : '📦 Completion'}
                    </span>
                    <span className="text-tiny text-dim">
                      <Clock size={11} style={{ display: 'inline', verticalAlign: '-1px' }} /> {formatRelativeDate(approval.created_at)}
                    </span>
                  </div>

                  {requester && (
                    <div className={styles.requester}>
                      <div className="avatar avatar-sm">{getInitials(requester.full_name)}</div>
                      <div>
                        <span className="text-small">{requester.full_name}</span>
                        <span className={`badge badge-neutral ${styles.roleBadge}`}>{requester.role}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className={styles.approvalBody}>
                  <h3 className={styles.approvalTitle}>{payload.title || payload.module_title || 'Approval Request'}</h3>
                  {payload.description && (
                    <p className={styles.approvalDesc}>{payload.description}</p>
                  )}
                  {approval.type === 'stage_gate' && (
                    <div className={styles.stageInfo}>
                      <span className="badge badge-neutral">{payload.from_status}</span>
                      <span className="text-dim">→</span>
                      <span className="badge badge-emerald">{payload.to_status}</span>
                    </div>
                  )}
                </div>

                <div className={styles.approvalActions}>
                  <button className="btn btn-success btn-sm" id={`approve-${approval.id}`}>
                    <CheckCircle size={14} /> Approve
                  </button>
                  <button className="btn btn-ghost btn-sm" id={`modify-${approval.id}`}>
                    <Edit3 size={14} /> Modify & Approve
                  </button>
                  <button className="btn btn-danger btn-sm" id={`reject-${approval.id}`}>
                    <XCircle size={14} /> Reject
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
