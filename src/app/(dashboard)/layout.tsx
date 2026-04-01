import Sidebar from '@/components/layout/Sidebar'
import Topbar from '@/components/layout/Topbar'
import styles from './layout.module.css'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className={styles.dashboardShell}>
      <Sidebar />
      <Topbar />
      <main className={styles.mainContent}>
        {children}
      </main>
    </div>
  )
}
