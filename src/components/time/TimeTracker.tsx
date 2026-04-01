'use client'

import { useState, useEffect, useRef } from 'react'
import { Play, Square, Plus, Clock } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import { formatMinutes } from '@/lib/utils'
import styles from './TimeTracker.module.css'

interface TimeEntry {
  id: string
  duration: number
  notes: string
  date: string
}

interface TimeTrackerProps {
  moduleId: string
  totalMinutes: number
}

export default function TimeTracker({ moduleId, totalMinutes }: TimeTrackerProps) {
  const [isRunning, setIsRunning] = useState(false)
  const [elapsed, setElapsed] = useState(0) // seconds
  const [showLogModal, setShowLogModal] = useState(false)
  const [manualHours, setManualHours] = useState('')
  const [manualMinutes, setManualMinutes] = useState('')
  const [manualNotes, setManualNotes] = useState('')
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Timer tick
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setElapsed(prev => prev + 1)
      }, 1000)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isRunning])

  const toggleTimer = () => {
    if (isRunning) {
      // Stop timer — would save the entry to DB
      const minutes = Math.round(elapsed / 60)
      if (minutes > 0) {
        alert(`Timer stopped. ${formatMinutes(minutes)} logged.\n\nThis will auto-save once Supabase is connected.`)
      }
      setElapsed(0)
    }
    setIsRunning(!isRunning)
  }

  const handleManualLog = (e: React.FormEvent) => {
    e.preventDefault()
    const totalMins = (parseInt(manualHours || '0') * 60) + parseInt(manualMinutes || '0')
    if (totalMins > 0) {
      alert(`${formatMinutes(totalMins)} logged manually.\n\nThis will save once Supabase is connected.`)
    }
    setShowLogModal(false)
    setManualHours('')
    setManualMinutes('')
    setManualNotes('')
  }

  const formatTimer = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600)
    const m = Math.floor((totalSeconds % 3600) / 60)
    const s = totalSeconds % 60
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  return (
    <div className={`card ${styles.timeCard}`}>
      <div className="card-header">
        <h2 className="card-title">⏱ Time Tracking</h2>
        <button className="btn btn-ghost btn-sm" onClick={() => setShowLogModal(true)}>
          <Plus size={14} /> Log Time
        </button>
      </div>

      {/* Timer Display */}
      <div className={styles.timerSection}>
        <div className={styles.timerDisplay}>
          <span className={`${styles.timerValue} ${isRunning ? styles.active : ''}`}>
            {formatTimer(elapsed)}
          </span>
        </div>
        <button
          className={`btn ${isRunning ? 'btn-danger' : 'btn-primary'} btn-sm`}
          onClick={toggleTimer}
          id="timer-toggle-btn"
        >
          {isRunning ? (
            <><Square size={14} /> Stop</>
          ) : (
            <><Play size={14} /> Start Timer</>
          )}
        </button>
      </div>

      {/* Total Today */}
      <div className={styles.totalSection}>
        <div className={styles.totalRow}>
          <span className="text-small text-muted">Total logged</span>
          <span className="text-small text-mono">{formatMinutes(totalMinutes)}</span>
        </div>
        <div className={styles.totalRow}>
          <span className="text-small text-muted">This session</span>
          <span className={`text-small text-mono ${isRunning ? styles.activeText : ''}`}>
            {formatMinutes(Math.round(elapsed / 60))}
          </span>
        </div>
      </div>

      {/* Manual Log Modal */}
      <Modal
        isOpen={showLogModal}
        onClose={() => setShowLogModal(false)}
        title="Log Time Manually"
        maxWidth="400px"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setShowLogModal(false)}>Cancel</button>
            <button className="btn btn-primary" form="log-time-form" type="submit">Log Time</button>
          </>
        }
      >
        <form id="log-time-form" onSubmit={handleManualLog} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            <div className="input-group">
              <label htmlFor="log-hours" className="input-label">Hours</label>
              <input
                id="log-hours"
                type="number"
                className="input-field"
                placeholder="0"
                min="0"
                max="24"
                value={manualHours}
                onChange={e => setManualHours(e.target.value)}
                autoFocus
              />
            </div>
            <div className="input-group">
              <label htmlFor="log-minutes" className="input-label">Minutes</label>
              <input
                id="log-minutes"
                type="number"
                className="input-field"
                placeholder="0"
                min="0"
                max="59"
                value={manualMinutes}
                onChange={e => setManualMinutes(e.target.value)}
              />
            </div>
          </div>
          <div className="input-group">
            <label htmlFor="log-notes" className="input-label">Notes (optional)</label>
            <textarea
              id="log-notes"
              className="input-field"
              placeholder="What did you work on?"
              value={manualNotes}
              onChange={e => setManualNotes(e.target.value)}
              rows={2}
            />
          </div>
        </form>
      </Modal>
    </div>
  )
}
