'use client'

import { useState, useEffect, useRef, useCallback, useTransition, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { DefaultChatTransport } from 'ai'
import { useChat } from '@ai-sdk/react'
import {
  Search, FolderKanban, Package, CheckSquare, Users,
  Clock, ArrowRight, Sparkles, Send, Bot, User, Loader2, Zap,
} from 'lucide-react'
import { globalSearch } from '@/lib/actions/search'
import styles from './Seeker.module.css'

interface SeekerProps {
  isOpen: boolean
  onClose: () => void
  initialMode?: 'search' | 'ai'
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

type SeekerMode = 'search' | 'ai'

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

// Extract text from UIMessage parts
function getMessageText(msg: any): string {
  if (msg.parts) {
    return msg.parts
      .filter((p: any) => p.type === 'text')
      .map((p: any) => p.text)
      .join('')
  }
  // Fallback
  return msg.content || ''
}

// Get tool invocation parts
function getToolParts(msg: any): any[] {
  if (!msg.parts) return []
  return msg.parts.filter((p: any) => p.type === 'tool-invocation')
}

// Simple markdown-like formatting for AI responses
function formatAIText(text: string) {
  return text.split('\n').map((line, i) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g)
    const formatted = parts.map((part, j) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={j}>{part.slice(2, -2)}</strong>
      }
      return part
    })

    if (line.trimStart().startsWith('- ') || line.trimStart().startsWith('• ')) {
      return <div key={i} className={styles.aiBullet}>{formatted}</div>
    }

    if (line.trim() === '') return <div key={i} className={styles.aiBreak} />

    return <div key={i}>{formatted}</div>
  })
}

export default function Seeker({ isOpen, onClose, initialMode = 'search' }: SeekerProps) {
  const [mode, setMode] = useState<SeekerMode>('search')
  const [query, setQuery] = useState('')
  const [aiInput, setAiInput] = useState('')
  const [results, setResults] = useState<SearchResults>({ projects: [], modules: [], tasks: [], people: [] })
  const [isPending, startTransition] = useTransition()
  const [activeIndex, setActiveIndex] = useState(0)
  const [recentItems, setRecentItems] = useState<FlatItem[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const aiInputRef = useRef<HTMLInputElement>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const [isMac, setIsMac] = useState(false)

  // Stable transport instance for AI chat
  const transport = useMemo(() => new DefaultChatTransport({ api: '/api/ai/chat' }), [])

  // AI Chat via Vercel AI SDK v6
  const {
    messages,
    sendMessage,
    status,
    setMessages,
  } = useChat({ transport })

  const isAiLoading = status === 'submitted' || status === 'streaming'

  // Detect OS
  useEffect(() => {
    setIsMac(navigator.platform.toUpperCase().includes('MAC'))
  }, [])

  // Load recents on open + toggle body blur + sync mode
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('seeker-open')
      setMode(initialMode)
      setRecentItems(getRecent())
      setQuery('')
      setResults({ projects: [], modules: [], tasks: [], people: [] })
      setActiveIndex(0)
      setTimeout(() => {
        if (initialMode === 'search') inputRef.current?.focus()
        else aiInputRef.current?.focus()
      }, 50)
    } else {
      document.body.classList.remove('seeker-open')
    }
    return () => {
      document.body.classList.remove('seeker-open')
    }
  }, [isOpen, initialMode])

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Debounced search
  useEffect(() => {
    if (mode !== 'search') return
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
  }, [query, mode])

  // Switch to AI mode when typing /
  useEffect(() => {
    if (mode === 'search' && query === '/') {
      setMode('ai')
      setQuery('')
      setTimeout(() => aiInputRef.current?.focus(), 50)
    }
  }, [query, mode])

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
          href: `/admin/team/${p.id}`, icon: 'person' as const,
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
    if (e.key === 'Escape') {
      handleClose()
      return
    }
    if (mode === 'search') {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIndex(i => Math.min(i + 1, flatItems.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIndex(i => Math.max(i - 1, 0))
      } else if (e.key === 'Enter' && flatItems[activeIndex]) {
        e.preventDefault()
        handleNavigate(flatItems[activeIndex])
      }
    }
  }

  // Scroll active item into view
  useEffect(() => {
    const el = document.querySelector(`[data-seeker-index="${activeIndex}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  // Switch mode
  const switchMode = (newMode: SeekerMode) => {
    setMode(newMode)
    setTimeout(() => {
      if (newMode === 'search') inputRef.current?.focus()
      else aiInputRef.current?.focus()
    }, 50)
  }

  // Close and reset
  const handleClose = () => {
    setMode('search')
    setMessages([])
    setAiInput('')
    onClose()
  }

  // Handle AI form submit
  const handleAIFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!aiInput.trim() || isAiLoading) return
    sendMessage({ text: aiInput })
    setAiInput('')
  }

  // Handle suggestion click
  const handleSuggestionClick = (text: string) => {
    sendMessage({ text })
  }

  if (!isOpen) return null

  const hasResults = query.trim().length >= 2
  const noResults = hasResults && flatItems.length === 0 && !isPending

  const iconMap = {
    project: <FolderKanban size={16} />,
    module: <Package size={16} />,
    task: <CheckSquare size={16} />,
    person: <Users size={16} />,
  }

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
    <div className={styles.overlay} onClick={(e) => { if (e.target === e.currentTarget) handleClose() }}>
      <div className={styles.seeker} onKeyDown={handleKeyDown}>
        {/* Mode Tabs */}
        <div className={styles.modeTabs}>
          <button
            className={`${styles.modeTab} ${mode === 'search' ? styles.modeTabActive : ''}`}
            onClick={() => switchMode('search')}
          >
            <Search size={14} /> Search
          </button>
          <button
            className={`${styles.modeTab} ${mode === 'ai' ? styles.modeTabActive : ''}`}
            onClick={() => switchMode('ai')}
          >
            <Sparkles size={14} /> Ask AI
          </button>
        </div>

        {/* ===== SEARCH MODE ===== */}
        {mode === 'search' && (
          <>
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
            </div>

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
                  <span className={styles.emptyHint}>or press <kbd>/</kbd> to ask AI</span>
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
          </>
        )}

        {/* ===== AI MODE ===== */}
        {mode === 'ai' && (
          <>
            <div className={styles.aiChat}>
              {messages.length === 0 && (
                <div className={styles.aiWelcome}>
                  <div className={styles.aiWelcomeIcon}>
                    <Sparkles size={28} />
                  </div>
                  <h3>Ask Argus anything</h3>
                  <p>I can look up projects, tasks, team info — or take actions like creating tasks and managing teams.</p>
                  <div className={styles.aiSuggestions}>
                    <button
                      className={styles.aiSuggestion}
                      onClick={() => handleSuggestionClick('What are my open tasks?')}
                    >
                      <Zap size={12} /> What are my open tasks?
                    </button>
                    <button
                      className={styles.aiSuggestion}
                      onClick={() => handleSuggestionClick('Give me a status update on all projects')}
                    >
                      <Zap size={12} /> Status of all projects
                    </button>
                    <button
                      className={styles.aiSuggestion}
                      onClick={() => handleSuggestionClick("What's overdue?")}
                    >
                      <Zap size={12} /> What&apos;s overdue?
                    </button>
                  </div>
                </div>
              )}

              {messages.map(msg => {
                const text = getMessageText(msg)
                const toolParts = getToolParts(msg)

                return (
                  <div key={msg.id} className={`${styles.aiMessage} ${styles[msg.role]}`}>
                    <div className={styles.aiMsgIcon}>
                      {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
                    </div>
                    <div className={styles.aiMsgContent}>
                      {text && formatAIText(text)}
                      {toolParts.map((part: any, i: number) => (
                        <div key={i} className={styles.toolCall}>
                          <Zap size={12} />
                          <span>
                            {part.toolInvocation?.state === 'result'
                              ? `Used ${part.toolInvocation.toolName}`
                              : `Calling ${part.toolInvocation?.toolName}...`
                            }
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}

              {isAiLoading && (messages.length === 0 || !getMessageText(messages[messages.length - 1])) && (
                <div className={`${styles.aiMessage} ${styles.assistant}`}>
                  <div className={styles.aiMsgIcon}><Bot size={14} /></div>
                  <div className={styles.aiMsgContent}>
                    <div className={styles.aiThinking}>
                      <Loader2 size={14} className={styles.aiSpinner} />
                      <span>Thinking...</span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* AI Input */}
            <form onSubmit={handleAIFormSubmit} className={styles.aiInputRow}>
              <Sparkles size={18} className={styles.aiInputIcon} />
              <input
                ref={aiInputRef}
                type="text"
                className={styles.input}
                placeholder="Ask Argus anything..."
                value={aiInput}
                onChange={e => setAiInput(e.target.value)}
                disabled={isAiLoading}
                autoComplete="off"
                spellCheck={false}
              />
              <button
                type="submit"
                className={styles.aiSendBtn}
                disabled={isAiLoading || !aiInput.trim()}
              >
                {isAiLoading ? <Loader2 size={16} className={styles.aiSpinner} /> : <Send size={16} />}
              </button>
            </form>
          </>
        )}

        {/* Footer */}
        <div className={styles.footer}>
          {mode === 'search' ? (
            <>
              <span className={styles.footerHint}><kbd>↑</kbd><kbd>↓</kbd> Navigate</span>
              <span className={styles.footerHint}><kbd>↵</kbd> Open</span>
              <span className={styles.footerHint}><kbd>esc</kbd> Close</span>
              <span className={styles.footerHint}><kbd>/</kbd> AI</span>
            </>
          ) : (
            <>
              <span className={styles.footerHint}><kbd>↵</kbd> Send</span>
              <span className={styles.footerHint}><kbd>esc</kbd> Close</span>
            </>
          )}
          <span className={styles.footerHint}>
            <kbd>{isMac ? '⌘' : 'Ctrl'}</kbd><kbd>K</kbd> Search
          </span>
          <span className={styles.footerHint}>
            <kbd>{isMac ? '⌘⇧' : 'Ctrl+⇧'}</kbd><kbd>K</kbd> AI
          </span>
          <span className={styles.seekerBrand}>
            <Sparkles size={10} /> Seeker
          </span>
        </div>
      </div>
    </div>,
    document.body
  )
}
