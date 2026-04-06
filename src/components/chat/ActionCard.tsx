'use client'

import { AlertCircle, Check, X } from 'lucide-react'
import styles from './ActionCard.module.css'

interface ActionCardProps {
  actionType: string
  proposedData: any
  onConfirm: () => void
  onCancel: () => void
}

export default function ActionCard({ actionType, proposedData, onConfirm, onCancel }: ActionCardProps) {
  
  const getLabel = () => {
    switch (actionType) {
      case 'createTask': return 'Create Task'
      case 'updateTaskStatus': return 'Update Task Status'
      case 'updateTaskDeadline': return 'Update Task Deadline'
      case 'updateProjectDeadline': return 'Update Project Deadline'
      case 'addMemberToProject': return 'Add Project Member'
      default: return 'Database Modification'
    }
  }

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <AlertCircle size={16} className={styles.icon} />
        <h4>Action Approval Required</h4>
      </div>
      
      <div className={styles.body}>
        <div className={styles.actionName}>{getLabel()}</div>
        <div className={styles.dataPreview}>
          {Object.entries(proposedData).map(([key, value]) => (
            <div key={key} className={styles.dataRow}>
              <span className={styles.dataKey}>{key}:</span>
              <span className={styles.dataValue}>{String(value) || 'None'}</span>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.footer}>
        <button className={`${styles.btn} ${styles.btnCancel}`} onClick={onCancel}>
          <X size={14} /> Reject
        </button>
        <button className={`${styles.btn} ${styles.btnConfirm}`} onClick={onConfirm}>
          <Check size={14} /> Confirm
        </button>
      </div>
    </div>
  )
}
