'use client'

import { useState, useTransition } from 'react'
import { Pencil, Check, X } from 'lucide-react'
import { updateProfile } from '@/lib/actions/auth'

interface ProfileEditorProps {
  currentName: string
}

export default function ProfileEditor({ currentName }: ProfileEditorProps) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(currentName)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  const handleSave = () => {
    if (!name.trim()) return
    setError('')
    const formData = new FormData()
    formData.append('full_name', name.trim())

    startTransition(async () => {
      try {
        await updateProfile(formData)
        setEditing(false)
      } catch (err: any) {
        setError(err.message)
      }
    })
  }

  const handleCancel = () => {
    setName(currentName)
    setEditing(false)
    setError('')
  }

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        title="Edit name"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 20,
          height: 20,
          borderRadius: '50%',
          border: 'none',
          background: 'transparent',
          color: 'var(--color-text-muted)',
          cursor: 'pointer',
          transition: 'all 0.15s',
          flexShrink: 0,
        }}
        onMouseOver={(e) => { e.currentTarget.style.background = 'var(--color-bg-tertiary)'; e.currentTarget.style.color = 'var(--color-text-primary)' }}
        onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-text-muted)' }}
      >
        <Pencil size={11} />
      </button>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%', padding: '4px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') handleCancel() }}
          autoFocus
          disabled={isPending}
          style={{
            flex: 1,
            background: 'var(--color-bg-tertiary)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-sm)',
            padding: '2px 6px',
            color: 'var(--color-text-primary)',
            fontSize: '12px',
            outline: 'none',
            minWidth: 0,
          }}
        />
        <button onClick={handleSave} disabled={isPending} title="Save" style={{ background: 'none', border: 'none', color: 'var(--color-accent-emerald)', cursor: 'pointer', padding: 2 }}>
          <Check size={14} />
        </button>
        <button onClick={handleCancel} title="Cancel" style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', padding: 2 }}>
          <X size={14} />
        </button>
      </div>
      {error && <span style={{ fontSize: 10, color: 'var(--color-accent-red)' }}>{error}</span>}
    </div>
  )
}
