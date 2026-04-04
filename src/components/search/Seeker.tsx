'use client'

import { useState, useEffect, useRef, useCallback, useTransition } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { Search, FolderKanban, Package, CheckSquare, Users, Clock, ArrowRight, Sparkles } from 'lucide-react'
import { globalSearch } from '@/lib/actions/search'
import { getInitials } from '@/lib/utils'
import styles from './Seeker.module.css'

interface SeekerProps {
  isOpen: boolean
  onClose: () => void
}

interface SearchResults {
  projects: any[]
  modules: any[]
  tasks: any[]
  people: any[]
}

interface FlatItem {
  type: 'project' | 'module' | 'task' | 'person' | 'recent'
  id: string
  title: string
  subtitle: string
  href: string
  icon: 'project' | 'module' | 'task' | 'person'
  badge?: string
  badgeClass?: string
}

const RECENT_KEY = 'seeker_recent'

function getRecent(): FlatItem[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]').slice(0, 5)
  } catch { return [] }
}

function saveRecent(item: FlatItem) {
  const recent = getRecent().filter(r => r.id !== item.id)
  recent.unshift({ ...item, type: 'recent' })
  localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, 8)))
}

const statusBadge: Record<string, { label: string, cls: string }> = {
  active: { label: 'Active', cls: 'badge-emerald' },
  on_hold: { label: 'On Hold', cls: 'badge-amber' },
  completed: { label: 'Completed', cls: 'badge-blue' },
  not_started: { label: 'Not Started', cls: 'badge-neutral' },
  in_progress: { label: 'In Progress', cls: 'badge-blue' },
  todo: { label: 'To Do', cls: 'badge-neutral' },
  done: { label: 'Done', cls: 'badge-emerald' },
  blocked: { label: 'Blocked', cls: 'badge-red' },
  pending_review: { label: 'Pending Review', cls: 'badge-amber' },
  revision: { label: 'Revision', cls: 'badge-purple' },
}

export default function Seeker({ isOpen, onClose }: SeekerProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResults>({ projects: [], modules: [], tasks: [], people: [] })
  const [isPending, startTransition] = useTransition()
  const [activeIndex, setActiveIndex] = useState(0)
  const [recentItems, setRecentItems] = useState<FlatItem[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const [isMac, setIsMac] = useState(false)

  // Detect OS
  useEffect(() => {
    setIsMac(navigator.platform.toUpperCase().includes('MAC'))
  }, [])

  // Load recents on open + toggle body blur
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('seeker-open')
      setRecentItems(getRecent())
      setQuery('')
      setResults({ projects: [], modules: [], tasks: [], people: [] })
      setActiveIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    } else {
      document.body.classList.remove('seeker-open')
    }
    return () => {
      document.body.classList.remove('seeker-open')
    }
  }, [isOpen])

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query.trim() || query.trim().length < 2) {
      setResults({ projects: [], modules: [], tasks: [], people: [] })
      setActiveIndex(0)
      return
    }
    debounceRef.current = setTimeout(() => {
      startTransition(async () => {
        const res = await globalSearch(query)
        setResults(res)
        setActiveIndex(0)
      })
    }, 250)
  }, [query])

  // Build flat list for keyboard nav
  const flatItems: FlatItem[] = query.trim().length >= 2
    ? [
        ...results.projects.map(p => ({
          type: 'project' as const, id: p.id, title: p.name, subtitle: p.client_name,
          href: `/projects/${p.id}`, icon: 'project' as const,
          badge: statusBadge[p.status]?.label, badgeClass: statusBadge[p.status]?.cls,
        })),
        ...results.modules.map(m => ({
          type: 'module' as const, id: m.id, title: m.title,
          subtitle: `Module ${m.module_number} · ${(m.projects as any)?.name || ''}`,
          href: `/projects/${m.project_id}/modules/${m.id}`, icon: 'module' as const,
          badge: statusBadge[m.status]?.label, badgeClass: statusBadge[m.status]?.cls,
        })),
        ...results.tasks.map(t => ({
          type: 'task' as const, id: t.id, title: t.title,
          subtitle: (t.modules as any)?.title || '',
          href: `/projects/${(t.modules as any)?.project_id}/modules/${t.module_id}`, icon: 'task' as const,
          badge: statusBadge[t.status]?.label, badgeClass: statusBadge[t.status]?.cls,
        })),
        ...results.people.map(p => ({
          type: 'person' as const, id: p.id, title: p.full_name, subtitle: p.email,
          href: `/admin/team`, icon: 'person' as const,
          badge: p.role, badgeClass: p.role === 'admin' ? 'badge-red' : p.role === 'manager' ? 'badge-amber' : 'badge-blue',
        })),
      ]
    : recentItems

  const handleNavigate = useCallback((item: FlatItem) => {
    saveRecent(item)
    router.push(item.href)
    onClose()
  }, [router, onClose])

  // Keyboard nav
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex(i => Math.min(i + 1, flatItems.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && flatItems[activeIndex]) {
      e.preventDefault()
      handleNavigate(flatItems[activeIndex])
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  // Scroll active item into view
  useEffect(() => {
    const el = document.querySelector(`[data-seeker-index="${activeIndex}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  if (!isOpen) return null

  const hasResults = query.trim().length >= 2
  const noResults = hasResults && flatItems.length === 0 && !isPending

  const iconMap = {
    project: <FolderKanban size={16} />,
    module: <Package size={16} />,
    task: <CheckSquare size={16} />,
    person: <Users size={16} />,
  }

  // Group items by type for section headers
  const sections: { label: string; icon: React.ReactNode; items: FlatItem[] }[] = hasResults
    ? [
        { label: 'Projects', icon: <FolderKanban size={14} />, items: flatItems.filter(i => i.type === 'project') },
        { label: 'Modules', icon: <Package size={14} />, items: flatItems.filter(i => i.type === 'module') },
        { label: 'Tasks', icon: <CheckSquare size={14} />, items: flatItems.filter(i => i.type === 'task') },
        { label: 'People', icon: <Users size={14} />, items: flatItems.filter(i => i.type === 'person') },
      ].filter(s => s.items.length > 0)
    : recentItems.length > 0
      ? [{ label: 'Recent', icon: <Clock size={14} />, items: recentItems }]
      : []

  let globalIdx = -1

  return createPortal(
    <div className={styles.overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className={styles.seeker} onKeyDown={handleKeyDown}>
          {/* Search Input */}
          <div className={styles.inputRow}>
            <Search size={20} className={styles.inputIcon} />
          <input
            ref={inputRef}
            type="text"
            className={styles.input}
            placeholder="Search projects, modules, tasks, or people..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoComplete="off"
            spellCheck={false}
          />
          {isPending && <div className={styles.spinner} />}
          <div className={styles.aiHint}>
            <Sparkles size={12} />
            <span>AI coming soon</span>
          </div>
        </div>

        {/* Results */}
        <div className={styles.results}>
          {noResults && (
            <div className={styles.empty}>
              <Search size={24} />
              <span>No results for &ldquo;{query}&rdquo;</span>
            </div>
          )}

          {!hasResults && recentItems.length === 0 && (
            <div className={styles.empty}>
              <Search size={24} />
              <span>Start typing to search everywhere...</span>
            </div>
          )}

          {sections.map(section => (
            <div key={section.label} className={styles.section}>
              <div className={styles.sectionLabel}>
                {section.icon}
                {section.label}
              </div>
              {section.items.map(item => {
                globalIdx++
                const idx = globalIdx
                return (
                  <button
                    key={item.id}
                    data-seeker-index={idx}
                    className={`${styles.resultItem} ${activeIndex === idx ? styles.active : ''}`}
                    onClick={() => handleNavigate(item)}
                    onMouseEnter={() => setActiveIndex(idx)}
                  >
                    <div className={styles.resultIcon}>
                      {iconMap[item.icon]}
                    </div>
                    <div className={styles.resultInfo}>
                      <span className={styles.resultTitle}>{item.title}</span>
                      {item.subtitle && <span className={styles.resultSubtitle}>{item.subtitle}</span>}
                    </div>
                    {item.badge && (
                      <span className={`badge ${item.badgeClass || 'badge-neutral'}`}>{item.badge}</span>
                    )}
                    <ArrowRight size={14} className={styles.resultArrow} />
                  </button>
                )
              })}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <span className={styles.footerHint}><kbd>↑</kbd><kbd>↓</kbd> Navigate</span>
          <span className={styles.footerHint}><kbd>↵</kbd> Open</span>
          <span className={styles.footerHint}><kbd>esc</kbd> Close</span>
          <span className={styles.footerHint}><kbd>{isMac ? '⌘' : 'Ctrl'}</kbd><kbd>K</kbd></span>
          <span className={styles.seekerBrand}>
            <Sparkles size={10} /> Seeker
          </span>
        </div>
      </div>
    </div>,
    document.body
  )
}
