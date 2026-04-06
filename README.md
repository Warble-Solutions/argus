<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16.2-black?style=for-the-badge&logo=nextdotjs" alt="Next.js" />
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Supabase-Ready-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase" />
  <img src="https://img.shields.io/badge/Vercel_AI_SDK-Ready-000?style=for-the-badge&logo=vercel&logoColor=white" alt="Vercel AI" />
</p>

# 👁 ARGUS — AI-Powered LMS Production Coordinator

**Argus** is an intelligent Learning Management System (LMS) production coordinator built to streamline the end-to-end process of creating, managing, and delivering e-learning modules. It combines a manual task-management dashboard with an AI agent (Seeker) powered by Google Gemini, giving production teams a single hub to organize projects, track tasks, manage files, and automate workflows.

> **Status:** Phase 2 Complete (Supabase, Drive, Core AI) · Phase 3 Pending (Dedicated Chat Page, Auth UI, Zoho)

---

## ✨ Features

### 📊 Dashboard & Project Management
- **Dashboard Home** — Overview cards (active projects, tasks, approvals, overdue alerts), task list with priority badges, upcoming deadlines with RAG indicators, activity feed, and quick-action buttons. Data is live from Supabase.
- **Projects** — Card grid view with progress bars, status badges, and inline deadline tracking. Create new projects via a polished modal form.
- **Project Detail** — Stats bar (status, deadline, module count, progress) + modules table with version tracking and revision counts.
- **Module Workspace** — The core production page: breadcrumb navigation, inline task list with status dropdowns, file upload zone, time tracker, and activity log.

### ✅ Task & Approval System
- **Task CRUD** — Create, assign, and manage tasks directly on the module page. Supports task types and priority levels.
- **Smart Deadlines** — Precise 12-hour AM/PM deadline assignments locked globally to IST (+05:30). Automated `pg_cron` background job monitors tasks and dynamically dispatches 48-hour warnings and urgent alerts.
- **Role-Aware Workflows** — Managers/employees create tasks directly; interns see a "Suggest Task" flow that routes to the approval queue.
- **Approval Queue** — Review intern task requests and stage-gate approval cards with Approve, Modify + Approve, and Reject actions.

### ⏱ Time Tracking
- **Live Timer** — Start/stop timer with pulsing animation that tracks active work sessions.
- **Manual Logging** — Log time retroactively via a modal (hours, minutes, notes).
- **Aggregate Views** — Total logged time and current session displayed per module.

### 📁 Google Drive Integration (Admin Connected)
- **OAuth 2.0 Auth** — Admin securely authenticates the master 30TB Google Drive, establishing an app-wide singleton token.
- **Automated Routing** — Cloud-synchronized dynamic folder structures (`Root/Client/Project/Module_XX/`) mapped idempotently.
- **File Management** — Visual file manager with thumbnail previews, extension badges, role-based deletions, versioning, drag-and-drop, and filtering.

### 🤖 "Seeker" AI Agent 
- **Slide-out Assistant** — Context-aware AI assistant utilizing Vercel AI SDK and Google Gemini.
- **Function Calling** — The agent reads the database to answer queries (`listModuleFiles`, `getProjectStatus`, `getRecentUploads`, `getMyTasks`) and can write to the database (`createTask`, `updateTaskStatus`, `updateProjectDeadline`).
- **Role-Gated Actions** — The AI dynamically adapts its capabilities based on whether the logged-in user is an Intern, Employee, or Admin.

### 👥 Team & Access Control  
- **Role System** — Four roles: `Admin`, `Manager`, `Employee`, `Intern`.
- **Database RLS** — Supabase Row Level Security strictly scopes data access, approvals, and actions.
- **Team Management** — View all members, change roles via dropdown, invite new members.

---

## 🏗 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | [Next.js 16](https://nextjs.org/) (App Router, Turbopack) |
| **Language** | TypeScript 5.x |
| **Styling** | Vanilla CSS with custom properties, CSS Modules |
| **Icons** | [Lucide React](https://lucide.dev/) |
| **Database** | Supabase (PostgreSQL + RLS + pg_cron) |
| **Auth** | Supabase Auth |
| **AI** | Vercel AI SDK + Google Gemini 1.5 |
| **File Storage** | Google Drive API v3 |

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

# Google Drive OAuth Apps
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
NEXT_PUBLIC_APP_URL=http://localhost:3000
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

- [x] **Phase 1** — UI Shell + Mock Data
- [x] **Phase 2** — Supabase Integration, Google Drive Integration, Seeker Core AI, Smart Deadlines
- [ ] **Phase 3** — Dedicated `/chat` Page & Team Interactions
- [ ] **Phase 4** — Zoho Mail Integation, Advanced Analytics Charts, Live Real-time Sync

---

## 📄 License & Ownership

This project is proprietary software owned by [Warble Solutions](https://github.com/Warble-Solutions).

<p align="center">
  Built with ❤️ by <a href="https://github.com/Warble-Solutions">Warble Solutions</a>
</p>
