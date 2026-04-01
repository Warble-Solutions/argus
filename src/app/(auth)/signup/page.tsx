'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, UserPlus } from 'lucide-react'
import styles from '../login/page.module.css'

export default function SignupPage() {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Mock signup — will be replaced with Supabase Auth
    await new Promise(r => setTimeout(r, 800))

    if (fullName && email && password) {
      router.push('/')
    } else {
      setError('Please fill in all fields.')
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
        <p className={styles.logoSubtitle}>Create your account</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className={styles.form}>
        {error && (
          <div className={styles.errorMessage}>{error}</div>
        )}

        <div className="input-group">
          <label htmlFor="signup-name" className="input-label">Full Name</label>
          <input
            id="signup-name"
            type="text"
            className="input-field"
            placeholder="Your full name"
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            required
            autoFocus
          />
        </div>

        <div className="input-group">
          <label htmlFor="signup-email" className="input-label">Email</label>
          <input
            id="signup-email"
            type="email"
            className="input-field"
            placeholder="you@company.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="input-group">
          <label htmlFor="signup-password" className="input-label">Password</label>
          <div className={styles.passwordWrapper}>
            <input
              id="signup-password"
              type={showPassword ? 'text' : 'password'}
              className="input-field"
              placeholder="Choose a password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
            />
            <button
              type="button"
              className={styles.passwordToggle}
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          className={`btn btn-primary btn-lg ${styles.submitBtn}`}
          disabled={loading}
          id="signup-submit"
        >
          {loading ? (
            <span className={styles.spinner} />
          ) : (
            <>
              <UserPlus size={18} />
              Create Account
            </>
          )}
        </button>
      </form>

      <p className={styles.footerText}>
        Already have an account?{' '}
        <Link href="/login" className={styles.footerLink}>Sign in</Link>
      </p>
    </>
  )
}
