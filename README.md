<p align="center">
  <img src="client/public/logo.png" alt="EcoSphere Logo" width="120" />
</p>

<h1 align="center">🌿 EcoSphere — Enterprise ESG Management Platform</h1>

<p align="center">
  <strong>A full-stack, real-time ESG (Environmental, Social & Governance) compliance and gamification platform built for the Odoo Hackathon 2K26.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178c6?logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/Node.js-Express-339933?logo=node.js&logoColor=white" />
  <img src="https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql&logoColor=white" />
  <img src="https://img.shields.io/badge/Prisma-ORM-2D3748?logo=prisma&logoColor=white" />
  <img src="https://img.shields.io/badge/Socket.IO-Realtime-010101?logo=socket.io&logoColor=white" />
  <img src="https://img.shields.io/badge/Vite-8.x-646cff?logo=vite&logoColor=white" />
</p>

---

## 📋 Table of Contents

- [Problem Statement](#-problem-statement)
- [Our Solution](#-our-solution)
- [Key Differentiators](#-key-differentiators)
- [Feature Overview](#-feature-overview)
  - [1. Dashboard & Analytics](#1--dashboard--analytics)
  - [2. Environmental Module](#2--environmental-module)
  - [3. Social Module](#3--social-module)
  - [4. Governance Module](#4--governance-module)
  - [5. Gamification Engine](#5--gamification-engine)
  - [6. Report Builder & CSV Export](#6--report-builder--csv-export)
  - [7. Settings & Configuration](#7--settings--configuration)
  - [8. Real-Time Engine](#8--real-time-engine-socketio)
- [Architecture](#-architecture)
  - [System Architecture](#system-architecture)
  - [Backend Services](#backend-services)
  - [Database Schema](#database-schema)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Database Setup](#database-setup)
  - [Running the Application](#running-the-application)
- [API Reference](#-api-reference)
- [Role-Based Access Control (RBAC)](#-role-based-access-control-rbac)
- [Demo Credentials](#-demo-credentials)
- [Demo Walkthrough Script](#-demo-walkthrough-script)
- [Team](#-team)

---

## 🎯 Problem Statement

Modern organizations are under increasing pressure to track, report, and improve their **Environmental, Social, and Governance (ESG)** performance. Current solutions are:

- **Fragmented** — environmental data, social responsibility, and compliance are siloed across spreadsheets and departments.
- **Reactive** — companies only discover compliance violations after regulatory audits.
- **Disengaging** — employees have no motivation to participate in corporate sustainability initiatives.
- **Opaque** — leadership lacks a unified, real-time view of organizational ESG health.

---

## 💡 Our Solution

**EcoSphere** is a unified, real-time ESG management platform that brings Environmental, Social, and Governance data into **one intelligent dashboard**. It transforms ESG compliance from a burden into a competitive advantage through:

| Pillar | What EcoSphere Does |
|--------|---------------------|
| 🌱 **Environmental** | Track carbon emissions by department and scope (Scope 1/2/3), set reduction goals, auto-calculate CO₂ using emission factors, and forecast future trends with a built-in **linear regression engine**. |
| 🤝 **Social** | Manage CSR activities, track employee participation with evidence-based approvals, and measure social engagement rates across departments. |
| 🛡️ **Governance** | Draft and publish compliance policies, schedule internal audits, raise and track compliance issues with SLA deadlines, and enforce policy acknowledgements. |
| 🎮 **Gamification** | Motivate employees with XP, challenges, auto-awarded badges, a live leaderboard, and a points-based reward marketplace — turning sustainability into a game. |
| 📊 **Analytics** | A unified dashboard with animated score rings, emission trend charts, department rankings, behavioral nudges, and an impact translator ("847 trees saved"). |
| ⚡ **Real-Time** | Socket.IO powers live leaderboard updates, instant badge notifications, real-time score recalculation, and a global activity feed — all synchronized across users. |

---

## 🏆 Key Differentiators.

| Feature | What Makes It Special |
|---------|----------------------|
| **Weighted Scoring Engine** | ESG scores are computed from real data (emission goals, CSR participation rates, compliance resolution ratios) with admin-configurable weights (E:40%, S:30%, G:30%). Scores update live after every action. |
| **Forecast Engine** | Built-in linear regression (`y = mx + c`) that projects the next 3 months of carbon emissions based on historical data. Includes anomaly detection (>30% deviation from rolling average). |
| **Behavioral Nudge Engine** | A rules engine that generates actionable nudges: departments with no carbon logs in 7 days, no CSR activity in 14 days, overdue compliance issues, and employees close to unlocking badges. |
| **Concurrency-Safe Reward Redemption** | Uses PostgreSQL row-level locking (`SELECT ... FOR UPDATE`) inside Prisma transactions to prevent double-spending and negative stock — production-grade concurrency control. |
| **SLA Watcher (CRON)** | A background cron job (every 5 minutes) that auto-flags overdue compliance issues, sends simulated SMTP email alerts to owners, and emits real-time Socket.IO breach notifications. |
| **PDF Certificate Generation** | Generates beautifully formatted A4 ESG Performance Certificates using PDFKit with score breakdowns, sustainability metrics, and official signatures. |
| **Impact Translator** | Converts raw ESG data into tangible metrics: "🌳 847 trees saved", "✈️ 12 transatlantic flights of carbon removed", "🕐 320 volunteer hours contributed" — making sustainability personal. |
| **Evidence-Based Approvals** | CSR activities and challenges can require photo/document proof uploads (Multer + disk storage). Managers review evidence before awarding XP. |
| **Auto-Badge Award Engine** | After every XP change, the system checks all badge unlock rules (XP thresholds, challenge counts, CSR counts) and automatically awards earned badges with real-time notifications. |
| **Product Carbon Tracking** | Track the carbon footprint of individual products (CO₂ per unit, recyclability, materials used) and link them to carbon transactions for Scope 3 reporting. |

---

## 📦 Feature Overview

### 1. 📊 Dashboard & Analytics

The command center for organizational ESG health.

| Component | Description |
|-----------|-------------|
| **Score Rings** | Four animated SVG circular progress rings showing Environmental, Social, Governance, and Overall ESG scores (0–100). Animate from 0 on page load with cubic-bezier transitions. |
| **Emissions Trend Chart** | Recharts `LineChart` showing monthly CO₂ emissions over the past 12 months. Green gradient area fill with dark grid lines. |
| **Department ESG Ranking** | Recharts `BarChart` comparing total ESG scores across all active departments. |
| **Smart Insights (Nudges)** | Behavioral nudge cards generated by the NudgeEngine. Dismissible pills with cyan styling. Types: `CARBON_MISSING`, `CSR_MISSING`, `COMPLIANCE_WARNING`, `XP_BOOST`. |
| **Real-World Impact Card** | Translates raw metrics into human-readable impact (trees saved, flights removed, volunteer hours) with animated count-up numbers using Framer Motion. |
| **Live Activity Feed** | Real-time feed of organizational ESG events: CSR approvals, badge unlocks, reward redemptions, compliance updates — all pushed via Socket.IO. |

---

### 2. 🌱 Environmental Module

Complete carbon emissions tracking and management.

| Sub-Module | Features |
|------------|----------|
| **Emission Factors** | CRUD management of emission factors (name, scope, factor value, unit, source type). Pre-seeded with common factors: electricity, fleet diesel, natural gas, business travel, waste disposal. |
| **Carbon Transactions** | Log emissions tied to departments, scopes, and emission factors. Auto-calculates CO₂ (quantity × factor value). Supports manual and automated entries. |
| **Environmental Goals** | Set CO₂ reduction targets per department with deadlines. Track progress (current vs. target). Goal statuses: ACTIVE, ON_TRACK, AT_RISK, COMPLETED. |
| **Forecast & Anomalies** | Linear regression forecasting projects 3 months of future emissions. Anomaly detection flags spikes >30% above the 3-month rolling average. |
| **Recommendations** | Department-specific actionable recommendations generated by the ForecastEngine (e.g., "Logistics is 15% above target — switching 30% of fleet to electric would reduce by ~18 tCO₂"). |
| **Scope Breakdown** | Donut chart visualization of Scope 1 (direct), Scope 2 (energy), and Scope 3 (supply chain) emissions with nature-themed color palette. |

---

### 3. 🤝 Social Module

Employee engagement in corporate social responsibility.

| Sub-Module | Features |
|------------|----------|
| **CSR Activities** | Create and manage corporate social responsibility activities (tree planting, community service, blood drives). Each activity has a category, XP reward, deadline, max participants, and evidence requirement. |
| **Activity Cards** | Beautiful card grid layout with top colored bars, category badges, evidence requirement indicators, XP rewards, and contextual join/status buttons. |
| **Employee Participation** | Employees join activities, optionally uploading proof photos. Participation starts as PENDING → managers approve/reject from a dedicated queue. |
| **Approval Queue** | Managers and admins see a unified table of all pending participations with employee names, activity details, uploaded proof links, and Approve/Reject action buttons. |
| **XP & Points** | On approval, employees receive the activity's XP reward. Both XP (permanent score) and Points Balance (spendable currency) are updated atomically. |
| **Diversity Dashboard** | Placeholder for HR-integrated diversity metrics (future enhancement). |

---

### 4. 🛡️ Governance Module

Policy management, compliance auditing, and issue tracking.

| Sub-Module | Features |
|------------|----------|
| **ESG Policies** | Draft, publish (ACTIVE), and archive governance policies. Each policy has a title, description, effective date, and optional department scope. Auto-filter: creating a draft switches the view to DRAFT; publishing switches to ACTIVE. |
| **Policy Acknowledgements** | Track which employees have acknowledged each policy. Auto-creates PENDING acknowledgement records for all relevant employees when a policy is published. |
| **Internal Audits** | Schedule and manage internal ESG audits per department. Assign auditors, record findings. Audit statuses: PLANNED → IN_PROGRESS → COMPLETED. |
| **Compliance Issues** | Raise issues from audits or independently. Each issue has a severity (LOW/MEDIUM/HIGH/CRITICAL), assigned owner, SLA due date, and status (OPEN → IN_PROGRESS → RESOLVED). |
| **SLA Watcher** | Background cron job (every 5 min) that auto-detects overdue issues, flags them as `isOverdue`, creates notifications, sends simulated emails, and emits Socket.IO events. |
| **Governance Score** | Calculated as: 60% × (resolved issues / total issues) + 40% × (acknowledged policies / total acknowledgements). |

---

### 5. 🎮 Gamification Engine

Transform sustainability into an engaging game.

| Sub-Module | Features |
|------------|----------|
| **Challenges** | Create sustainability challenges with XP rewards, difficulty levels (EASY/MEDIUM/HARD), evidence requirements, and deadlines. Status lifecycle: DRAFT → ACTIVE → UNDER_REVIEW → COMPLETED → ARCHIVED. |
| **Challenge Participation** | Employees join active challenges, optionally uploading proof. Managers approve/reject from a dedicated participation queue. XP awarded on approval. |
| **Badges** | Achievement badges with three unlock rule types: `XP_THRESHOLD` (earn X XP), `CHALLENGE_COUNT` (complete X challenges), `CSR_COUNT` (join X CSR activities). Visual badge cards show earned/locked state. |
| **Auto-Award Engine** | After every XP change (CSR approval, challenge approval), the `BadgeAwardEngine` checks all unearned badges against current stats and awards qualifying ones automatically. Creates notifications + Socket.IO events. |
| **Rewards Marketplace** | Redeemable rewards (eco water bottles, gift cards, extra PTO) with stock tracking and point costs. |
| **Concurrency-Safe Redemption** | Uses PostgreSQL `SELECT ... FOR UPDATE` in a Prisma `$transaction` to atomically: verify stock > 0, verify points >= cost, decrement stock, deduct points, and create redemption log. Prevents race conditions. |
| **Live Leaderboard** | Real-time ranked table of all employees by XP. Top 3 highlighted with gold/silver/bronze. Listens to Socket.IO `leaderboard:update` events for instant refresh. Current user's row highlighted. |
| **XP Celebration Overlay** | Animated full-screen celebration overlay when users earn XP or unlock badges, using GSAP animations. |

---

### 6. 📋 Report Builder & CSV Export

Compile and export ESG data for regulatory disclosures.

| Feature | Description |
|---------|-------------|
| **Report Types** | Four report categories: Summary (ESG scores), Environmental (carbon transactions), Social (CSR participation), Governance (compliance issues). |
| **Date Filtering** | Filter by start/end date with quick presets: This Week, This Month, Quarterly, Annually, Financial Year (April 1st start). |
| **Department Filtering** | Scope reports to specific departments. |
| **Live Preview** | Preview report data in-browser before exporting. |
| **CSV Export** | One-click export to properly formatted CSV with UTF-8 BOM encoding, escaped fields, and descriptive filenames (`ecosphere_environmental_report.csv`). |
| **PDF Certificate** | Generate a formatted A4 ESG Performance Certificate PDF with decorative borders, score breakdowns, impact metrics, verification codes, and auditor signoff section. |

---

### 7. ⚙️ Settings & Configuration

Organization-wide ESG configuration.

| Setting | Description |
|---------|-------------|
| **Departments** | CRUD for organizational departments with codes, parent hierarchies, department heads, and employee counts. |
| **Categories** | Manage CSR Activity and Challenge categories. |
| **ESG Score Weights** | Three sliders controlling how Environmental, Social, and Governance scores contribute to the total ESG score. Must sum to 100%. Default: E:40%, S:30%, G:30%. |
| **Auto-Badge Award** | Toggle automatic badge awarding when unlock rules are met. |
| **Evidence Required** | Toggle mandatory proof uploads for all CSR activities and challenges. |
| **Auto Emission Calc** | Toggle automated emission calculation from operational records. |
| **Email Alerts** | Toggle simulated email notifications for compliance issues. |
| **Notification Settings** | Granular control over notification types (UI-ready for future SMTP integration). |

---

### 8. ⚡ Real-Time Engine (Socket.IO)

Live, bidirectional communication between server and all connected clients.

| Event | Trigger | Effect |
|-------|---------|--------|
| `score:update` | ESG score recalculated | Dashboard score rings refresh instantly |
| `leaderboard:update` | Challenge/CSR approved | Leaderboard re-fetches and animates position changes |
| `badge:awarded` | Badge unlock rule met | Target user sees celebration overlay + notification |
| `notification:new` | Any notification created | Notification bell counter increments + toast appears |
| `activity:feed` | CSR/Challenge/Badge/Reward events | Global activity feed updates in real-time |
| `compliance:overdue` | SLA breach detected by cron | Warning toast + compliance dashboard updates |
| `user:update` | Points balance changes | User's balance refreshes without page reload |

**Architecture:** Each user joins a private room (`user:{userId}`) for targeted notifications. The `eventBus` module provides `emitToAll()` for broadcasts and `emitToUser()` for targeted delivery.

---

## 🏗️ Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (React + Vite)                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐ │
│  │ Zustand   │  │ Recharts │  │ Framer   │  │ Socket.IO Client │ │
│  │ Stores    │  │ Charts   │  │ Motion   │  │ (Real-time)      │ │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────────┘ │
│         ↕ Axios HTTP            ↕ WebSocket                      │
├─────────────────────────────────────────────────────────────────┤
│                       SERVER (Express + TypeScript)               │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │                    REST API Layer                         │    │
│  │  auth · environmental · social · governance              │    │
│  │  gamification · dashboard · reports · settings · products │    │
│  └──────────────────────────────────────────────────────────┘    │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │                   Services Layer                          │    │
│  │  ScoringEngine · ForecastEngine · BadgeAwardEngine       │    │
│  │  NudgeEngine · EmailService · PDFService                 │    │
│  │  RewardRedemption · NotificationService                  │    │
│  └──────────────────────────────────────────────────────────┘    │
│  ┌──────────────────┐  ┌──────────────────────────────────┐     │
│  │ Socket.IO Server  │  │  CRON Jobs (SLA Watcher - 5min) │     │
│  │ (EventBus)        │  └──────────────────────────────────┘     │
│  └──────────────────┘                                            │
│         ↕ Prisma ORM                                             │
├─────────────────────────────────────────────────────────────────┤
│                    PostgreSQL 16 (Docker)                         │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │  20+ tables: User, Department, CarbonTransaction,        │    │
│  │  CsrActivity, Challenge, Badge, EsgPolicy, Audit,        │    │
│  │  ComplianceIssue, DepartmentScore, Notification, ...     │    │
│  └──────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

### Backend Services

| Service | Responsibility |
|---------|----------------|
| `ScoringEngine` | Calculates department-level and org-wide ESG scores using configurable weights. Triggers NudgeEngine after every recalculation. Emits `score:update` via Socket.IO. |
| `ForecastEngine` | Linear regression forecasting (y = mx + c) on historical emission data. Generates 3-month projections. Detects anomalies (>30% deviation). Produces department-specific recommendations. |
| `BadgeAwardEngine` | Event-driven badge checker. Runs after every XP mutation. Checks XP thresholds, challenge counts, and CSR counts against all unearned badges. Awards + notifies. |
| `NudgeEngine` | Business rules engine that generates actionable behavioral nudges. Clears stale nudges and regenerates fresh ones based on current state. |
| `EmailService` | Simulated SMTP service with styled HTML email templates for SLA breaches, badge unlocks, and compliance issue assignments. Prints to console in development. |
| `PDFService` | Generates A4 ESG Performance Certificates using PDFKit. Includes decorative borders, score columns, impact metrics table, and auditor signoff. |
| `RewardRedemption` | Concurrency-safe reward redemption using PostgreSQL row-level locking (`FOR UPDATE`). Prevents double-spending and negative stock races. |
| `NotificationService` | Creates persisted notification records in the database. Referenced by type, title, and optional refType/refId for deep linking. |
| `SLAWatcher` | CRON job (every 5 minutes) that monitors compliance issue due dates. Auto-flags overdue issues, creates notifications, sends emails, and emits real-time events. |

### Database Schema

The PostgreSQL database contains **20+ tables** managed by Prisma ORM:

| Category | Tables |
|----------|--------|
| **Master Data** | `Department`, `Category`, `EmissionFactor`, `EnvironmentalGoal`, `EsgPolicy`, `Badge`, `Reward`, `ConversionFactor`, `EsgSettings`, `Product` |
| **Users & Auth** | `User` (with RBAC roles: ADMIN, MANAGER, EMPLOYEE) |
| **Transactions** | `CarbonTransaction`, `CsrActivity`, `EmployeeParticipation`, `Challenge`, `ChallengePart`, `PolicyAcknowledgement`, `Audit`, `ComplianceIssue` |
| **Analytics** | `DepartmentScore`, `Nudge`, `Notification`, `BadgeAward`, `RewardRedemption` |

---

## 🛠️ Tech Stack

### Frontend

| Technology | Version | Purpose |
|-----------|---------|---------|
| React | 19.x | UI framework |
| TypeScript | 6.x | Type safety |
| Vite | 8.x | Build tool & dev server |
| Zustand | 5.x | Global state management |
| Recharts | 3.x | Data visualization (Line, Bar, Pie, Donut charts) |
| Framer Motion | 12.x | Leaderboard animations & impact counter transitions |
| GSAP | 3.x | XP celebration overlay animations |
| Socket.IO Client | 4.x | Real-time WebSocket communication |
| Axios | 1.x | HTTP client with interceptors |
| React Router | 7.x | Client-side routing |
| React Hot Toast | 2.x | Toast notification system |
| Lucide React | 1.x | Icon library |

### Backend

| Technology | Version | Purpose |
|-----------|---------|---------|
| Node.js | 18+ | Runtime |
| Express | 4.x | REST API framework |
| TypeScript | 5.x | Type safety |
| Prisma | 5.x | ORM & database migrations |
| PostgreSQL | 16 | Relational database |
| Socket.IO | 4.x | WebSocket server |
| Zod | 3.x | Request validation schemas |
| bcryptjs | 2.x | Password hashing (10 salt rounds) |
| JSON Web Token | 9.x | Authentication (24h expiry) |
| Multer | 1.x | File upload handling (disk storage) |
| node-cron | 3.x | Background job scheduling |
| PDFKit | 0.19.x | PDF certificate generation |
| Helmet | 7.x | HTTP security headers |

### Infrastructure

| Technology | Purpose |
|-----------|---------|
| Docker Compose | PostgreSQL + pgAdmin containerization |
| pgAdmin 4 | Database administration UI (port 5050) |

---

## 📁 Project Structure

```
ecosphere/
├── client/                          # React Frontend (Vite + TypeScript)
│   ├── public/                      # Static assets (logo, favicon)
│   ├── src/
│   │   ├── components/              # Reusable UI components
│   │   │   ├── NotificationBell.tsx  # Real-time notification dropdown
│   │   │   ├── ScoreRing.tsx         # Animated SVG circular progress
│   │   │   ├── SectionContextBar.tsx # Module context header
│   │   │   ├── Sidebar.tsx           # Collapsible navigation sidebar
│   │   │   ├── XPCelebrationOverlay.tsx # GSAP celebration animation
│   │   │   └── ui/                   # Base UI primitives
│   │   ├── hooks/                    # Custom React hooks
│   │   │   └── useSocketEvents.ts    # Global Socket.IO event listeners
│   │   ├── lib/                      # Utilities
│   │   │   ├── api.ts                # Axios instance + interceptors
│   │   │   └── socket.ts            # Socket.IO client singleton
│   │   ├── pages/                    # Route-level page components
│   │   │   ├── Auth/                 # Login + Register pages
│   │   │   ├── Dashboard/            # Main ESG dashboard
│   │   │   ├── Environmental/        # Carbon tracking module
│   │   │   ├── Social/               # CSR activities module
│   │   │   ├── Governance/           # Policies, audits, compliance
│   │   │   ├── Gamification/         # Challenges, badges, rewards
│   │   │   ├── Reports/              # Report builder + CSV export
│   │   │   └── Settings/             # Organization configuration
│   │   ├── store/                    # Zustand state stores
│   │   │   ├── authStore.ts          # Authentication state
│   │   │   ├── esgStore.ts           # ESG data + actions
│   │   │   └── notificationStore.ts  # Real-time notifications
│   │   ├── styles/
│   │   │   └── index.css             # Complete design system (CSS vars)
│   │   ├── App.tsx                   # Root component + routing
│   │   └── main.tsx                  # Entry point
│   └── package.json
│
├── server/                           # Express Backend (TypeScript)
│   ├── prisma/
│   │   ├── schema.prisma             # Database schema (20+ models)
│   │   ├── seed.ts                   # Demo data seeder
│   │   └── migrations/              # Prisma migration history
│   ├── src/
│   │   ├── routes/                   # API route handlers
│   │   │   ├── auth.routes.ts        # Register, login, profile
│   │   │   ├── environmental.routes.ts # Emissions, goals, forecasts
│   │   │   ├── social.routes.ts      # CSR activities, participation
│   │   │   ├── governance.routes.ts  # Policies, audits, compliance
│   │   │   ├── gamification.routes.ts # Challenges, badges, rewards
│   │   │   ├── dashboard.routes.ts   # Dashboard aggregations
│   │   │   ├── reports.routes.ts     # Report builder + CSV/PDF
│   │   │   ├── settings.routes.ts    # Configuration CRUD
│   │   │   ├── products.routes.ts    # Product carbon tracking
│   │   │   └── notifications.routes.ts # Notification API
│   │   ├── services/                 # Business logic services
│   │   │   ├── ScoringEngine.ts      # ESG score calculation
│   │   │   ├── ForecastEngine.ts     # Linear regression + anomalies
│   │   │   ├── BadgeAwardEngine.ts   # Auto badge awarding
│   │   │   ├── NudgeEngine.ts        # Behavioral nudge generation
│   │   │   ├── EmailService.ts       # Simulated SMTP emails
│   │   │   ├── PDFService.ts         # Certificate generation
│   │   │   ├── RewardRedemption.ts   # Concurrency-safe redemption
│   │   │   └── NotificationService.ts # Notification persistence
│   │   ├── jobs/
│   │   │   └── SLAWatcher.ts         # CRON: compliance SLA monitor
│   │   ├── socket/
│   │   │   └── eventBus.ts           # Socket.IO event emitter
│   │   ├── middleware/
│   │   │   ├── auth.ts               # JWT auth + RBAC middleware
│   │   │   └── validate.ts           # Zod schema validation
│   │   ├── lib/
│   │   │   └── prisma.ts             # Prisma client singleton
│   │   └── index.ts                  # Server entry point
│   ├── uploads/                      # Evidence file storage
│   └── package.json
│
├── docker-compose.yml                # PostgreSQL + pgAdmin
├── .gitignore
└── README.md                         # ← You are here
```

---

## 🚀 Getting Started

### Prerequisites

| Requirement | Version |
|-------------|---------|
| Node.js | 18.x or higher |
| npm | 9.x or higher |
| Docker & Docker Compose | Latest |
| Git | Latest |

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/vedeshskhatri/ecosphere-esg.git
cd ecosphere

# 2. Start the PostgreSQL database
docker-compose up -d

# 3. Install server dependencies
cd server
npm install

# 4. Configure environment variables
#    Create a .env file in /server with:
cat > .env << EOF
DATABASE_URL="postgresql://ecosphere:ecosphere123@localhost:5432/ecosphere"
JWT_SECRET="ecosphere-super-secret-jwt-key-2k26"
JWT_EXPIRES_IN="24h"
PORT=5000
CLIENT_URL="http://localhost:3000"
UPLOAD_DIR="./uploads"
EOF

# 5. Install client dependencies
cd ../client
npm install
```

### Database Setup

```bash
cd server

# Run Prisma migrations
npx prisma migrate dev --name init

# Generate Prisma client
npx prisma generate

# Seed demo data
npm run db:seed

# (Optional) Open Prisma Studio for visual DB exploration
npm run db:studio
```

### Running the Application

```bash
# Terminal 1: Start the server
cd server
npm run dev
# → Server runs on http://localhost:5000

# Terminal 2: Start the client
cd client
npm run dev
# → Client runs on http://localhost:3000
```

### Accessing Services

| Service | URL |
|---------|-----|
| Frontend App | http://localhost:3000 |
| Backend API | http://localhost:5000/api |
| pgAdmin | http://localhost:5050 |
| Prisma Studio | http://localhost:5555 |

---

## 📡 API Reference

### Authentication (`/api/auth`)

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/register` | Public | Register a new user |
| POST | `/login` | Public | Authenticate and receive JWT |
| GET | `/me` | Authenticated | Get current user profile |

### Environmental (`/api/environmental`)

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/emission-factors` | Auth | List all emission factors |
| POST | `/emission-factors` | Admin/Manager | Create emission factor |
| GET | `/transactions` | Auth | List carbon transactions |
| POST | `/transactions` | Admin/Manager | Log a carbon transaction |
| GET | `/goals` | Auth | List environmental goals |
| POST | `/goals` | Admin/Manager | Create a reduction goal |
| PATCH | `/goals/:id` | Admin/Manager | Update goal progress |
| GET | `/forecast` | Auth | Get emission forecast + anomalies |

### Social (`/api/social`)

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/activities` | Auth | List CSR activities |
| POST | `/activities` | Admin/Manager | Create CSR activity |
| PATCH | `/activities/:id` | Admin/Manager | Update activity |
| POST | `/activities/:id/join` | Auth | Join an activity (with optional proof upload) |
| GET | `/activities/participations` | Admin/Manager | Pending approval queue |
| PATCH | `/activities/participations/:id/approve` | Admin/Manager | Approve participation + award XP |
| PATCH | `/activities/participations/:id/reject` | Admin/Manager | Reject participation |

### Governance (`/api/governance`)

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/policies` | Auth | List ESG policies |
| POST | `/policies` | Admin/Manager | Create a policy |
| PATCH | `/policies/:id` | Admin/Manager | Update / publish / archive policy |
| GET | `/policies/:id/acknowledgements` | Auth | View acknowledgement status |
| PATCH | `/acknowledgements/:id/acknowledge` | Auth | Acknowledge a policy |
| GET | `/audits` | Auth | List internal audits |
| POST | `/audits` | Admin/Manager | Schedule an audit |
| PATCH | `/audits/:id` | Admin/Manager | Update audit status/findings |
| GET | `/compliance-issues` | Auth | List compliance issues |
| POST | `/compliance-issues` | Admin/Manager | Raise a compliance issue |
| PATCH | `/compliance-issues/:id` | Admin/Manager | Update issue status |

### Gamification (`/api/gamification`)

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/challenges` | Auth | List challenges (filter by status) |
| POST | `/challenges` | Admin/Manager | Create a challenge |
| PATCH | `/challenges/:id/status` | Admin/Manager | Transition challenge status |
| POST | `/challenges/:id/join` | Auth | Join a challenge |
| GET | `/challenges/participations` | Admin/Manager | Challenge approval queue |
| PATCH | `/challenges/participations/:id/approve` | Admin/Manager | Approve + award XP |
| PATCH | `/challenges/participations/:id/reject` | Admin/Manager | Reject participation |
| GET | `/leaderboard` | Auth | Global XP leaderboard |
| GET | `/badges` | Auth | All badges with earned status |
| GET | `/my-badges` | Auth | Current user's earned badges |
| GET | `/rewards` | Auth | Available rewards marketplace |
| POST | `/rewards/:id/redeem` | Auth | Redeem a reward (concurrency-safe) |

### Dashboard (`/api/dashboard`)

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/` | Auth | Full dashboard data (scores, trends, insights, impact, feed) |
| GET | `/certificate/pdf` | Auth | Download ESG Performance Certificate PDF |

### Reports (`/api/reports`)

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/environmental` | Auth | Environmental report data |
| GET | `/social` | Auth | Social report data |
| GET | `/governance` | Auth | Governance report data |
| GET | `/summary` | Auth | ESG summary scores |
| GET | `/export` | Auth | CSV download (type, date range, department filters) |

### Settings (`/api/settings`)

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/departments` | Auth | List departments |
| POST | `/departments` | Admin | Create department |
| PATCH | `/departments/:id` | Admin | Update department |
| GET | `/categories` | Auth | List categories |
| POST | `/categories` | Admin/Manager | Create category |
| GET | `/esg-config` | Admin | Get ESG settings |
| PATCH | `/esg-config` | Admin | Update ESG settings |

### Products (`/api/products`)

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/` | Auth | List products |
| GET | `/:id` | Auth | Get product details |
| POST | `/` | Admin/Manager | Create product |
| PATCH | `/:id` | Admin/Manager | Update product |
| DELETE | `/:id` | Admin | Delete product |

---

## 🔐 Role-Based Access Control (RBAC)

| Role | Capabilities |
|------|-------------|
| **ADMIN** | Full system access. Manage departments, categories, ESG settings, policies, audits, emission factors. Create/approve all entities. Configure score weights and system toggles. |
| **MANAGER** | Create and manage CSR activities, challenges, and policies. Approve/reject employee participations. View all department data. Cannot modify system settings. |
| **EMPLOYEE** | Join CSR activities and challenges. Upload proof evidence. View leaderboard and badges. Redeem rewards. Acknowledge policies. View personal XP and notification history. |

---

## 🔑 Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | `vedesh@ecosphere.com` | `password123` |
| Manager | `aman@ecosphere.com` | `password123` |
| Employee | `swapnil@ecosphere.com` | `password123` |
| Employee | `harsh@ecosphere.com` | `password123` |

---

## 🎬 Demo Walkthrough Script

Use this script to walk through EcoSphere during the hackathon recording:

### Act 1: The Problem (30 seconds)
> *"Organizations struggle with fragmented ESG data — environmental metrics in one spreadsheet, social programs in another, governance policies buried in email threads. There's no unified view, no real-time feedback, and employees have zero incentive to participate in sustainability. EcoSphere solves this."*

### Act 2: Dashboard Overview (60 seconds)
1. **Login** as Admin (`vedesh@ecosphere.com`)
2. Show the **Dashboard** — four animated score rings, emission trend chart, department ranking bar chart
3. Highlight **Smart Insights** — behavioral nudges from the NudgeEngine
4. Show the **Real-World Impact Card** — "847 trees saved, 12 transatlantic flights of carbon removed"
5. Point out the **Live Activity Feed** — real-time organizational ESG events

### Act 3: Environmental Module (45 seconds)
1. Navigate to **Environmental → Carbon Transactions**
2. Show the transaction log with scopes and departments
3. Switch to **Environmental Goals** — show progress tracking
4. Highlight the **Scope Breakdown donut chart** (Scope 1/2/3)
5. Mention: *"Our Forecast Engine uses linear regression to predict future emissions and flags anomalies."*

### Act 4: Social Module (45 seconds)
1. Navigate to **Social → CSR Activities**
2. Show the beautiful activity card grid
3. Click **Join** on an activity → upload evidence
4. Switch to **Employee Participation** tab → show approval queue
5. **Approve** the participation → mention XP is awarded automatically

### Act 5: Governance Module (45 seconds)
1. Navigate to **Governance → Policies**
2. Create a new **Draft Policy** → notice the filter auto-switches to show it
3. Show **Audits** and **Compliance Issues**
4. Mention: *"Our SLA Watcher runs every 5 minutes to auto-flag overdue compliance issues and notify owners."*

### Act 6: Gamification — The Magic (90 seconds)
1. Open **two browser windows** side by side
2. **Window 1**: Login as Manager
3. **Window 2**: Login as Employee
4. Window 2: Employee **joins a challenge**
5. Window 1: Manager navigates to **Challenge Participation** → **Approves** it
6. **Watch Window 2**: XP celebration animation plays, badge unlocked notification appears, leaderboard position updates — **all in real-time via Socket.IO**
7. Show the **Rewards Marketplace** → redeem a reward
8. Mention: *"Redemption uses PostgreSQL row-level locking for concurrency safety — no double-spending, ever."*

### Act 7: Reports & Configuration (30 seconds)
1. Navigate to **Reports** → Select Environmental report
2. Apply date filters → **Export CSV** → show the downloaded file
3. Navigate to **Settings → ESG Configuration** → adjust score weights
4. Show the weight sliders and system toggles

### Act 8: Technical Highlights (30 seconds)
> *"Under the hood: TypeScript end-to-end, Prisma ORM with 20+ PostgreSQL tables, Zod validation, Socket.IO for real-time, a scoring engine with configurable weights, a forecast engine with anomaly detection, and a badge award engine that fires after every XP mutation. All deployed with Docker Compose."*

---

## 👥 Team

| Name | Role | Contributions |
|------|------|---------------|
| **Vedesh Khatri** | Full-Stack Lead | Project architecture, backend services, database design, real-time engine, deployment |
| **Swapnil** | Frontend Lead | Dashboard UI, social module, gamification UI, real-time client, animations |
| **Aman** | Backend Lead | Environmental routes, governance routes, scoring engine, forecast engine, SLA watcher |

---

## Contributors

This project is actively developed as part of a hackathon.

---

<p align="center">
  <strong>Built with 💚 for the Odoo Hackathon 2K26</strong><br/>
  <em>"Making sustainability measurable, actionable, and engaging."</em>
</p>
