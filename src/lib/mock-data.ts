// ============================================
// Argus — Mock Data for Development
// ============================================

import type {
  Profile,
  Project,
  Module,
  Task,
  PendingApproval,
  ActivityLogEntry,
  Notification,
} from '@/types'

// --- Users ---
export const mockUsers: Profile[] = [
  {
    id: 'u1',
    full_name: 'Raza Ahmed',
    email: 'raza@company.com',
    avatar_url: null,
    role: 'manager',
    created_at: '2026-01-15T09:00:00Z',
    updated_at: '2026-03-30T10:00:00Z',
  },
  {
    id: 'u2',
    full_name: 'Sarah Khan',
    email: 'sarah@company.com',
    avatar_url: null,
    role: 'employee',
    created_at: '2026-01-20T09:00:00Z',
    updated_at: '2026-03-28T10:00:00Z',
  },
  {
    id: 'u3',
    full_name: 'Ahmed Hassan',
    email: 'ahmed@company.com',
    avatar_url: null,
    role: 'employee',
    created_at: '2026-02-01T09:00:00Z',
    updated_at: '2026-03-29T10:00:00Z',
  },
  {
    id: 'u4',
    full_name: 'Ali Raza',
    email: 'ali@company.com',
    avatar_url: null,
    role: 'intern',
    created_at: '2026-03-01T09:00:00Z',
    updated_at: '2026-03-30T10:00:00Z',
  },
  {
    id: 'u5',
    full_name: 'Fatima Noor',
    email: 'fatima@company.com',
    avatar_url: null,
    role: 'intern',
    created_at: '2026-03-05T09:00:00Z',
    updated_at: '2026-03-30T10:00:00Z',
  },
]

// --- Projects ---
export const mockProjects: Project[] = [
  {
    id: 'p1',
    name: 'Safety Training 2026',
    description: 'Complete safety training course for Acme Corporation employees covering workplace safety protocols.',
    client_name: 'Acme Corporation',
    client_email: 'john@acme.com',
    status: 'active',
    template_id: null,
    created_by: 'u1',
    deadline: '2026-05-15T00:00:00Z',
    created_at: '2026-02-01T09:00:00Z',
    updated_at: '2026-03-30T10:00:00Z',
    modules_count: 10,
    completed_modules: 4,
    progress: 40,
  },
  {
    id: 'p2',
    name: 'Onboarding Essentials',
    description: 'New employee onboarding course for TechStart covering company policies, tools, and culture.',
    client_name: 'TechStart Inc.',
    client_email: 'hr@techstart.com',
    status: 'active',
    template_id: null,
    created_by: 'u1',
    deadline: '2026-04-30T00:00:00Z',
    created_at: '2026-02-15T09:00:00Z',
    updated_at: '2026-03-29T10:00:00Z',
    modules_count: 6,
    completed_modules: 2,
    progress: 33,
  },
  {
    id: 'p3',
    name: 'Leadership Workshop',
    description: 'Advanced leadership development modules for GreenField senior management.',
    client_name: 'GreenField Solutions',
    client_email: 'mgmt@greenfield.com',
    status: 'on_hold',
    template_id: null,
    created_by: 'u1',
    deadline: '2026-06-30T00:00:00Z',
    created_at: '2026-03-01T09:00:00Z',
    updated_at: '2026-03-25T10:00:00Z',
    modules_count: 8,
    completed_modules: 0,
    progress: 0,
  },
]

// --- Modules ---
export const mockModules: Module[] = [
  {
    id: 'm1', project_id: 'p1', module_number: 1, title: 'Introduction to Workplace Safety',
    description: 'Overview of safety protocols and why they matter.',
    status: 'approved', stage_gate_pending: false, assigned_to: 'u2',
    deadline: '2026-03-10T00:00:00Z', current_version: 2, revision_count: 1,
    drive_folder_id: null, created_at: '2026-02-01T09:00:00Z', updated_at: '2026-03-10T10:00:00Z',
    tasks_count: 4, completed_tasks: 4,
  },
  {
    id: 'm2', project_id: 'p1', module_number: 2, title: 'Fire Safety & Evacuation',
    description: 'Fire prevention, extinguisher usage, and evacuation procedures.',
    status: 'approved', stage_gate_pending: false, assigned_to: 'u3',
    deadline: '2026-03-15T00:00:00Z', current_version: 1, revision_count: 0,
    drive_folder_id: null, created_at: '2026-02-01T09:00:00Z', updated_at: '2026-03-14T10:00:00Z',
    tasks_count: 4, completed_tasks: 4,
  },
  {
    id: 'm3', project_id: 'p1', module_number: 3, title: 'Chemical Handling Procedures',
    description: 'Safe handling, storage, and disposal of chemicals.',
    status: 'review', stage_gate_pending: true, assigned_to: 'u2',
    deadline: '2026-03-25T00:00:00Z', current_version: 3, revision_count: 2,
    drive_folder_id: null, created_at: '2026-02-01T09:00:00Z', updated_at: '2026-03-28T10:00:00Z',
    tasks_count: 5, completed_tasks: 4,
  },
  {
    id: 'm4', project_id: 'p1', module_number: 4, title: 'Electrical Safety',
    description: 'Recognizing electrical hazards and protective measures.',
    status: 'video_production', stage_gate_pending: false, assigned_to: 'u3',
    deadline: '2026-04-01T00:00:00Z', current_version: 1, revision_count: 0,
    drive_folder_id: null, created_at: '2026-02-01T09:00:00Z', updated_at: '2026-03-30T10:00:00Z',
    tasks_count: 4, completed_tasks: 2,
  },
  {
    id: 'm5', project_id: 'p1', module_number: 5, title: 'Personal Protective Equipment',
    description: 'Types, usage, and maintenance of PPE.',
    status: 'storyboard', stage_gate_pending: false, assigned_to: 'u2',
    deadline: '2026-04-10T00:00:00Z', current_version: 1, revision_count: 0,
    drive_folder_id: null, created_at: '2026-02-01T09:00:00Z', updated_at: '2026-03-27T10:00:00Z',
    tasks_count: 4, completed_tasks: 1,
  },
  {
    id: 'm6', project_id: 'p1', module_number: 6, title: 'Ergonomics & Posture',
    description: 'Proper workstation setup and body mechanics.',
    status: 'not_started', stage_gate_pending: false, assigned_to: 'u4',
    deadline: '2026-04-20T00:00:00Z', current_version: 0, revision_count: 0,
    drive_folder_id: null, created_at: '2026-02-01T09:00:00Z', updated_at: '2026-02-01T09:00:00Z',
    tasks_count: 0, completed_tasks: 0,
  },
]

// --- Tasks ---
export const mockTasks: Task[] = [
  {
    id: 't1', module_id: 'm4', assigned_to: 'u3', created_by: 'u1',
    title: 'Create storyboard for electrical hazards section',
    description: 'Design the visual storyboard covering common electrical hazards in the workplace.',
    task_type: 'storyboard', status: 'done', priority: 'high',
    due_date: '2026-03-20T00:00:00Z', started_at: '2026-03-15T09:00:00Z',
    completed_at: '2026-03-19T17:00:00Z', time_spent_minutes: 480, created_at: '2026-03-10T09:00:00Z',
  },
  {
    id: 't2', module_id: 'm4', assigned_to: 'u3', created_by: 'u1',
    title: 'Record video for lockout/tagout procedures',
    description: 'Film the lockout/tagout demonstration with practical examples.',
    task_type: 'video', status: 'in_progress', priority: 'high',
    due_date: '2026-04-01T00:00:00Z', started_at: '2026-03-25T09:00:00Z',
    completed_at: null, time_spent_minutes: 240, created_at: '2026-03-10T09:00:00Z',
  },
  {
    id: 't3', module_id: 'm4', assigned_to: 'u4', created_by: 'u3',
    title: 'Compile reference images for safety signs',
    description: 'Gather and organize all electrical safety sign images for the module.',
    task_type: 'general', status: 'todo', priority: 'medium',
    due_date: '2026-03-28T00:00:00Z', started_at: null,
    completed_at: null, time_spent_minutes: 0, created_at: '2026-03-15T09:00:00Z',
  },
  {
    id: 't4', module_id: 'm5', assigned_to: 'u2', created_by: 'u1',
    title: 'Draft storyboard for PPE module',
    description: 'Create initial storyboard covering all PPE types and their proper usage.',
    task_type: 'storyboard', status: 'in_progress', priority: 'medium',
    due_date: '2026-04-05T00:00:00Z', started_at: '2026-03-27T09:00:00Z',
    completed_at: null, time_spent_minutes: 120, created_at: '2026-03-20T09:00:00Z',
  },
  {
    id: 't5', module_id: 'm3', assigned_to: 'u2', created_by: 'u1',
    title: 'Final review of chemical handling module',
    description: 'Complete the final quality check before submitting for manager approval.',
    task_type: 'review', status: 'in_progress', priority: 'urgent',
    due_date: '2026-03-31T00:00:00Z', started_at: '2026-03-28T09:00:00Z',
    completed_at: null, time_spent_minutes: 60, created_at: '2026-03-25T09:00:00Z',
  },
  {
    id: 't6', module_id: 'm3', assigned_to: 'u3', created_by: 'u1',
    title: 'Address revision: Update chemical names to IUPAC standards',
    description: 'Client feedback: All chemical names must follow IUPAC naming conventions.',
    task_type: 'revision', status: 'done', priority: 'high',
    due_date: '2026-03-22T00:00:00Z', started_at: '2026-03-20T09:00:00Z',
    completed_at: '2026-03-21T14:00:00Z', time_spent_minutes: 180, created_at: '2026-03-18T09:00:00Z',
  },
]

// --- Pending Approvals ---
export const mockApprovals: PendingApproval[] = [
  {
    id: 'a1',
    requester_id: 'u4',
    reviewer_id: null,
    type: 'task_creation',
    status: 'pending',
    payload: {
      title: 'Add interactive quiz to Module 6',
      description: 'I think Module 6 would benefit from an interactive quiz to test ergonomics knowledge.',
      module_id: 'm6',
      task_type: 'general',
      priority: 'low',
    },
    reviewer_notes: '',
    created_at: '2026-03-30T14:00:00Z',
    resolved_at: null,
  },
  {
    id: 'a2',
    requester_id: 'u5',
    reviewer_id: null,
    type: 'task_creation',
    status: 'pending',
    payload: {
      title: 'Redo intro animation for Module 4',
      description: 'The current intro animation feels too slow, I suggest re-doing it with faster transitions.',
      module_id: 'm4',
      task_type: 'video',
      priority: 'medium',
    },
    reviewer_notes: '',
    created_at: '2026-03-30T16:00:00Z',
    resolved_at: null,
  },
  {
    id: 'a3',
    requester_id: 'u2',
    reviewer_id: null,
    type: 'stage_gate',
    status: 'pending',
    payload: {
      module_id: 'm3',
      module_title: 'Chemical Handling Procedures',
      from_status: 'review',
      to_status: 'approved',
    },
    reviewer_notes: '',
    created_at: '2026-03-29T11:00:00Z',
    resolved_at: null,
  },
]

// --- Activity Log ---
export const mockActivityLog: ActivityLogEntry[] = [
  {
    id: 'al1', user_id: 'u2', module_id: 'm3', task_id: 't5',
    action: 'task_started', description: 'Started final review of Chemical Handling module',
    previous_state: { status: 'todo' }, new_state: { status: 'in_progress' },
    undone: false, created_at: '2026-03-28T09:00:00Z',
    user: mockUsers[1],
  },
  {
    id: 'al2', user_id: 'u3', module_id: 'm4', task_id: 't2',
    action: 'task_started', description: 'Started recording lockout/tagout video',
    previous_state: { status: 'todo' }, new_state: { status: 'in_progress' },
    undone: false, created_at: '2026-03-25T09:00:00Z',
    user: mockUsers[2],
  },
  {
    id: 'al3', user_id: 'u3', module_id: 'm4', task_id: 't1',
    action: 'task_completed', description: 'Completed storyboard for electrical hazards',
    previous_state: { status: 'in_progress' }, new_state: { status: 'done' },
    undone: false, created_at: '2026-03-19T17:00:00Z',
    user: mockUsers[2],
  },
  {
    id: 'al4', user_id: 'u4', module_id: 'm6', task_id: null,
    action: 'approval_requested', description: 'Intern Ali submitted task request: Add interactive quiz to Module 6',
    previous_state: null, new_state: null,
    undone: false, created_at: '2026-03-30T14:00:00Z',
    user: mockUsers[3],
  },
  {
    id: 'al5', user_id: 'u2', module_id: 'm5', task_id: 't4',
    action: 'task_started', description: 'Started drafting storyboard for PPE module',
    previous_state: { status: 'todo' }, new_state: { status: 'in_progress' },
    undone: false, created_at: '2026-03-27T09:00:00Z',
    user: mockUsers[1],
  },
]

// --- Notifications ---
export const mockNotifications: Notification[] = [
  {
    id: 'n1', user_id: 'u1', title: 'Stage Gate Approval', message: 'Module 3 (Chemical Handling) is awaiting your approval to advance to Approved.',
    type: 'stage_gate', is_read: false, link: '/projects/p1/modules/m3', created_at: '2026-03-29T11:00:00Z',
  },
  {
    id: 'n2', user_id: 'u1', title: 'Intern Task Request', message: 'Ali Raza submitted a task request: "Add interactive quiz to Module 6"',
    type: 'approval', is_read: false, link: '/approvals', created_at: '2026-03-30T14:00:00Z',
  },
  {
    id: 'n3', user_id: 'u1', title: 'Deadline Alert', message: 'Module 4 (Electrical Safety) deadline is in 2 days.',
    type: 'deadline', is_read: false, link: '/projects/p1/modules/m4', created_at: '2026-03-30T08:00:00Z',
  },
  {
    id: 'n4', user_id: 'u2', title: 'Task Assigned', message: 'You have been assigned: "Draft storyboard for PPE module"',
    type: 'assignment', is_read: true, link: '/projects/p1/modules/m5', created_at: '2026-03-20T09:00:00Z',
  },
  {
    id: 'n5', user_id: 'u1', title: 'Intern Task Request', message: 'Fatima Noor submitted a task request: "Redo intro animation for Module 4"',
    type: 'approval', is_read: false, link: '/approvals', created_at: '2026-03-30T16:00:00Z',
  },
]

// --- Helper: get current user (mock) ---
export const currentUser = mockUsers[0] // Manager by default

export function getUserById(id: string): Profile | undefined {
  return mockUsers.find(u => u.id === id)
}

export function getProjectById(id: string): Project | undefined {
  return mockProjects.find(p => p.id === id)
}

export function getModuleById(id: string): Module | undefined {
  return mockModules.find(m => m.id === id)
}

export function getModulesByProject(projectId: string): Module[] {
  return mockModules.filter(m => m.project_id === projectId)
}

export function getTasksByModule(moduleId: string): Task[] {
  return mockTasks.filter(t => t.module_id === moduleId)
}

export function getNotificationsForUser(userId: string): Notification[] {
  return mockNotifications.filter(n => n.user_id === userId)
}

export function getUnreadNotificationCount(userId: string): number {
  return mockNotifications.filter(n => n.user_id === userId && !n.is_read).length
}
