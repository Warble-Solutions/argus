'use client'

import { useState, useEffect, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, Search, Menu, CheckCheck, ExternalLink } from 'lucide-react'
import { getInitials } from '@/lib/utils'
import { markNotificationRead, markAllNotificationsRead } from '@/lib/actions/data'
import Seeker from '@/components/search/Seeker'
import type { UserRole } from '@/types'
import styles from './Topbar.module.css'

interface Notification {
  id: string
  title: string
  message: string
  type: string
  is_read: boolean
  link: string | null
  created_at: string
}

interface TopbarProps {
  user: { full_name: string; role: UserRole } | null
  notifications?: Notification[]
  unreadCount?: number
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

const typeIcon: Record<string, string> = {
  assignment: '📋',
  deadline: '⏰',
  approval: '✅',
  stage_gate: '🚪',
  general: '🔔',
}

export default function Topbar({ user, notifications = [], unreadCount = 0 }: TopbarProps) {
  const [showNotifications, setShowNotifications] = useState(false)
  const [showSeeker, setShowSeeker] = useState(false)
  const [isPending, startTransition] = useTransition()
  const panelRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const userName = user?.full_name || 'User'

  // Global keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setShowSeeker(true)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Close panel on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setShowNotifications(false)
      }
    }
    if (showNotifications) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showNotifications])

  const handleMarkRead = (notifId: string) => {
    startTransition(async () => {
      await markNotificationRead(notifId)
    })
  }

  const handleMarkAllRead = () => {
    startTransition(async () => {
      await markAllNotificationsRead()
    })
  }

  const handleNotifClick = (notif: Notification) => {
    if (!notif.is_read) handleMarkRead(notif.id)
    if (notif.link) {
      router.push(notif.link)
      setShowNotifications(false)
    }
  }

  return (
    <>
      <header className={styles.topbar}>
        <div className={styles.left}>
          <button className={`${styles.menuBtn} hide-desktop`} aria-label="Open menu">
            <Menu size={20} />
          </button>
          <button
            className={styles.searchBtn}
            onClick={() => setShowSeeker(true)}
            aria-label="Open Seeker search"
            id="seeker-trigger"
          >
            <Search size={18} />
            <span className={styles.searchLabel}>Ctrl+K</span>
          </button>
        </div>

        <div className={styles.right}>
          {/* Notification Bell */}
          <div className={styles.notifWrapper} ref={panelRef}>
            <button
              className={styles.iconBtn}
              onClick={() => setShowNotifications(!showNotifications)}
              aria-label="Notifications"
              id="notification-bell"
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className={styles.badge}>{unreadCount > 9 ? '9+' : unreadCount}</span>
              )}
            </button>

            {showNotifications && (
              <div className={styles.notifPanel}>
                <div className={styles.notifHeader}>
                  <h3>Notifications</h3>
                  {unreadCount > 0 && (
                    <button
                      className={styles.markAllRead}
                      onClick={handleMarkAllRead}
                      disabled={isPending}
                    >
                      <CheckCheck size={14} /> Mark all read
                    </button>
                  )}
                </div>
                <div className={styles.notifList}>
                  {notifications.length === 0 ? (
                    <p className={styles.notifEmpty}>No notifications yet</p>
                  ) : (
                    notifications.map(notif => (
                      <button
                        key={notif.id}
                        className={`${styles.notifItem} ${!notif.is_read ? styles.unread : ''}`}
                        onClick={() => handleNotifClick(notif)}
                      >
                        <span className={styles.notifIcon}>
                          {typeIcon[notif.type] || '🔔'}
                        </span>
                        <div className={styles.notifContent}>
                          <span className={styles.notifTitle}>{notif.title}</span>
                          <span className={styles.notifMessage}>{notif.message}</span>
                          <span className={styles.notifTime}>{timeAgo(notif.created_at)}</span>
                        </div>
                        {notif.link && <ExternalLink size={12} className={styles.notifLinkIcon} />}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Avatar */}
          <div className={styles.userChip}>
            <div className={styles.avatar}>
              {getInitials(userName)}
            </div>
            <span className={`${styles.userName} hide-mobile`}>{userName}</span>
          </div>
        </div>
      </header>

      {/* Seeker Modal */}
      <Seeker isOpen={showSeeker} onClose={() => setShowSeeker(false)} />
    </>
  )
}
