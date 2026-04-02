'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Bell, Search, Menu } from 'lucide-react'
import { getInitials, formatRelativeDate } from '@/lib/utils'
import type { UserRole } from '@/types'
import styles from './Topbar.module.css'

interface TopbarProps {
  user: { full_name: string; role: UserRole } | null
}

export default function Topbar({ user }: TopbarProps) {
  const [showNotifications, setShowNotifications] = useState(false)

  const userName = user?.full_name || 'User'

  return (
    <header className={styles.topbar}>
      <div className={styles.left}>
        <button className={`${styles.menuBtn} hide-desktop`} aria-label="Open menu">
          <Menu size={20} />
        </button>
        <div className={styles.searchBar}>
          <Search size={16} className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search projects, modules, tasks..."
            className={styles.searchInput}
            id="global-search"
          />
          <span className={styles.searchShortcut}>⌘K</span>
        </div>
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
  )
}
