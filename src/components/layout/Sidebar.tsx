'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  MessageSquare,
  FolderKanban,
  FileUp,
  Mail,
  ClipboardCheck,
  BarChart3,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
  Eye,
} from 'lucide-react'
import { getInitials } from '@/lib/utils'
import { currentUser } from '@/lib/mock-data'
import type { UserRole } from '@/types'
import styles from './Sidebar.module.css'

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
  badge?: number
  roles?: UserRole[]
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/', icon: <LayoutDashboard size={20} /> },
  { label: 'Chat', href: '/chat', icon: <MessageSquare size={20} /> },
  { label: 'Projects', href: '/projects', icon: <FolderKanban size={20} /> },
  { label: 'Approvals', href: '/approvals', icon: <ClipboardCheck size={20} />, badge: 3 },
  { label: 'Files', href: '/files', icon: <FileUp size={20} /> },
  { label: 'Emails', href: '/emails', icon: <Mail size={20} />, roles: ['admin', 'manager', 'employee'] },
  { label: 'Analytics', href: '/admin', icon: <BarChart3 size={20} />, roles: ['admin', 'manager'] },
  { label: 'Team', href: '/admin/team', icon: <Users size={20} />, roles: ['admin', 'manager'] },
  { label: 'Settings', href: '/admin/settings', icon: <Settings size={20} />, roles: ['admin', 'manager'] },
]

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()
  const user = currentUser

  const filteredItems = navItems.filter(item => {
    if (!item.roles) return true
    return item.roles.includes(user.role)
  })

  return (
    <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''}`}>
      {/* Logo */}
      <div className={styles.logo}>
        <div className={styles.logoIcon}>
          <Eye size={collapsed ? 20 : 24} />
        </div>
        {!collapsed && (
          <div className={styles.logoText}>
            <span className={styles.logoTitle}>ARGUS</span>
            <span className={styles.logoSubtitle}>LMS Coordinator</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className={styles.nav}>
        {filteredItems.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== '/' && pathname.startsWith(item.href))

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navItem} ${isActive ? styles.active : ''}`}
              title={collapsed ? item.label : undefined}
            >
              <span className={styles.navIcon}>{item.icon}</span>
              {!collapsed && (
                <>
                  <span className={styles.navLabel}>{item.label}</span>
                  {item.badge && item.badge > 0 && (
                    <span className={styles.navBadge}>{item.badge}</span>
                  )}
                </>
              )}
              {collapsed && item.badge && item.badge > 0 && (
                <span className={styles.navBadgeCollapsed} />
              )}
            </Link>
          )
        })}
      </nav>

      {/* User Info */}
      <div className={styles.userSection}>
        <div className={styles.userAvatar}>
          {getInitials(user.full_name)}
        </div>
        {!collapsed && (
          <div className={styles.userInfo}>
            <span className={styles.userName}>{user.full_name}</span>
            <span className={styles.userRole}>{user.role}</span>
          </div>
        )}
      </div>

      {/* Collapse Toggle */}
      <button
        className={styles.collapseBtn}
        onClick={() => setCollapsed(!collapsed)}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>
    </aside>
  )
}
