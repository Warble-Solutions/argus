// ============================================
// Argus Type Definitions
// ============================================

export type UserRole = 'admin' | 'manager' | 'employee' | 'intern'

export type ProjectStatus = 'active' | 'on_hold' | 'completed' | 'archived'

export type ModuleStatus =
  | 'not_started'
  | 'storyboard'
  | 'video_production'
  | 'articulate'
  | 'review'
  | 'revision'
  | 'approved'
  | 'delivered'

export type TaskType = 'storyboard' | 'video' | 'articulate' | 'review' | 'revision' | 'general'

export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'blocked'

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'

export type ApprovalType = 'task_creation' | 'stage_gate' | 'module_completion'

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'modified'

export type NotificationType =
  | 'deadline'
  | 'assignment'
  | 'revision'
  | 'approval'
  | 'stage_gate'
  | 'mention'
  | 'digest'
  | 'system'

// --- Core Entities ---

export interface Profile {
  id: string
  full_name: string
  email: string
  avatar_url: string | null
  role: UserRole
  created_at: string
  updated_at: string
}

export interface Project {
  id: string
  name: string
  description: string
  client_name: string
  client_email: string
  status: ProjectStatus
  template_id: string | null
  created_by: string
  deadline: string
  created_at: string
  updated_at: string
  // Computed/joined
  modules_count?: number
  completed_modules?: number
  progress?: number
  creator?: Profile
}

export interface Module {
  id: string
  project_id: string
  module_number: number
  title: string
  description: string
  status: ModuleStatus
  stage_gate_pending: boolean
  assigned_to: string
  deadline: string
  current_version: number
  revision_count: number
  drive_folder_id: string | null
  created_at: string
  updated_at: string
  // Joined
  assignee?: Profile
  tasks_count?: number
  completed_tasks?: number
  project?: Project
}

export interface Task {
  id: string
  module_id: string
  assigned_to: string
  created_by: string
  title: string
  description: string
  task_type: TaskType
  status: TaskStatus
  priority: TaskPriority
  due_date: string
  started_at: string | null
  completed_at: string | null
  time_spent_minutes: number
  created_at: string
  // Joined
  assignee?: Profile
  creator?: Profile
  module?: Module
}

export interface PendingApproval {
  id: string
  requester_id: string
  reviewer_id: string | null
  type: ApprovalType
  status: ApprovalStatus
  payload: Record<string, unknown>
  reviewer_notes: string
  created_at: string
  resolved_at: string | null
  // Joined
  requester?: Profile
  reviewer?: Profile
}

export interface DriveFile {
  id: string
  module_id: string
  drive_file_id: string
  drive_folder_id: string
  filename: string
  mime_type: string
  size_bytes: number
  version: number
  drive_web_link: string
  uploaded_by: string
  created_at: string
  // Joined
  uploader?: Profile
}

export interface ChatMessage {
  id: string
  user_id: string
  module_id: string | null
  role: 'user' | 'assistant' | 'system'
  content: string
  tool_calls: Record<string, unknown>[] | null
  tool_results: Record<string, unknown>[] | null
  created_at: string
}

export interface EmailThread {
  id: string
  project_id: string
  zoho_thread_id: string
  subject: string
  from_email: string
  summary: string
  extracted_actions: { text: string; completed: boolean }[]
  status: 'new' | 'reviewed' | 'actioned'
  received_at: string
  created_at: string
}

export interface ActivityLogEntry {
  id: string
  user_id: string
  module_id: string | null
  task_id: string | null
  action: string
  description: string
  previous_state: Record<string, unknown> | null
  new_state: Record<string, unknown> | null
  undone: boolean
  created_at: string
  // Joined
  user?: Profile
}

export interface TimeEntry {
  id: string
  task_id: string
  user_id: string
  duration_minutes: number
  notes: string
  started_at: string
  ended_at: string
  created_at: string
}

export interface Notification {
  id: string
  user_id: string
  title: string
  message: string
  type: NotificationType
  is_read: boolean
  link: string | null
  created_at: string
}

export interface ProjectTemplate {
  id: string
  name: string
  description: string
  structure: {
    modules: {
      title: string
      tasks: { title: string; task_type: TaskType }[]
    }[]
  }
  created_by: string
  created_at: string
}

// --- UI Helpers ---

export interface NavItem {
  label: string
  href: string
  icon: string
  badge?: number
  roles?: UserRole[]
}

export interface StatCard {
  label: string
  value: string | number
  change?: { value: string; positive: boolean }
  color?: string
  icon?: string
}
