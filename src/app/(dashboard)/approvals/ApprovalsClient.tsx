'use client'

import { useState, useTransition } from 'react'
import { CheckCircle, XCircle, Clock, MessageSquare, ChevronDown, ChevronUp, Filter, AlertCircle } from 'lucide-react'
import { approveRequest, rejectRequest } from '@/lib/actions/data'
import { getInitials, formatRelativeDate } from '@/lib/utils'
import styles from './page.module.css'

type TabFilter = 'pending' | 'reviewed' | 'all'

interface ApprovalsClientProps {
  approvals: any[]
}

export default function ApprovalsClient({ approvals }: ApprovalsClientProps) {
  const [tab, setTab] = useState<TabFilter>('pending')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [feedbackMap, setFeedbackMap] = useState<Record<string, string>>({})
  const [isPending, startTransition] = useTransition()
  const [actionError, setActionError] = useState<Record<string, string>>({})
  const [confirmReject, setConfirmReject] = useState<string | null>(null)

  const filtered = approvals.filter(a => {
    if (tab === 'pending') return a.status === 'pending'
    if (tab === 'reviewed') return a.status !== 'pending'
    return true
  })

  const pendingCount = approvals.filter(a => a.status === 'pending').length
  const reviewedCount = approvals.filter(a => a.status !== 'pending').length

  const handleApprove = (id: string) => {
    setActionError(prev => ({ ...prev, [id]: '' }))
    startTransition(async () => {
      try {
        await approveRequest(id, feedbackMap[id])
        setExpandedId(null)
        setFeedbackMap(prev => { const next = { ...prev }; delete next[id]; return next })
      } catch (err: any) {
        setActionError(prev => ({ ...prev, [id]: err.message }))
      }
    })
  }

  const handleReject = (id: string) => {
    const feedback = feedbackMap[id]?.trim()
    if (!feedback) {
      setActionError(prev => ({ ...prev, [id]: 'Feedback is required when rejecting. Explain why this request is being denied.' }))
      setExpandedId(id)
      return
    }
    setActionError(prev => ({ ...prev, [id]: '' }))
    startTransition(async () => {
      try {
        await rejectRequest(id, feedback)
        setConfirmReject(null)
        setExpandedId(null)
        setFeedbackMap(prev => { const next = { ...prev }; delete next[id]; return next })
      } catch (err: any) {
        setActionError(prev => ({ ...prev, [id]: err.message }))
      }
    })
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Approval Queue</h1>
          <p className="page-subtitle">{pendingCount} pending · {reviewedCount} reviewed</p>
        </div>
      </div>

      {/* Tab Filters */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${tab === 'pending' ? styles.tabActive : ''}`}
          onClick={() => setTab('pending')}
        >
          <Clock size={14} /> Pending {pendingCount > 0 && <span className={styles.tabBadge}>{pendingCount}</span>}
        </button>
        <button
          className={`${styles.tab} ${tab === 'reviewed' ? styles.tabActive : ''}`}
          onClick={() => setTab('reviewed')}
        >
          <Filter size={14} /> Reviewed
        </button>
        <button
          className={`${styles.tab} ${tab === 'all' ? styles.tabActive : ''}`}
          onClick={() => setTab('all')}
        >
          All
        </button>
      </div>

      {/* Approvals List */}
      <div className={styles.approvalList}>
        {filtered.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <CheckCircle size={40} className="empty-state-icon" />
              <h2 className="empty-state-title">
                {tab === 'pending' ? 'All caught up!' : 'No reviewed items yet'}
              </h2>
              <p className="empty-state-desc">
                {tab === 'pending'
                  ? 'No pending approvals at the moment.'
                  : 'Reviewed approvals will appear here.'}
              </p>
            </div>
          </div>
        ) : (
          filtered.map(approval => {
            const requester = approval.profiles
            const isExpanded = expandedId === approval.id
            const isPendingItem = approval.status === 'pending'
            const isRejectConfirm = confirmReject === approval.id

            return (
              <div key={approval.id} className={`card ${styles.approvalCard} ${!isPendingItem ? styles.reviewed : ''}`}>
                {/* Header */}
                <div className={styles.approvalHeader}>
                  <div className={styles.approvalType}>
                    <span className={`badge ${approval.type === 'intern_task' ? 'badge-blue' : approval.type === 'task_completion' ? 'badge-purple' : 'badge-amber'}`}>
                      {approval.type === 'intern_task' ? '📝 Task Request' : approval.type === 'task_completion' ? '✅ Task Review' : '🔒 Stage Gate'}
                    </span>
                    {!isPendingItem && (
                      <span className={`badge ${approval.status === 'approved' ? 'badge-emerald' : 'badge-red'}`}>
                        {approval.status === 'approved' ? '✓ Approved' : '✗ Rejected'}
                      </span>
                    )}
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

                {/* Body */}
                <div className={styles.approvalBody}>
                  <h3 className={styles.approvalTitle}>{approval.title || 'Approval Request'}</h3>
                  {approval.description && (
                    <p className={styles.approvalDesc}>{approval.description}</p>
                  )}
                  {approval.type === 'stage_gate' && approval.metadata && (
                    <div className={styles.stageInfo}>
                      <span className="badge badge-neutral">{(approval.metadata as any).from_status}</span>
                      <span className="text-dim">→</span>
                      <span className="badge badge-emerald">{(approval.metadata as any).to_status}</span>
                    </div>
                  )}
                </div>

                {/* Existing feedback (for reviewed items) */}
                {!isPendingItem && approval.feedback && (
                  <div className={styles.existingFeedback}>
                    <MessageSquare size={14} />
                    <div>
                      <span className="text-tiny text-dim">Reviewer feedback</span>
                      <p className={styles.feedbackText}>{approval.feedback}</p>
                    </div>
                  </div>
                )}

                {/* Actions (only for pending) */}
                {isPendingItem && (
                  <>
                    {/* Error message */}
                    {actionError[approval.id] && (
                      <div className={styles.errorBar}>
                        <AlertCircle size={14} />
                        {actionError[approval.id]}
                      </div>
                    )}

                    {/* Feedback Toggle */}
                    <button
                      className={styles.feedbackToggle}
                      onClick={() => setExpandedId(isExpanded ? null : approval.id)}
                    >
                      <MessageSquare size={14} />
                      {isExpanded ? 'Hide feedback' : 'Add feedback'}
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>

                    {/* Expandable Feedback Area */}
                    {isExpanded && (
                      <div className={styles.feedbackSection}>
                        <textarea
                          className="input-field"
                          placeholder="Write your feedback here... (required for rejection)"
                          rows={3}
                          value={feedbackMap[approval.id] || ''}
                          onChange={e => setFeedbackMap(prev => ({ ...prev, [approval.id]: e.target.value }))}
                          autoFocus
                        />
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className={styles.approvalActions}>
                      {isRejectConfirm ? (
                        <>
                          <span className="text-small text-danger" style={{ marginRight: 'auto' }}>
                            Confirm rejection?
                          </span>
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => setConfirmReject(null)}
                            disabled={isPending}
                          >
                            Cancel
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleReject(approval.id)}
                            disabled={isPending}
                          >
                            {isPending ? 'Rejecting...' : <><XCircle size={14} /> Yes, Reject</>}
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            className="btn btn-success btn-sm"
                            onClick={() => handleApprove(approval.id)}
                            disabled={isPending}
                            id={`approve-${approval.id}`}
                          >
                            {isPending ? 'Approving...' : <><CheckCircle size={14} /> Approve</>}
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => {
                              if (!feedbackMap[approval.id]?.trim()) {
                                setExpandedId(approval.id)
                                setConfirmReject(approval.id)
                                setActionError(prev => ({ ...prev, [approval.id]: 'Feedback is required when rejecting.' }))
                              } else {
                                setConfirmReject(approval.id)
                              }
                            }}
                            disabled={isPending}
                            id={`reject-${approval.id}`}
                          >
                            <XCircle size={14} /> Reject
                          </button>
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
