'use client'

import { useState, useTransition } from 'react'
import { Plus, Clock, CheckCircle, Circle, AlertCircle, Send, Pencil, Trash2, MoreHorizontal } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import DateTimePicker from '@/components/ui/DateTimePicker'
import { createTask, submitInternTask, updateTaskStatus, updateTask, deleteTask } from '@/lib/actions/data'
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
  const [editingTask, setEditingTask] = useState<any>(null)
  const [deletingTask, setDeletingTask] = useState<any>(null)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
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

  const handleEditSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      try {
        await updateTask(editingTask.id, formData)
        setEditingTask(null)
      } catch (err: any) {
        setError(err.message || 'Failed to update task')
      }
    })
  }

  const handleDelete = () => {
    if (!deletingTask) return
    setError('')
    startTransition(async () => {
      try {
        await deleteTask(deletingTask.id)
        setDeletingTask(null)
      } catch (err: any) {
        setError(err.message || 'Failed to delete task')
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
            const isMenuOpen = openMenuId === task.id

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

                  {/* Actions Menu */}
                  {!isIntern && (
                    <div className={styles.taskMenu}>
                      <button
                        className={styles.menuBtn}
                        onClick={() => setOpenMenuId(isMenuOpen ? null : task.id)}
                        aria-label="Task actions"
                      >
                        <MoreHorizontal size={16} />
                      </button>
                      {isMenuOpen && (
                        <div className={styles.menuDropdown}>
                          <button
                            className={styles.menuItem}
                            onClick={() => { setEditingTask(task); setOpenMenuId(null) }}
                          >
                            <Pencil size={13} /> Edit
                          </button>
                          <button
                            className={`${styles.menuItem} ${styles.menuItemDanger}`}
                            onClick={() => { setDeletingTask(task); setOpenMenuId(null) }}
                          >
                            <Trash2 size={13} /> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* ═══ Create Task Modal ═══ */}
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
          {error && <div className={styles.errorBar}>{error}</div>}
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

      {/* ═══ Edit Task Modal ═══ */}
      <Modal
        isOpen={!!editingTask}
        onClose={() => { setEditingTask(null); setError('') }}
        title="Edit Task"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => { setEditingTask(null); setError('') }}>Cancel</button>
            <button className="btn btn-primary" form="edit-task-form" type="submit" disabled={isPending}>
              {isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </>
        }
      >
        {editingTask && (
          <form id="edit-task-form" onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {error && <div className={styles.errorBar}>{error}</div>}
            <div className="input-group">
              <label htmlFor="edit-task-title" className="input-label">Task Title *</label>
              <input id="edit-task-title" name="title" type="text" className="input-field" defaultValue={editingTask.title} required autoFocus />
            </div>
            <div className="input-group">
              <label htmlFor="edit-task-desc" className="input-label">Description</label>
              <textarea id="edit-task-desc" name="description" className="input-field" defaultValue={editingTask.description || ''} rows={3} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
              <div className="input-group">
                <label htmlFor="edit-task-type" className="input-label">Task Type</label>
                <select id="edit-task-type" name="task_type" className="input-field" defaultValue={editingTask.task_type}>
                  <option value="general">General</option>
                  <option value="storyboard">Storyboard</option>
                  <option value="video">Video</option>
                  <option value="articulate">Articulate</option>
                  <option value="review">Review</option>
                  <option value="revision">Revision</option>
                </select>
              </div>
              <div className="input-group">
                <label htmlFor="edit-task-priority" className="input-label">Priority</label>
                <select id="edit-task-priority" name="priority" className="input-field" defaultValue={editingTask.priority}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
              <div className="input-group">
                <label htmlFor="edit-task-assignee" className="input-label">Assign To</label>
                <select id="edit-task-assignee" name="assigned_to" className="input-field" defaultValue={editingTask.assigned_to || ''}>
                  <option value="">Unassigned</option>
                  {employees.map((u: any) => (
                    <option key={u.id} value={u.id}>{u.full_name}</option>
                  ))}
                </select>
              </div>
              <div className="input-group">
                <label htmlFor="edit-task-due" className="input-label">Due Date</label>
                <DateTimePicker id="edit-task-due" name="due_date" className="input-field" defaultValue={editingTask.due_date || undefined} />
              </div>
            </div>
          </form>
        )}
      </Modal>

      {/* ═══ Delete Task Modal ═══ */}
      <Modal
        isOpen={!!deletingTask}
        onClose={() => { setDeletingTask(null); setError('') }}
        title="Delete Task"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => { setDeletingTask(null); setError('') }}>Cancel</button>
            <button className="btn btn-danger" onClick={handleDelete} disabled={isPending}>
              {isPending ? 'Deleting...' : 'Delete Task'}
            </button>
          </>
        }
      >
        {deletingTask && (
          <div>
            {error && <div className={styles.errorBar} style={{ marginBottom: 'var(--space-3)' }}>{error}</div>}
            <p className="text-small" style={{ color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
              Are you sure you want to delete <strong style={{ color: 'var(--color-text-primary)' }}>&quot;{deletingTask.title}&quot;</strong>?
              This action cannot be undone. All time entries linked to this task will also be removed.
            </p>
          </div>
        )}
      </Modal>
    </>
  )
}
