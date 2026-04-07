<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16.2-black?style=for-the-badge&logo=nextdotjs" alt="Next.js" />
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Supabase-Ready-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase" />
  <img src="https://img.shields.io/badge/Gemini_2.5-AI-4285F4?style=for-the-badge&logo=google&logoColor=white" alt="Gemini AI" />
</p>

# 👁 ARGUS — AI-Powered LMS Production Coordinator

**Argus** is an intelligent Learning Management System (LMS) production coordinator built to streamline the end-to-end process of creating, managing, and delivering e-learning modules. It combines a manual task-management dashboard with AI agents powered by Google Gemini 2.5, giving production teams a single hub to organize projects, track tasks, manage files, and automate workflows.

> **Status:** MVP — Core Features Complete · [Deployed on Netlify](https://argus-app.netlify.app)

---

## ✨ Features

### 📊 Dashboard & Project Management
- **Dashboard Home** — Overview cards (active projects, open tasks, pending approvals, overdue alerts), filtered "My Tasks" list, recent projects with progress bars, and quick-action buttons. All data is live from Supabase.
- **Projects** — Card grid with progress bars, status badges, deadline tracking, and team leads. Create new projects with client details, deadlines, and lead assignment.
- **Project Detail** — Stats bar (status, deadline, module count, progress) + modules table with version tracking, revision counts, and assignee avatars.
- **Module Workspace** — Breadcrumb navigation, inline task list with status dropdowns, file upload zone, time tracker, and activity log.

### ✅ Task & Approval System
- **Task CRUD** — Create, assign, and manage tasks on the module page. Supports task types (storyboard, video, articulate, review, general) and priority levels (low → urgent).
- **Smart Deadlines** — 12-hour AM/PM datetime picker locked to IST. Automated `pg_cron` job dispatches deadline warnings and urgent alerts.
- **Role-Aware Workflows** — Managers/employees create tasks directly; interns submit through an approval flow. Task completion by non-leads also routes through review.
- **Approval Queue** — Tabbed interface (Pending / Reviewed / All) with expandable feedback, one-click approve, and two-step reject with mandatory feedback.

### ⏱ Time Tracking
- **Live Timer** — Start/stop timer with pulsing animation tracking active work sessions.
- **Manual Logging** — Log time retroactively via modal (hours, minutes, notes).
- **Aggregate Views** — Total logged time displayed per module.

### 📁 Google Drive Integration
- **OAuth 2.0 Auth** — Admin authenticates the master Google Drive, establishing an app-wide singleton token.
- **Automated Folder Structure** — Dynamic folder creation (`Root/Client/Project/Module_XX/`) on project and module creation.
- **File Management** — Visual file browser with extension badges, role-based deletions, versioning, drag-and-drop upload, and category filtering.

### 🤖 Oracle AI Chat
- **Dedicated Chat Interface** — Full-page chat at `/chat` with a thread sidebar, message streaming, and persistent conversation history stored in Supabase.
- **Smart Thread Titles** — AI generates 3–5 word titles based on conversation content.
- **Thread Management** — Create, switch, and delete conversations from the sidebar.
- **Function Calling** — Oracle reads the database (`getProjects`, `getProjectStatus`, `getMyTasks`, `getOverdueItems`, `getTeamOverview`, `listModuleFiles`) and writes to it (`createTask`, `updateTaskStatus`, `updateTaskDeadline`, `updateProjectDeadline`, `addMemberToProject`).
- **Safety Layer** — All write operations require a dry-run confirmation before execution.

### 🔍 Seeker (Ctrl+K)
- **Global Search** — Instant search across projects, modules, tasks, and team members with keyboard navigation.
- **AI Mode** — Switch to AI tab (or press `/`) to ask Argus questions directly from the search palette.
- **Recent Items** — Tracks and surfaces recently visited items via localStorage.

### 📈 Analytics Dashboard (Admin/Manager)
- **Headline Stats** — Active projects, task completion rate, modules delivered, pending approvals — all live from Supabase.
- **Team Performance** — Per-employee breakdown: tasks completed, in-progress, completion rate, project count, with ranked progress bars.
- **Module Pipeline** — Visual breakdown of all modules by status (Not Started → Delivered) with percentage bars.
- **Project Health Table** — Status, progress bars, module/task counts, deadline, and health indicator (Healthy / On Track / At Risk).

### 🔔 Notifications
- **Bell Icon** — Unread badge count in the topbar.
- **Notification Panel** — Click to expand, view details, and navigate to linked resources.
- **Mark Read** — Individual mark-read on click, or "Mark All Read" button.
- **Types** — Assignment, deadline, approval, stage gate, and general notifications.

### 👥 Team & Access Control
- **Role System** — Four roles: `Admin`, `Manager`, `Employee`, `Intern` with cascading permissions.
- **Database RLS** — Supabase Row Level Security scopes data access, approvals, and actions.
- **Team Directory** — View all members with role badges, link to detailed profile pages showing project history and recent tasks.
- **Project Membership** — Add/remove team members to projects with role assignment (Lead / Member / Intern).

### ⚙️ Settings
- **Google Drive Connection** — Connect/view status of the shared Drive account.
- **Coming Soon** — Zoho Mail integration, notification preferences, and stage gate configuration.

---

## 🏗 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | [Next.js 16](https://nextjs.org/) (App Router, Turbopack) |
| **Language** | TypeScript 5.x |
| **Styling** | Vanilla CSS with custom properties, CSS Modules |
| **Icons** | [Lucide React](https://lucide.dev/) |
| **Database** | Supabase (PostgreSQL + RLS + pg_cron) |
| **Auth** | Supabase Auth (Email/Password) |
| **AI** | Vercel AI SDK v6 + Google Gemini 2.5 Flash |
| **File Storage** | Google Drive API v3 |
| **Hosting** | Netlify |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or pnpm

### Environment Variables
Create a `.env.local` file:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Google Gemini AI
GOOGLE_GENERATIVE_AI_API_KEY=your-gemini-key

# Google Drive OAuth
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Timezone (for Netlify)
TZ=Asia/Kolkata
```

### Installation

```bash
git clone https://github.com/Warble-Solutions/argus.git
cd argus
npm install
npm run dev
```

---

## 🗺 Roadmap

### ✅ Completed

- [x] **Phase 1** — UI Shell + Mock Data
- [x] **Phase 2** — Supabase Integration, Google Drive, Seeker AI, Smart Deadlines
- [x] **Phase 3** — Oracle Chat (dedicated `/chat` page with streaming + threads), Auth UI, Notifications
- [x] **Phase 4** — Live Analytics Dashboard, Bug Fixes, MVP Hardening

### 🔲 Remaining

- [ ] **Project Edit / Delete** — Edit name, description, deadline; archive/complete projects
- [ ] **Module Stage Advancement** — UI to advance module status through the pipeline (with optional stage-gate approval)
- [ ] **File Upload on Module Page** — Wire up the upload zone on the module detail page
- [ ] **Activity Log** — Write audit trail entries on task/module/project changes
- [ ] **Role Management** — Allow admins to change team member roles
- [ ] **Invite-Only Signup** — Token-based invite system to restrict registration
- [ ] **Zoho Mail Integration** — Monitor client inboxes, extract action items, AI summarization
- [ ] **Password Reset** — Forgot password flow on login page
- [ ] **User Profile Editing** — Change name, upload avatar
- [ ] **Real-time Updates** — Supabase Realtime subscriptions for live UI updates

---

## 📄 License & Ownership

This project is proprietary software owned by [Warble Solutions](https://github.com/Warble-Solutions).

<p align="center">
  Built with ❤️ by <a href="https://github.com/Warble-Solutions">Warble Solutions</a>
</p>
