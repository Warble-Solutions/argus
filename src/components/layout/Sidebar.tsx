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
  LogOut,
} from 'lucide-react'
import { getInitials } from '@/lib/utils'
import { signOut } from '@/lib/actions/auth'
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
  { label: 'Approvals', href: '/approvals', icon: <ClipboardCheck size={20} /> },
  { label: 'Files', href: '/files', icon: <FileUp size={20} /> },
  { label: 'Emails', href: '/emails', icon: <Mail size={20} />, roles: ['admin', 'manager', 'employee'] },
  { label: 'Analytics', href: '/admin', icon: <BarChart3 size={20} />, roles: ['admin', 'manager'] },
  { label: 'Team', href: '/admin/team', icon: <Users size={20} />, roles: ['admin', 'manager'] },
  { label: 'Settings', href: '/admin/settings', icon: <Settings size={20} />, roles: ['admin', 'manager'] },
]

interface SidebarProps {
  user: { full_name: string; role: UserRole } | null
}

export default function Sidebar({ user }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()

  const userName = user?.full_name || 'User'
  const userRole = (user?.role || 'employee') as UserRole

  const filteredItems = navItems.filter(item => {
    if (!item.roles) return true
    return item.roles.includes(userRole)
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
            <span className={styles.logoSubtitle}>The Seer</span>
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

      {/* User Info + Sign Out */}
      <div className={styles.userSection}>
        <div className={styles.userAvatar}>
          {getInitials(userName)}
        </div>
        {!collapsed && (
          <div className={styles.userInfo}>
            <span className={styles.userName}>{userName}</span>
            <span className={styles.userRole}>{userRole}</span>
          </div>
        )}
      </div>

      {!collapsed && (
        <form action={signOut}>
          <button type="submit" className={styles.navItem} style={{ width: '100%', border: 'none', cursor: 'pointer', background: 'none', marginBottom: 'var(--space-2)' }}>
            <span className={styles.navIcon}><LogOut size={20} /></span>
            <span className={styles.navLabel}>Sign Out</span>
          </button>
        </form>
      )}

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
