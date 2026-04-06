import type { ModuleStatus, TaskStatus, TaskPriority } from '@/types'

export const MODULE_STATUS_CONFIG: Record<ModuleStatus, { label: string; color: string; cssClass: string }> = {
  not_started: { label: 'Not Started', color: '#64748b', cssClass: 'badge-neutral' },
  storyboard: { label: 'Storyboard', color: '#8b5cf6', cssClass: 'badge-purple' },
  video_production: { label: 'Video Production', color: '#3b82f6', cssClass: 'badge-blue' },
  articulate: { label: 'Articulate', color: '#06b6d4', cssClass: 'badge-blue' },
  review: { label: 'Review', color: '#f59e0b', cssClass: 'badge-amber' },
  revision: { label: 'Revision', color: '#ef4444', cssClass: 'badge-red' },
  approved: { label: 'Approved', color: '#10b981', cssClass: 'badge-emerald' },
  delivered: { label: 'Delivered', color: '#10b981', cssClass: 'badge-emerald' },
}

export const TASK_STATUS_CONFIG: Record<TaskStatus, { label: string; dotClass: string }> = {
  todo: { label: 'To Do', dotClass: 'not-started' },
  in_progress: { label: 'In Progress', dotClass: 'in-progress' },
  done: { label: 'Done', dotClass: 'done' },
  blocked: { label: 'Blocked', dotClass: 'blocked' },
}

export const TASK_PRIORITY_CONFIG: Record<TaskPriority, { label: string; cssClass: string }> = {
  low: { label: 'Low', cssClass: 'badge-neutral' },
  medium: { label: 'Medium', cssClass: 'badge-blue' },
  high: { label: 'High', cssClass: 'badge-amber' },
  urgent: { label: 'Urgent', cssClass: 'badge-red' },
}

export const MODULE_STAGES_ORDER: ModuleStatus[] = [
  'not_started',
  'storyboard',
  'video_production',
  'articulate',
  'review',
  'revision',
  'approved',
  'delivered',
]

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    timeZone: 'Asia/Kolkata',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-US', {
    timeZone: 'Asia/Kolkata',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

export function formatRelativeDate(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  return formatDate(dateStr)
}

export function getMinutesUntil(dateStr: string): number {
  const now = new Date()
  const date = new Date(dateStr)
  return Math.ceil((date.getTime() - now.getTime()) / (1000 * 60))
}

export function getHoursUntil(dateStr: string): number {
  return Math.ceil(getMinutesUntil(dateStr) / 60)
}

export function getDaysUntil(dateStr: string): number {
  return Math.ceil(getHoursUntil(dateStr) / 24)
}

export function getDeadlineStatus(dateStr: string): 'overdue' | 'urgent' | 'upcoming' | 'safe' {
  const hours = getHoursUntil(dateStr)
  if (hours < 0) return 'overdue'
  if (hours <= 48) return 'urgent'
  if (hours <= 168) return 'upcoming' // 7 days
  return 'safe'
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

export function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours === 0) return `${mins}m`
  if (mins === 0) return `${hours}h`
  return `${hours}h ${mins}m`
}
