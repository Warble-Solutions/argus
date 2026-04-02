import Sidebar from '@/components/layout/Sidebar'
import Topbar from '@/components/layout/Topbar'
import { getCurrentUser } from '@/lib/actions/auth'
import styles from './layout.module.css'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()

  return (
    <div className={styles.dashboardShell}>
      <Sidebar user={user} />
      <Topbar user={user} />
      <main className={styles.mainContent}>
        {children}
      </main>
    </div>
  )
}
