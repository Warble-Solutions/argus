'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Bell, Search, Menu } from 'lucide-react'
import { currentUser, getNotificationsForUser, getUnreadNotificationCount } from '@/lib/mock-data'
import { getInitials, formatRelativeDate } from '@/lib/utils'
import styles from './Topbar.module.css'

export default function Topbar() {
  const [showNotifications, setShowNotifications] = useState(false)
  const user = currentUser
  const notifications = getNotificationsForUser(user.id)
  const unreadCount = getUnreadNotificationCount(user.id)

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
            {unreadCount > 0 && (
              <span className={styles.notifBadge}>{unreadCount}</span>
            )}
          </button>

          {showNotifications && (
            <div className={styles.notifPanel}>
              <div className={styles.notifHeader}>
                <h3>Notifications</h3>
                <button className={styles.markAllRead}>Mark all read</button>
              </div>
              <div className={styles.notifList}>
                {notifications.length === 0 ? (
                  <p className={styles.notifEmpty}>No notifications</p>
                ) : (
                  notifications.map(n => (
                    <Link
                      key={n.id}
                      href={n.link || '#'}
                      className={`${styles.notifItem} ${!n.is_read ? styles.unread : ''}`}
                      onClick={() => setShowNotifications(false)}
                    >
                      <div className={styles.notifDot} />
                      <div className={styles.notifContent}>
                        <span className={styles.notifTitle}>{n.title}</span>
                        <span className={styles.notifMessage}>{n.message}</span>
                        <span className={styles.notifTime}>{formatRelativeDate(n.created_at)}</span>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Avatar */}
        <div className={styles.userChip}>
          <div className={styles.avatar}>
            {getInitials(user.full_name)}
          </div>
          <span className={`${styles.userName} hide-mobile`}>{user.full_name}</span>
        </div>
      </div>
    </header>
  )
}
