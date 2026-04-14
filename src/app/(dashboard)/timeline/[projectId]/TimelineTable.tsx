'use client'

import { useState, useTransition, useRef, useEffect, useCallback } from 'react'
import { Download, Plus, MessageSquare, Package, CheckCircle, ChevronDown, Eye } from 'lucide-react'
import { recordVersionDelivered, recordFeedbackReceived, markScormApproved } from '@/lib/actions/data'
import Modal from '@/components/ui/Modal'
import ModuleHistoryPopup from '@/components/timeline/ModuleHistoryPopup'
import styles from './page.module.css'

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
  module_number: number
  title: string
  language: string | null
  remark: string | null
  status: string
  current_version: number
  scorm_status: string
  scorm_approved_at: string | null
  module_versions: Version[]
}

interface TimelineTableProps {
  project: any
  modules: Module[]
  userRole: string
}

function formatShortDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function TimelineTable({ project, modules, userRole }: TimelineTableProps) {
  const [isPending, startTransition] = useTransition()
  const [selectedModule, setSelectedModule] = useState<Module | null>(null)
  const [actionMenuId, setActionMenuId] = useState<string | null>(null)
  const [menuPos, setMenuPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 })
  const menuRef = useRef<HTMLDivElement>(null)
  const isVernacular = project.is_vernacular
  const canManage = ['admin', 'manager', 'employee'].includes(userRole)

  // Close menu on outside click or scroll
  useEffect(() => {
    if (!actionMenuId) return
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActionMenuId(null)
      }
    }
    const handleScroll = () => setActionMenuId(null)
    document.addEventListener('mousedown', handleClick)
    window.addEventListener('scroll', handleScroll, true)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      window.removeEventListener('scroll', handleScroll, true)
    }
  }, [actionMenuId])

  const openMenu = useCallback((moduleId: string, btnEl: HTMLButtonElement) => {
    if (actionMenuId === moduleId) {
      setActionMenuId(null)
      return
    }
    const rect = btnEl.getBoundingClientRect()
    setMenuPos({ top: rect.top - 4, left: rect.right })
    setActionMenuId(moduleId)
  }, [actionMenuId])

  // Group by language if vernacular
  const grouped = isVernacular
    ? modules.reduce((acc, mod) => {
        const lang = mod.language || 'Unassigned'
        if (!acc[lang]) acc[lang] = []
        acc[lang].push(mod)
        return acc
      }, {} as Record<string, Module[]>)
    : { '': modules }

  const handleRecordVersion = (moduleId: string, type: 'story' | 'scorm') => {
    startTransition(async () => {
      try {
        await recordVersionDelivered(moduleId, type)
        setActionMenuId(null)
      } catch (err: any) {
        alert(err.message)
      }
    })
  }

  const handleRecordFeedback = (versionId: string) => {
    startTransition(async () => {
      try {
        await recordFeedbackReceived(versionId)
        setActionMenuId(null)
      } catch (err: any) {
        alert(err.message)
      }
    })
  }

  const handleApproveScorm = (moduleId: string) => {
    startTransition(async () => {
      try {
        await markScormApproved(moduleId)
        setActionMenuId(null)
      } catch (err: any) {
        alert(err.message)
      }
    })
  }

  const handleDownloadCSV = () => {
    window.open(`/api/timeline/export?projectId=${project.id}`, '_blank')
  }

  const getLatestVersion = (mod: Module, type: 'story' | 'scorm') => {
    const versions = mod.module_versions
      .filter(v => v.type === type)
      .sort((a, b) => b.version_number - a.version_number)
    return versions[0] || null
  }

  const getLatestFeedbackPending = (mod: Module): Version | null => {
    const pending = mod.module_versions
      .filter(v => v.delivered_at && !v.feedback_received_at)
      .sort((a, b) => b.version_number - a.version_number)
    return pending[0] || null
  }

  // Find the currently active module for the fixed menu
  const activeModule = actionMenuId ? modules.find(m => m.id === actionMenuId) : null
  const activeFeedbackPending = activeModule ? getLatestFeedbackPending(activeModule) : null
  const activeLatestScorm = activeModule ? getLatestVersion(activeModule, 'scorm') : null

  return (
    <>
      {/* Header Actions */}
      <div className={styles.tableActions}>
        <span className="text-small text-muted">{modules.length} modules</span>
        <button className="btn btn-ghost btn-sm" onClick={handleDownloadCSV}>
          <Download size={14} /> Export CSV
        </button>
      </div>

      {/* Table */}
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.thNum}>#</th>
              {isVernacular && <th className={styles.thLang}>Language</th>}
              <th className={styles.thName}>Module</th>
              <th className={styles.thVersion}>Latest Story</th>
              <th className={styles.thDate}>Delivered</th>
              <th className={styles.thDate}>Feedback</th>
              <th className={styles.thVersion}>Latest SCORM</th>
              <th className={styles.thDate}>SCORM Date</th>
              <th className={styles.thRemark}>Remark</th>
              {canManage && <th className={styles.thActions}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {Object.entries(grouped).map(([lang, mods]) => (
              <>
                {isVernacular && lang && (
                  <tr key={`lang-${lang}`} className={styles.langHeader}>
                    <td colSpan={canManage ? 10 : 9} className={styles.langCell}>
                      🌐 {lang}
                    </td>
                  </tr>
                )}
                {mods.map((mod) => {
                  const latestStory = getLatestVersion(mod, 'story')
                  const latestScorm = getLatestVersion(mod, 'scorm')

                  return (
                    <tr key={mod.id} className={styles.row}>
                      <td className={styles.cellNum}>{mod.module_number}</td>
                      {isVernacular && <td className={styles.cellLang}>{mod.language || '—'}</td>}
                      <td className={styles.cellName}>
                        <button
                          className={styles.moduleName}
                          onClick={() => setSelectedModule(mod)}
                        >
                          {mod.title}
                          <Eye size={12} className={styles.viewIcon} />
                        </button>
                      </td>
                      <td className={styles.cellVersion}>
                        {latestStory ? (
                          <span className="badge badge-blue">v{latestStory.version_number}</span>
                        ) : (
                          <span className="text-dim">—</span>
                        )}
                      </td>
                      <td className={styles.cellDate}>{formatShortDate(latestStory?.delivered_at)}</td>
                      <td className={styles.cellDate}>
                        {latestStory?.feedback_received_at ? (
                          formatShortDate(latestStory.feedback_received_at)
                        ) : latestStory?.delivered_at ? (
                          <span className={styles.pending}>Pending</span>
                        ) : '—'}
                      </td>
                      <td className={styles.cellVersion}>
                        {mod.scorm_status === 'approved' ? (
                          <span className="badge badge-emerald">✅ Approved</span>
                        ) : latestScorm ? (
                          <span className="badge badge-amber">v{latestScorm.version_number}</span>
                        ) : (
                          <span className="text-dim">—</span>
                        )}
                      </td>
                      <td className={styles.cellDate}>
                        {mod.scorm_approved_at
                          ? formatShortDate(mod.scorm_approved_at)
                          : formatShortDate(latestScorm?.delivered_at)}
                      </td>
                      <td className={styles.cellRemark}>
                        <span className={styles.remarkText}>{mod.remark || '—'}</span>
                      </td>
                      {canManage && (
                        <td className={styles.cellActions}>
                          <button
                            className={styles.actionBtn}
                            onClick={(e) => openMenu(mod.id, e.currentTarget)}
                            disabled={isPending}
                          >
                            <Plus size={14} />
                            <ChevronDown size={10} />
                          </button>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </>
            ))}
          </tbody>
        </table>
      </div>

      {/* Fixed-position Action Menu (rendered outside table wrapper) */}
      {actionMenuId && activeModule && (
        <div
          ref={menuRef}
          className={styles.actionMenu}
          style={{
            position: 'fixed',
            top: menuPos.top,
            left: menuPos.left,
            transform: 'translate(-100%, -100%)',
          }}
        >
          <button onClick={() => handleRecordVersion(activeModule.id, 'story')} className={styles.menuItem}>
            <Package size={13} /> Record Story Version
          </button>
          {activeFeedbackPending && (
            <button onClick={() => handleRecordFeedback(activeFeedbackPending.id)} className={styles.menuItem}>
              <MessageSquare size={13} /> Record Feedback Received
            </button>
          )}
          <button onClick={() => handleRecordVersion(activeModule.id, 'scorm')} className={styles.menuItem}>
            <Package size={13} /> Record SCORM Version
          </button>
          {activeModule.scorm_status !== 'approved' && activeLatestScorm && (
            <button onClick={() => handleApproveScorm(activeModule.id)} className={styles.menuItem}>
              <CheckCircle size={13} /> Approve SCORM
            </button>
          )}
        </div>
      )}

      {/* Module History Popup */}
      {selectedModule && (
        <Modal
          isOpen={true}
          title={`${selectedModule.title} — Version History`}
          onClose={() => setSelectedModule(null)}
        >
          <ModuleHistoryPopup
            module={selectedModule}
            onRecordVersion={(type) => handleRecordVersion(selectedModule.id, type)}
            onRecordFeedback={handleRecordFeedback}
            onApproveScorm={() => handleApproveScorm(selectedModule.id)}
            canManage={canManage}
            isPending={isPending}
          />
        </Modal>
      )}
    </>
  )
}
