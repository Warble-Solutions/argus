'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Plus, Send, User as UserIcon, CheckCircle2, AlertTriangle, Trash2, MessageSquare, PanelLeftClose, PanelLeft, Sparkles } from 'lucide-react'
import styles from './page.module.css'
import { createClient } from '@/lib/supabase/client'
import ActionCard from '@/components/chat/ActionCard'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Thread {
  id: string
  title: string
  updated_at: string
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'tool'
  content: string
  toolInvocations?: any[]
}

interface OracleClientProps {
  initialThreads: Thread[]
  userId: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Simple markdown-like formatting for AI text */
function formatAIText(text: string) {
  return text.split('\n').map((line, i) => {
    // Bold
    const parts = line.split(/(\*\*[^*]+\*\*)/g)
    const formatted = parts.map((part, j) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={j}>{part.slice(2, -2)}</strong>
      }
      return part
    })

    // Bullets
    if (line.trimStart().startsWith('- ') || line.trimStart().startsWith('* ') || line.trimStart().startsWith('• ')) {
      const inner = line.replace(/^\s*[-*•]\s*/, '')
      const innerParts = inner.split(/(\*\*[^*]+\*\*)/g).map((p, j) =>
        p.startsWith('**') && p.endsWith('**') ? <strong key={j}>{p.slice(2, -2)}</strong> : p
      )
      return <div key={i} className={styles.bulletLine}><span className={styles.bulletDot}>•</span><span>{innerParts}</span></div>
    }

    // Empty lines
    if (line.trim() === '') return <div key={i} className={styles.lineBreak} />

    return <div key={i}>{formatted}</div>
  })
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function OracleClient({ initialThreads, userId }: OracleClientProps) {
  // --- State ---
  const [threads, setThreads] = useState<Thread[]>(initialThreads)
  const [activeThreadId, setActiveThreadId] = useState<string | null>(initialThreads[0]?.id || null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [streamingText, setStreamingText] = useState('')

  const chatEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const supabase = createClient()

  // --- Load thread messages from DB ---
  const loadThreadMessages = useCallback(async (threadId: string) => {
    const { data } = await supabase
      .from('oracle_messages')
      .select('*')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true })

    if (data) {
      const formatted: ChatMessage[] = data.map(m => ({
        id: m.id,
        role: m.role as ChatMessage['role'],
        content: m.content,
      }))
      setMessages(formatted)
    }
  }, [])

  // --- Fetch thread list ---
  const fetchThreads = useCallback(async () => {
    const { data } = await supabase
      .from('oracle_threads')
      .select('id, title, updated_at')
      .order('updated_at', { ascending: false })
    if (data) setThreads(data)
  }, [])

  // --- When active thread changes, load its messages ---
  useEffect(() => {
    if (activeThreadId) {
      loadThreadMessages(activeThreadId)
    } else {
      setMessages([])
    }
    setStreamingText('')
  }, [activeThreadId, loadThreadMessages])

  // --- Auto-scroll ---
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingText])

  // --- Focus input on mount ---
  useEffect(() => {
    inputRef.current?.focus()
  }, [activeThreadId])

  // --- New chat ---
  const startNewChat = () => {
    setActiveThreadId(null)
    setMessages([])
    setStreamingText('')
    setInput('')
    inputRef.current?.focus()
  }

  // --- Delete thread ---
  const deleteThread = async (e: React.MouseEvent, threadId: string) => {
    e.stopPropagation()
    e.preventDefault()
    if (!window.confirm('Delete this conversation?')) return
    
    // Optimistic UI update first
    setThreads(prev => prev.filter(t => t.id !== threadId))
    if (activeThreadId === threadId) startNewChat()
    
    // Then delete from DB
    const { error } = await supabase.from('oracle_threads').delete().eq('id', threadId)
    if (error) {
      console.error('Failed to delete thread:', error)
      // Refetch to restore if delete failed
      fetchThreads()
    }
  }

  // --- Generate smart title for new thread ---
  const generateTitle = async (threadId: string, userMsg: string, aiMsg: string) => {
    try {
      const res = await fetch('/api/ai/oracle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          threadId,
          generateTitle: true,
          messages: [
            { role: 'user', content: userMsg },
            { role: 'assistant', content: aiMsg },
          ],
        }),
      })
      if (res.ok) {
        const title = await res.text()
        if (title && title.length < 60) {
          await supabase
            .from('oracle_threads')
            .update({ title: title.trim() })
            .eq('id', threadId)
          fetchThreads()
        }
      }
    } catch (_) {
      // Non-critical, silently fail
    }
  }

  // --- Send message (manual fetch + streaming) ---
  const sendMessage = async (text?: string) => {
    const msgText = text || input.trim()
    if (!msgText || isLoading) return

    setInput('')
    setIsLoading(true)
    setStreamingText('')

    // Add user message to UI immediately
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: msgText,
    }
    const updatedMessages = [...messages, userMsg]
    setMessages(updatedMessages)

    // Build payload — send the full history so the AI has context
    const payload = {
      threadId: activeThreadId,
      messages: updatedMessages.map(m => ({
        role: m.role,
        content: m.content,
      })),
    }

    const isNewThread = !activeThreadId

    try {
      const controller = new AbortController()
      abortRef.current = controller

      const res = await fetch('/api/ai/oracle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      })

      if (!res.ok) {
        throw new Error(`API error: ${res.status}`)
      }

      // Read x-thread-id from response to track which thread this belongs to
      const returnedThreadId = res.headers.get('x-thread-id')
      if (returnedThreadId && returnedThreadId !== activeThreadId) {
        setActiveThreadId(returnedThreadId)
        fetchThreads()
      }

      // Stream the response — createTextStreamResponse sends plain text chunks
      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      let fullText = ''

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const chunk = decoder.decode(value, { stream: true })
          fullText += chunk
          setStreamingText(fullText)
        }
      }

      // After streaming finishes, add the assistant message
      if (fullText) {
        const assistantMsg: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: fullText,
        }
        setMessages(prev => [...prev, assistantMsg])
        setStreamingText('')

        // Generate smart title for new threads
        if (isNewThread && returnedThreadId) {
          generateTitle(returnedThreadId, msgText, fullText)
        }
      }

    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Oracle error:', err)
        const errorMsg: ChatMessage = {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: 'Sorry, something went wrong. Please try again.',
        }
        setMessages(prev => [...prev, errorMsg])
        setStreamingText('')
      }
    } finally {
      setIsLoading(false)
      abortRef.current = null
    }
  }

  // --- Handle form submit ---
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage()
  }

  // --- Render ---
  return (
    <div className={styles.oracleContainer}>
      {/* Sidebar */}
      <div className={`${styles.sidebar} ${isSidebarOpen ? '' : styles.sidebarClosed}`}>
        <div className={styles.sidebarHeader}>
          <button className={styles.newChatBtn} onClick={startNewChat}>
            <Plus size={16} /> New Chat
          </button>
        </div>
        <div className={styles.threadList}>
          {threads.length === 0 ? (
            <div className={styles.threadEmpty}>
              <Sparkles size={20} />
              <span>No conversations yet</span>
            </div>
          ) : (
            threads.map(t => (
              <div
                key={t.id}
                className={`${styles.threadBtn} ${activeThreadId === t.id ? styles.threadActive : ''}`}
                onClick={() => setActiveThreadId(t.id)}
              >
                <div className={styles.threadInfo}>
                  <MessageSquare size={14} className={styles.threadIcon} />
                  <span className={styles.threadTitle}>{t.title}</span>
                </div>
                <button
                  className={styles.deleteThreadBtn}
                  onClick={(e) => deleteThread(e, t.id)}
                  title="Delete"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className={styles.chatArea}>
        {/* Header */}
        <div className={styles.chatHeader}>
          <div className={styles.chatHeaderLeft}>
            <button
              className={styles.sidebarToggle}
              onClick={() => setIsSidebarOpen(prev => !prev)}
              title={isSidebarOpen ? 'Close sidebar' : 'Open sidebar'}
            >
              {isSidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeft size={18} />}
            </button>
            <h2 className={styles.chatTitle}>
              <span className={styles.oracleIcon}>✧</span> Oracle
            </h2>
          </div>
          <span className={styles.secureTag}>
            <span className={styles.secureDot} />
            Encrypted Session
          </span>
        </div>

        {/* Messages */}
        <div className={styles.messageStream}>
          {messages.length === 0 && !streamingText ? (
            <div className={styles.emptyState}>
              <div className={styles.oracleLogoPulsing}>✧</div>
              <h1 className={styles.emptyTitle}>Oracle Protocol Online</h1>
              <p className={styles.emptySubtitle}>Your private AI production coordinator. Ask me about tasks, deadlines, workloads, or request changes.</p>

              <div className={styles.promptCards}>
                <button className={styles.promptCard} onClick={() => sendMessage('What are my pending tasks?')}>
                  <CheckCircle2 className={styles.promptIcon} size={20} />
                  <span>My Tasks</span>
                </button>
                <button className={styles.promptCard} onClick={() => sendMessage('Show me overdue items')}>
                  <AlertTriangle className={styles.promptIcon} size={20} />
                  <span>Overdue</span>
                </button>
                <button className={styles.promptCard} onClick={() => sendMessage('Give me a project status overview')}>
                  <Sparkles className={styles.promptIcon} size={20} />
                  <span>Overview</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              {messages.map(m => {
                if (m.role === 'tool') return null

                return (
                  <div key={m.id} className={`${styles.msgRow} ${m.role === 'user' ? styles.msgRowUser : styles.msgRowAssistant}`}>
                    <div className={`${styles.avatar} ${m.role === 'user' ? styles.avatarUser : styles.avatarAssistant}`}>
                      {m.role === 'user' ? <UserIcon size={14} /> : '✧'}
                    </div>
                    <div className={m.role === 'user' ? styles.bubbleUser : styles.bubbleAssistant}>
                      {m.role === 'user' ? m.content : formatAIText(m.content)}
                    </div>
                  </div>
                )
              })}

              {/* Streaming indicator */}
              {streamingText && (
                <div className={`${styles.msgRow} ${styles.msgRowAssistant}`}>
                  <div className={`${styles.avatar} ${styles.avatarAssistant}`}>✧</div>
                  <div className={styles.bubbleAssistant}>
                    {formatAIText(streamingText)}
                    <span className={styles.cursor} />
                  </div>
                </div>
              )}

              {/* Loading dots (before any text starts streaming) */}
              {isLoading && !streamingText && (
                <div className={`${styles.msgRow} ${styles.msgRowAssistant}`}>
                  <div className={`${styles.avatar} ${styles.avatarAssistant}`}>✧</div>
                  <div className={styles.typingIndicator}>
                    <span /><span /><span />
                  </div>
                </div>
              )}
            </>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input */}
        <div className={styles.inputArea}>
          <form onSubmit={handleSubmit} className={styles.form}>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Oracle anything about your projects..."
              className={styles.input}
              disabled={isLoading}
            />
            <button type="submit" className={styles.sendBtn} disabled={isLoading || !input.trim()}>
              <Send size={16} />
            </button>
          </form>
          <div className={styles.disclaimer}>
            Oracle evaluates your production data securely. Database changes require explicit approval.
          </div>
        </div>
      </div>
    </div>
  )
}
