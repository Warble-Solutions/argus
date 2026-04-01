import { MessageSquare, Send, Paperclip } from 'lucide-react'
import styles from './page.module.css'

export default function ChatPage() {
  return (
    <div className={styles.chatContainer}>
      {/* Chat Messages Area */}
      <div className={styles.messagesArea}>
        {/* Welcome Message */}
        <div className={styles.welcomeMessage}>
          <div className={styles.argusIcon}>
            <MessageSquare size={28} />
          </div>
          <h1 className={styles.welcomeTitle}>Welcome to Argus</h1>
          <p className={styles.welcomeSubtitle}>
            I&apos;m your AI-powered LMS coordinator. Ask me to update tasks, check module status,
            manage files, or anything else related to your projects.
          </p>
          <div className={styles.suggestions}>
            <button className={styles.suggestion}>&quot;What&apos;s the status of Module 4?&quot;</button>
            <button className={styles.suggestion}>&quot;Assign the video task to Ahmed&quot;</button>
            <button className={styles.suggestion}>&quot;Show my pending tasks&quot;</button>
            <button className={styles.suggestion}>&quot;Module 3 storyboard is done&quot;</button>
          </div>
        </div>
      </div>

      {/* Chat Input */}
      <div className={styles.inputArea}>
        <div className={styles.inputWrapper}>
          <button className={styles.attachBtn} aria-label="Attach file">
            <Paperclip size={18} />
          </button>
          <input
            type="text"
            placeholder="Message Argus..."
            className={styles.chatInput}
            id="chat-input"
          />
          <button className={styles.sendBtn} aria-label="Send message" id="chat-send-btn">
            <Send size={18} />
          </button>
        </div>
        <p className={styles.inputHint}>Argus can update tasks, manage files, and more. Try natural language commands.</p>
      </div>
    </div>
  )
}
