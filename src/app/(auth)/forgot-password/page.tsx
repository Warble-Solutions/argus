'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Mail, CheckCircle } from 'lucide-react'
import { requestPasswordReset } from '@/lib/actions/auth'
import styles from '../login/page.module.css'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await requestPasswordReset(email)
      setSent(true)
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Logo */}
      <div className={styles.logoSection}>
        <div className={styles.logoIcon}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </div>
        <h1 className={styles.logoTitle}>ARGUS</h1>
        <p className={styles.logoSubtitle}>Reset your password</p>
      </div>

      {sent ? (
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-4)' }}>
          <CheckCircle size={48} style={{ color: 'var(--color-accent-emerald)' }} />
          <p style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-semibold)' }}>Check your email</p>
          <p className="text-small text-muted" style={{ lineHeight: 1.6 }}>
            We sent a password reset link to <strong style={{ color: 'var(--color-text-primary)' }}>{email}</strong>.
            Click the link in the email to reset your password.
          </p>
          <Link href="/login" className="btn btn-ghost" style={{ marginTop: 'var(--space-4)' }}>
            <ArrowLeft size={16} /> Back to Sign In
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className={styles.form}>
          {error && (
            <div className={styles.errorMessage}>{error}</div>
          )}

          <p className="text-small text-muted" style={{ textAlign: 'center', lineHeight: 1.5 }}>
            Enter the email address associated with your account and we&apos;ll send you a link to reset your password.
          </p>

          <div className="input-group">
            <label htmlFor="reset-email" className="input-label">Email</label>
            <input
              id="reset-email"
              type="email"
              className="input-field"
              placeholder="you@company.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>

          <button
            type="submit"
            className={`btn btn-primary btn-lg ${styles.submitBtn}`}
            disabled={loading}
          >
            {loading ? (
              <span className={styles.spinner} />
            ) : (
              <>
                <Mail size={18} />
                Send Reset Link
              </>
            )}
          </button>
        </form>
      )}

      {!sent && (
        <p className={styles.footerText}>
          Remember your password?{' '}
          <Link href="/login" className={styles.footerLink}>Sign in</Link>
        </p>
      )}
    </>
  )
}
