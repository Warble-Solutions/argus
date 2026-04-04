'use client'

import { useState, useEffect } from 'react'
import { Bell, Search, Menu } from 'lucide-react'
import { getInitials } from '@/lib/utils'
import Seeker from '@/components/search/Seeker'
import type { UserRole } from '@/types'
import styles from './Topbar.module.css'

interface TopbarProps {
  user: { full_name: string; role: UserRole } | null
}

export default function Topbar({ user }: TopbarProps) {
  const [showNotifications, setShowNotifications] = useState(false)
  const [showSeeker, setShowSeeker] = useState(false)

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
          <div className={styles.notifWrapper}>
            <button
              className={styles.iconBtn}
              onClick={() => setShowNotifications(!showNotifications)}
              aria-label="Notifications"
              id="notification-bell"
            >
              <Bell size={20} />
            </button>

            {showNotifications && (
              <div className={styles.notifPanel}>
                <div className={styles.notifHeader}>
                  <h3>Notifications</h3>
                  <button className={styles.markAllRead}>Mark all read</button>
                </div>
                <div className={styles.notifList}>
                  <p className={styles.notifEmpty}>No notifications yet</p>
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
