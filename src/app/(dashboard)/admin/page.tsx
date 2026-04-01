import { BarChart3, TrendingUp, Users, Clock } from 'lucide-react'
import styles from './page.module.css'

export default function AdminPage() {
  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Analytics</h1>
          <p className="page-subtitle">Team performance and production metrics</p>
        </div>
      </div>

      {/* Placeholder Stats */}
      <div className="grid-stats" style={{ marginBottom: 'var(--space-8)' }}>
        <div className="card stat-card" style={{ '--stat-color': 'var(--color-accent-blue)' } as React.CSSProperties}>
          <div className="card-body">
            <div className="flex-row">
              <TrendingUp size={20} style={{ color: 'var(--color-accent-blue)' }} />
              <span className="text-small text-muted">Avg Quality Index</span>
            </div>
            <div className="stat-value">0.78</div>
            <div className="stat-change positive">
              <TrendingUp size={12} />
              <span>+5% vs last month</span>
            </div>
          </div>
        </div>

        <div className="card stat-card" style={{ '--stat-color': 'var(--color-accent-emerald)' } as React.CSSProperties}>
          <div className="card-body">
            <div className="flex-row">
              <Clock size={20} style={{ color: 'var(--color-accent-emerald)' }} />
              <span className="text-small text-muted">Avg Turnaround</span>
            </div>
            <div className="stat-value">4.2<span className="text-small text-muted"> days</span></div>
            <div className="stat-change positive">
              <TrendingUp size={12} />
              <span>0.8 days faster</span>
            </div>
          </div>
        </div>

        <div className="card stat-card" style={{ '--stat-color': 'var(--color-accent-purple)' } as React.CSSProperties}>
          <div className="card-body">
            <div className="flex-row">
              <Users size={20} style={{ color: 'var(--color-accent-purple)' }} />
              <span className="text-small text-muted">Team Members</span>
            </div>
            <div className="stat-value">5</div>
            <div className="stat-change positive">
              <span>3 employees, 2 interns</span>
            </div>
          </div>
        </div>

        <div className="card stat-card" style={{ '--stat-color': 'var(--color-accent-amber)' } as React.CSSProperties}>
          <div className="card-body">
            <div className="flex-row">
              <BarChart3 size={20} style={{ color: 'var(--color-accent-amber)' }} />
              <span className="text-small text-muted">Modules Delivered</span>
            </div>
            <div className="stat-value">12</div>
            <div className="stat-change positive">
              <span>This quarter</span>
            </div>
          </div>
        </div>
      </div>

      {/* Chart Placeholders */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-6)' }}>
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Quality Index by Module</h2>
          </div>
          <div className={styles.chartPlaceholder}>
            <BarChart3 size={40} style={{ color: 'var(--color-text-muted)', opacity: 0.3 }} />
            <p className="text-small text-muted" style={{ marginTop: 'var(--space-3)' }}>Charts will appear once Supabase is connected</p>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Turnaround Timeline</h2>
          </div>
          <div className={styles.chartPlaceholder}>
            <TrendingUp size={40} style={{ color: 'var(--color-text-muted)', opacity: 0.3 }} />
            <p className="text-small text-muted" style={{ marginTop: 'var(--space-3)' }}>Charts will appear once Supabase is connected</p>
          </div>
        </div>
      </div>
    </div>
  )
}
