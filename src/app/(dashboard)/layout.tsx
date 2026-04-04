import Sidebar from '@/components/layout/Sidebar'
import Topbar from '@/components/layout/Topbar'
import { getCurrentUser } from '@/lib/actions/auth'
import { getNotifications, getUnreadCount } from '@/lib/actions/data'
import styles from './layout.module.css'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()
  const [notifications, unreadCount] = await Promise.all([
    getNotifications(15),
    getUnreadCount(),
  ])

  return (
    <div className={styles.dashboardShell}>
      <Sidebar user={user} />
      <Topbar user={user} notifications={notifications} unreadCount={unreadCount} />
      <main className={styles.mainContent}>
        {children}
      </main>
    </div>
  )
}
