'use client'

import { useMemo, useState, useEffect, useRef } from 'react'
import { DefaultChatTransport } from 'ai'
import { useChat } from '@ai-sdk/react'
import { Plus, Send, User as UserIcon, Bot, FileText, CheckCircle2, ChevronRight, MessageSquare, AlertTriangle, Trash2 } from 'lucide-react'
import styles from './page.module.css'
import { createClient } from '@/lib/supabase/client'
import ActionCard from '@/components/chat/ActionCard'

interface Thread {
  id: string
  title: string
  updated_at: string
}

interface OracleClientProps {
  initialThreads: Thread[]
  userId: string
}

export default function OracleClient({ initialThreads, userId }: OracleClientProps) {
  const [threads, setThreads] = useState<Thread[]>(initialThreads)
  const [activeThreadId, setActiveThreadId] = useState<string | null>(initialThreads[0]?.id || null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const chatEndRef = useRef<HTMLDivElement>(null)
  
  // Extract text from v6 message parts
  const getMessageText = (msg: any): string => {
    if (msg.parts && msg.parts.length > 0) {
      const textParts = msg.parts.filter((p: any) => p.type === 'text')
      if (textParts.length > 0) {
        return textParts.map((p: any) => p.text).join('')
      }
    }
    return msg.content || ''
  }

  // Extract tool parts from v6 message
  const getToolParts = (msg: any): any[] => {
    if (!msg.parts) return []
    return msg.parts.filter((p: any) => p.type === 'tool-invocation')
  }

  // Format text into elements
  const formatAIText = (text: string) => {
    return text.split('\n').map((line, i) => {
      const parts = line.split(/(\*\*[^*]+\*\*)/g)
      const formatted = parts.map((part, j) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={j}>{part.slice(2, -2)}</strong>
        }
        return part
      })

      if (line.trimStart().startsWith('- ') || line.trimStart().startsWith('• ')) {
        return <div key={i} style={{ display: 'flex', gap: '8px', margin: '4px 0' }}><span>•</span><div>{formatted}</div></div>
      }
      if (line.trim() === '') return <div key={i} style={{ height: '8px' }} />
      return <div key={i}>{formatted}</div>
    })
  }

  const supabase = createClient()
  const [aiInput, setAiInput] = useState('')

  const threadIdRef = useRef(activeThreadId)
  useEffect(() => { threadIdRef.current = activeThreadId }, [activeThreadId])

  const transport = useMemo(() => new DefaultChatTransport({ 
    api: '/api/ai/oracle',
    fetch: async (url, options) => {
      // Intercept the outgoing payload and dynamically inject the activeThreadId
      // This bypasses any internal caching within the useChat hook.
      if (options?.body && typeof options.body === 'string') {
        try {
          const bodyObj = JSON.parse(options.body)
          if (threadIdRef.current) {
             bodyObj.threadId = threadIdRef.current
          } else {
             bodyObj.threadId = null // explicitly clear it if it's a new chat
          }
          options.body = JSON.stringify(bodyObj)
        } catch(e) {}
      }
      return fetch(url, options)
    }
  }), [])
  
  const { messages, sendMessage, status, setMessages } = useChat({
    id: 'oracle-chat', // static ID so it doesn't duplicate stores internally
    transport
  })
  
  const isLoading = status === 'submitted' || status === 'streaming'
  useEffect(() => {
    if (activeThreadId) {
      loadThreadMessages(activeThreadId)
    } else {
      setMessages([])
    }
  }, [activeThreadId])

  useEffect(() => {
    // Auto scroll
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const loadThreadMessages = async (threadId: string) => {
    const { data } = await supabase
      .from('oracle_messages')
      .select('*')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true })

    if (data) {
      const formattedMessages = data.map(m => {
        let parsedContent = m.content
        try {
           if (m.role === 'tool') parsedContent = JSON.parse(m.content)
        } catch(e) {}
        
        return {
          id: m.id,
          role: m.role,
          content: parsedContent,
          isSaved: true // flag so we don't save DB loaded msgs again
        }
      }) as any[]
      setMessages(formattedMessages)
    }
  }

  const fetchThreads = async () => {
    const { data } = await supabase
      .from('oracle_threads')
      .select('id, title, updated_at')
      .order('updated_at', { ascending: false })
    if (data) setThreads(data)
  }

  const startNewChat = () => {
    setActiveThreadId(null)
    setMessages([])
  }

  const deleteThread = async (e: React.MouseEvent, threadId: string) => {
    e.stopPropagation()
    const confirm = window.confirm('Are you sure you want to delete this chat?')
    if (!confirm) return

    // Optimistic UI update
    setThreads(prev => prev.filter(t => t.id !== threadId))
    if (activeThreadId === threadId) {
      startNewChat()
    }

    // DB delete (messages cascade)
    await supabase.from('oracle_threads').delete().eq('id', threadId)
  }

  return (
    <div className={styles.oracleContainer}>
      {/* Sidebar for Threads */}
      <div className={`${styles.sidebar} ${isSidebarOpen ? styles.sidebarOpen : styles.sidebarClosed}`}>
        <div className={styles.sidebarHeader}>
          <button className={styles.newChatBtn} onClick={startNewChat}>
            <Plus size={16} /> New Chat
          </button>
        </div>
        <div className={styles.threadList}>
          {threads.map(t => (
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
                title="Delete Chat"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className={styles.chatArea}>
        <div className={styles.chatHeader}>
          <h2 className="heading-3" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: 'var(--color-accent-blue)' }}>✧</span> Oracle
          </h2>
          <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Secure Line Active</span>
        </div>

        <div className={styles.messageStream}>
          {messages.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.oracleLogoPulsing}>✧</div>
              <h1 className={styles.emptyTitle}>Oracle Protocol Online</h1>
              <p className={styles.emptySubtitle}>How can I assist your production workflow today?</p>
              
              <div className={styles.promptCards}>
                <button className={styles.promptCard} onClick={() => sendMessage({ text: 'What are my pending tasks?' })}>
                  <CheckCircle2 className={styles.promptIcon} />
                  <span>My Tasks</span>
                </button>
                <button className={styles.promptCard} onClick={() => sendMessage({ text: 'Show me the overdue alerts.' })}>
                  <AlertTriangle className={styles.promptIcon} />
                  <span>Overdue</span>
                </button>
              </div>
            </div>
          ) : (
            messages.map(m => {
              const text = getMessageText(m)
              const toolParts = getToolParts(m)
              
              if ((m.role as any) === 'tool' || (m.role as any) === 'data') return null;

              return (
                <div key={m.id} className={`${styles.messageWrapper} ${m.role === 'user' ? styles.wrapperUser : styles.wrapperAssistant}`}>
                  <div className={`${styles.avatar} ${m.role === 'user' ? styles.avatarUser : styles.avatarAssistant}`}>
                    {m.role === 'user' ? <UserIcon size={14} /> : '✧'}
                  </div>
                  <div className={styles.messageContent}>
                    {m.role === 'user' ? (
                      <div className={styles.textUser}>{text}</div>
                    ) : (
                      <>
                        {text && (
                          <div className={styles.textAssistant}>
                            {formatAIText(text)}
                          </div>
                        )}
                        
                        {/* Generative UI Approval Cards */}
                        {toolParts.map((part: any, idx: number) => {
                          const tool = part.toolInvocation;
                          if (tool.state === 'partial-call') {
                            return <div key={tool.toolCallId} className={styles.toolLoading}>Evaluating constraint logic...</div>
                          }
                          
                          if (tool.state === 'call') {
                            // Needs manual intervention if it doesn't execute automatically.
                            // But our tools execute automatically. We return dryRun from them.
                            return null;
                          }
                          
                          if (tool.state === 'result') {
                            const result = tool.result;
                            if (result?.dryRun) {
                              return (
                                <ActionCard 
                                  key={tool.toolCallId}
                                  actionType={result.actionType}
                                  proposedData={result.proposedData}
                                  onConfirm={() => {
                                    sendMessage({
                                      text: `SYSTEM: User confirmed action ${tool.toolName} dry run. Execute with isConfirmed: true. Apply this tool directly.`
                                    })
                                  }}
                                  onCancel={() => {
                                    sendMessage({
                                      text: `SYSTEM: User rejected ${tool.toolName}. Abort action.`
                                    })
                                  }}
                                />
                              )
                            }
                            
                            if (result?.success) {
                              return (
                                <div key={tool.toolCallId} className={styles.toolSuccess}>
                                  <CheckCircle2 size={14} /> Action Complete
                                </div>
                              )
                            }
                            
                            if (result?.error) {
                              return (
                                <div key={tool.toolCallId} className={styles.toolError}>
                                  Action Failed: {result.error}
                                </div>
                              )
                            }
                          }
                          return null;
                        })}
                      </>
                    )}
                  </div>
                </div>
              )
            })
          )}
          {isLoading && (
            <div className={`${styles.messageWrapper} ${styles.wrapperAssistant}`}>
              <div className={`${styles.avatar} ${styles.avatarAssistant}`}>✧</div>
              <div className={styles.typingIndicator}>
                <span></span><span></span><span></span>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <div className={styles.inputArea}>
          <form 
            onSubmit={(e) => { 
               e.preventDefault()
               if(!aiInput.trim()) return
               sendMessage({ text: aiInput }) 
               setAiInput('')
            }} 
            className={styles.form}
          >
            <input
              type="text"
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
              placeholder="Ask Oracle to search projects, update tasks, or analyze workloads..."
              className={styles.input}
              disabled={isLoading}
            />
            <button type="submit" className={styles.sendBtn} disabled={isLoading || !aiInput.trim()}>
              <Send size={16} />
            </button>
          </form>
          <div className={styles.disclaimer}>
            Oracle securely evaluates production data. Database modifications require explicit approval.
          </div>
        </div>
      </div>
    </div>
  )
}
