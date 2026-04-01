<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16.2-black?style=for-the-badge&logo=nextdotjs" alt="Next.js" />
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Supabase-Ready-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase" />
  <img src="https://img.shields.io/badge/Vercel_AI_SDK-Ready-000?style=for-the-badge&logo=vercel&logoColor=white" alt="Vercel AI" />
</p>

# 👁 ARGUS — AI-Powered LMS Production Coordinator

**Argus** is an intelligent Learning Management System (LMS) production coordinator built to streamline the end-to-end process of creating, managing, and delivering e-learning modules. It combines a manual task-management dashboard with an AI chat interface powered by Google Gemini, giving production teams a single hub to organize projects, track tasks, manage files, and automate workflows.

> **Status:** Phase 1 Complete (UI Shell + Mock Data) · Phase 2 Pending (Supabase Integration)

---

## ✨ Features

### 📊 Dashboard & Project Management
- **Dashboard Home** — Overview cards (active projects, tasks, approvals, overdue alerts), task list with priority badges, upcoming deadlines with RAG indicators, activity feed, and quick-action buttons
- **Projects** — Card grid view with progress bars, status badges, and inline deadline tracking. Create new projects via a polished modal form
- **Project Detail** — Stats bar (status, deadline, module count, progress) + modules table with version tracking and revision counts
- **Module Workspace** — The core production page: breadcrumb navigation, inline task list with status dropdowns, file upload zone, time tracker, and activity log

### ✅ Task & Approval System
- **Task CRUD** — Create, assign, and manage tasks directly on the module page. Supports task types (storyboard, video, articulate, review, revision) and priority levels
- **Role-Aware Workflows** — Managers/employees create tasks directly; interns see a "Suggest Task" flow that routes to the approval queue
- **Approval Queue** — Review intern task requests and stage-gate approval cards with Approve, Modify + Approve, and Reject actions

### ⏱ Time Tracking
- **Live Timer** — Start/stop timer with pulsing animation that tracks active work sessions
- **Manual Logging** — Log time retroactively via a modal (hours, minutes, notes)
- **Aggregate Views** — Total logged time and current session displayed per module

### 👥 Team & Access Control  
- **Role System** — Four roles: `Admin`, `Manager`, `Employee`, `Intern`
- **Team Management** — View all members, change roles via dropdown, invite new members
- **Role-Filtered Navigation** — Sidebar dynamically shows/hides sections based on user role

### ⚙️ Settings & Integrations (Phase 2+)
- **Google Drive** — File storage configuration (root folder, OAuth connection)
- **Zoho Mail** — Email webhook setup for automated notifications
- **Notifications** — Toggle email digests, deadline alerts, and approval notifications
- **Stage Gate Rules** — Require manager approval or task completion before stage transitions

### 💬 AI Chat Interface (Phase 3)
- **Chat with Argus** — Natural language interface with suggestion chips and a clean message UI
- Will be powered by Vercel AI SDK + Google Gemini to automate task creation, status queries, and report generation

---

## 🏗 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | [Next.js 16](https://nextjs.org/) (App Router, Turbopack) |
| **Language** | TypeScript 5.x |
| **Styling** | Vanilla CSS with custom properties, glassmorphism, CSS Modules |
| **Icons** | [Lucide React](https://lucide.dev/) |
| **Fonts** | Inter (UI) + JetBrains Mono (code/data) via `next/font/google` |
| **Database** | Supabase (PostgreSQL + RLS) — *pending* |
| **Auth** | Supabase Auth — *pending* |
| **AI** | Vercel AI SDK + Google Gemini — *pending* |
| **File Storage** | Google Drive API — *pending* |
| **Email** | Zoho Mail API — *pending* |
| **Deployment** | Vercel |

---

## 📁 Project Structure

```
src/
├── app/
│   ├── (auth)/              # Auth route group (login, signup)
│   │   ├── login/
│   │   └── signup/
│   ├── (dashboard)/         # Main app route group
│   │   ├── admin/           # Analytics, team management, settings
│   │   │   ├── team/
│   │   │   └── settings/
│   │   ├── approvals/       # Approval queue
│   │   ├── chat/            # AI chat interface
│   │   ├── emails/          # Zoho integration
│   │   ├── files/           # Google Drive integration
│   │   ├── projects/        # Projects list + [id] detail + [moduleId] workspace
│   │   │   └── [id]/
│   │   │       └── modules/
│   │   │           └── [moduleId]/
│   │   ├── layout.tsx       # Dashboard shell (sidebar + topbar)
│   │   └── page.tsx         # Dashboard home
│   ├── globals.css          # Design system (custom properties, components)
│   └── layout.tsx           # Root layout (fonts, metadata)
├── components/
│   ├── layout/              # Sidebar, Topbar
│   ├── projects/            # ModulesTable (with Create Module modal)
│   ├── tasks/               # TaskSection (with Create Task modal + intern flow)
│   ├── time/                # TimeTracker (live timer + manual log)
│   └── ui/                  # Modal (reusable)
├── lib/
│   ├── mock-data.ts         # Seed data for all entities
│   └── utils.ts             # Formatting, status configs, helpers
└── types/
    └── index.ts             # Core entity interfaces
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or pnpm

### Installation

```bash
# Clone the repository
git clone https://github.com/Warble-Solutions/argus.git
cd argus

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

### Environment Variables

Create a `.env.local` file (not needed for Phase 1 mock mode):

```env
# Supabase (Phase 2)
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Google Gemini AI (Phase 3)
GOOGLE_GENERATIVE_AI_API_KEY=your-gemini-key

# Google Drive (Phase 2)
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
```

---

## 📋 Route Map

| Route | Type | Description |
|-------|------|-------------|
| `/` | Static | Dashboard home |
| `/login` | Static | Auth login |
| `/signup` | Static | Auth signup |
| `/projects` | Static | Project list + create modal |
| `/projects/[id]` | Dynamic | Project detail + modules table + create module modal |
| `/projects/[id]/modules/[moduleId]` | Dynamic | Module workspace (tasks, files, timer, activity) |
| `/approvals` | Static | Approval queue |
| `/chat` | Static | AI chat interface |
| `/files` | Static | Google Drive file browser |
| `/emails` | Static | Zoho Mail integration |
| `/admin` | Static | Analytics dashboard |
| `/admin/team` | Static | Team management |
| `/admin/settings` | Static | Integration settings |

---

## 🎨 Design System

Argus uses a **dark-themed design system** built with CSS custom properties:

- **Color palette**: Deep navy backgrounds with blue/purple/emerald/amber accents
- **Glassmorphism**: Frosted glass cards with `backdrop-filter: blur()`
- **Typography**: Inter for UI text, JetBrains Mono for data/code
- **Animations**: Fade-in-up page transitions, pulsing timer, glow effects
- **Components**: Buttons, cards, badges, inputs, modals, progress bars, toggles, tables, avatars — all defined as reusable utility classes

---

## 🗺 Roadmap

- [x] **Phase 1** — UI Shell + Mock Data (Complete)
- [ ] **Phase 2** — Supabase Database + Auth + Google Drive
- [ ] **Phase 3** — AI Chat (Vercel AI SDK + Gemini)
- [ ] **Phase 4** — Zoho Mail, Analytics Charts, Real-time Updates

---

## 👥 Roles & Permissions

| Capability | Admin/Manager | Employee | Intern |
|-----------|:---:|:---:|:---:|
| View dashboard & projects | ✅ | ✅ | ✅ |
| Create projects & modules | ✅ | ❌ | ❌ |
| Create & assign tasks | ✅ | ✅ | 🔶 *via approval* |
| Approve tasks & stage gates | ✅ | ✅ | ❌ |
| Manage team & settings | ✅ | ❌ | ❌ |
| View analytics | ✅ | ❌ | ❌ |
| Use AI chat | ✅ | ✅ | ✅ |

---

## 📄 License

This project is proprietary software owned by [Warble Solutions](https://github.com/Warble-Solutions).

---

<p align="center">
  Built with ❤️ by <a href="https://github.com/Warble-Solutions">Warble Solutions</a>
</p>
