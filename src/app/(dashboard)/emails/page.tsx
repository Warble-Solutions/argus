import { Mail, ArrowRight } from 'lucide-react'

export default function EmailsPage() {
  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Client Emails</h1>
          <p className="page-subtitle">AI-summarized email threads from Zoho Mail</p>
        </div>
      </div>

      <div className="card">
        <div className="empty-state">
          <Mail size={48} className="empty-state-icon" />
          <h2 className="empty-state-title">Connect Zoho Mail</h2>
          <p className="empty-state-desc">
            Connect your Zoho Mail account to automatically monitor client communications,
            extract action items, and send approval emails.
          </p>
          <button className="btn btn-primary">
            Connect Zoho Mail
          </button>
        </div>
      </div>
    </div>
  )
}
