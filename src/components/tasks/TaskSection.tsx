'use client'

import { useState, useTransition } from 'react'
import { Plus, Clock, CheckCircle, Circle, AlertCircle, Send } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import DateTimePicker from '@/components/ui/DateTimePicker'
import { createTask, submitInternTask, updateTaskStatus } from '@/lib/actions/data'
import { TASK_PRIORITY_CONFIG, getInitials, formatMinutes } from '@/lib/utils'
import type { UserRole } from '@/types'
import styles from './TaskSection.module.css'

interface TaskSectionProps {
  tasks: any[]
  moduleId: string
  userRole?: UserRole
  teamMembers?: any[]
}

export default function TaskSection({ tasks, moduleId, userRole = 'manager', teamMembers = [] }: TaskSectionProps) {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  const isIntern = userRole === 'intern'
  const completedTasks = tasks.filter((t: any) => t.status === 'done').length
  const taskProgress = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0
  const employees = teamMembers.filter((u: any) => u.role !== 'intern')

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    const formData = new FormData(e.currentTarget)
    formData.append('module_id', moduleId)

    startTransition(async () => {
      try {
        if (isIntern) {
          await submitInternTask(formData)
          setSubmitted(true)
          setTimeout(() => {
            setShowCreateModal(false)
            setSubmitted(false)
          }, 2000)
        } else {
          await createTask(formData)
          setShowCreateModal(false)
        }
      } catch (err: any) {
        setError(err.message || 'Failed to create task')
      }
    })
  }

  const handleStatusChange = (taskId: string, newStatus: string) => {
    startTransition(async () => {
      try {
        await updateTaskStatus(taskId, newStatus)
      } catch (err: any) {
        console.error('Failed to update task status:', err)
      }
    })
  }

  return (
    <>
      <div className="card-header">
        <h2 className="card-title">📋 Tasks</h2>
        <button className="btn btn-primary btn-sm" id="new-task-btn" onClick={() => setShowCreateModal(true)}>
          {isIntern ? <><Send size={14} /> Suggest Task</> : <><Plus size={14} /> New Task</>}
        </button>
      </div>

      {/* Task Progress */}
      <div className={styles.taskProgressBar}>
        <div className="flex-between">
          <span className="text-small text-muted">Progress</span>
          <span className="text-small text-mono">{taskProgress}%</span>
        </div>
        <div className="progress-bar">
          <div className="progress-bar-fill" style={{ width: `${taskProgress}%` }} />
        </div>
      </div>

      {/* Tasks list */}
      <div className={styles.tasksList}>
        {tasks.length === 0 ? (
          <div className="empty-state" style={{ padding: 'var(--space-8) 0' }}>
            <Circle size={32} className="empty-state-icon" />
            <p className="empty-state-title">No tasks yet</p>
            <p className="empty-state-desc">Create tasks to track work on this module</p>
          </div>
        ) : (
          tasks.map((task: any) => {
            const taskPriority = TASK_PRIORITY_CONFIG[task.priority as keyof typeof TASK_PRIORITY_CONFIG] || { label: task.priority, cssClass: 'badge-neutral' }
            const assigneeName = task.profiles?.full_name

            return (
              <div key={task.id} className={styles.taskItem}>
                <div className={styles.taskCheckbox}>
                  {task.status === 'done' ? (
                    <CheckCircle size={18} style={{ color: 'var(--color-accent-emerald)' }} />
                  ) : task.status === 'blocked' ? (
                    <AlertCircle size={18} style={{ color: 'var(--color-accent-red)' }} />
                  ) : (
                    <Circle size={18} style={{ color: 'var(--color-text-muted)' }} />
                  )}
                </div>
                <div className={styles.taskContent}>
                  <span className={`${styles.taskTitle} ${task.status === 'done' ? styles.done : ''}`}>
                    {task.title}
                  </span>
                  <div className={styles.taskMeta}>
                    <span className={`badge ${taskPriority.cssClass}`}>{taskPriority.label}</span>
                    <span className="badge badge-neutral">{task.task_type}</span>
                    {task.status === 'in_progress' && (
                      <span className={styles.taskTimer}>
                        <Clock size={11} /> {formatMinutes(task.time_spent_minutes || 0)}
                      </span>
                    )}
                    {task.status === 'pending_review' && (
                      <span className="badge badge-amber">⏳ Pending Review</span>
                    )}
                    {task.status === 'revision' && (
                      <span className="badge badge-purple">🔄 Revision Needed</span>
                    )}
                  </div>
                </div>
                <div className={styles.taskRight}>
                  <select
                    className={styles.statusSelect}
                    defaultValue={task.status}
                    onChange={(e) => handleStatusChange(task.id, e.target.value)}
                    aria-label={`Status for ${task.title}`}
                    disabled={task.status === 'pending_review'}
                  >
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="done">Done</option>
                    <option value="blocked">Blocked</option>
                    {task.status === 'pending_review' && <option value="pending_review">Pending Review</option>}
                    {task.status === 'revision' && <option value="revision">Revision</option>}
                  </select>
                  {assigneeName && (
                    <div className="avatar avatar-sm" title={assigneeName}>
                      {getInitials(assigneeName)}
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Create Task Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => { setShowCreateModal(false); setSubmitted(false) }}
        title={isIntern ? 'Suggest a Task' : 'Create New Task'}
        footer={
          submitted ? null : (
          <>
            <button className="btn btn-ghost" onClick={() => setShowCreateModal(false)}>Cancel</button>
            <button className="btn btn-primary" form="create-task-form" type="submit" disabled={isPending}>
              {isPending ? 'Submitting...' : isIntern ? <><Send size={14} /> Submit for Approval</> : 'Create Task'}
            </button>
          </>
          )
        }
      >
        {submitted ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-6) 0' }}>
            <CheckCircle size={48} style={{ color: 'var(--color-accent-emerald)', marginBottom: 'var(--space-4)' }} />
            <p style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-semibold)', marginBottom: 'var(--space-2)' }}>Submitted for Approval</p>
            <p className="text-small text-muted">Your task suggestion has been sent to the approval queue.</p>
          </div>
        ) : (
        <form id="create-task-form" onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {error && <div style={{ padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)', color: '#f87171', fontSize: 'var(--text-sm)' }}>{error}</div>}
          {isIntern && (
            <div style={{ padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.2)', fontSize: 'var(--text-sm)', color: 'var(--color-accent-blue)' }}>
              💡 As an intern, your task suggestion will be reviewed before being created.
            </div>
          )}
          <div className="input-group">
            <label htmlFor="task-title" className="input-label">Task Title *</label>
            <input id="task-title" name="title" type="text" className="input-field" placeholder="e.g. Create storyboard for intro section" required autoFocus />
          </div>
          <div className="input-group">
            <label htmlFor="task-desc" className="input-label">{isIntern ? 'Why should this task be created? *' : 'Description'}</label>
            <textarea id="task-desc" name="description" className="input-field" placeholder={isIntern ? 'Explain why...' : 'Task details...'} rows={3} required={isIntern} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            <div className="input-group">
              <label htmlFor="task-type" className="input-label">Task Type</label>
              <select id="task-type" name="task_type" className="input-field">
                <option value="general">General</option>
                <option value="storyboard">Storyboard</option>
                <option value="video">Video</option>
                <option value="articulate">Articulate</option>
                <option value="review">Review</option>
                <option value="revision">Revision</option>
              </select>
            </div>
            <div className="input-group">
              <label htmlFor="task-priority" className="input-label">Priority</label>
              <select id="task-priority" name="priority" className="input-field">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>
          {!isIntern && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
              <div className="input-group">
                <label htmlFor="task-assignee" className="input-label">Assign To</label>
                <select id="task-assignee" name="assigned_to" className="input-field">
                  <option value="">Select team member</option>
                  {employees.map((u: any) => (
                    <option key={u.id} value={u.id}>{u.full_name}</option>
                  ))}
                </select>
              </div>
              <div className="input-group">
                <label htmlFor="task-due" className="input-label">Due Date</label>
                <DateTimePicker id="task-due" name="due_date" className="input-field" />
              </div>
            </div>
          )}
        </form>
        )}
      </Modal>
    </>
  )
}
