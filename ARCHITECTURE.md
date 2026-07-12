# 🏗️ EcoSphere — Architecture & Technical Deep Dive

This document provides a comprehensive technical overview of EcoSphere's architecture, design decisions, and implementation details.

---

## System Overview

EcoSphere follows a **monorepo** structure with a clear separation between the React frontend (`client/`) and the Express backend (`server/`). Communication happens through REST APIs (Axios) and WebSockets (Socket.IO).

```
                     ┌──────────────────────┐
                     │     Browser Client    │
                     │   React 19 + Vite 8   │
                     │   Zustand · Recharts  │
                     └──────────┬───────────┘
                                │
                    ┌───────────┴───────────┐
                    │   HTTP (REST)          │   WebSocket (Socket.IO)
                    ▼                       ▼
            ┌──────────────────────────────────────┐
            │         Express Server (TS)           │
            │                                      │
            │  ┌────────────────────────────┐      │
            │  │      Route Handlers        │      │
            │  │  10 route modules (50+ EP) │      │
            │  └────────────┬───────────────┘      │
            │               │                      │
            │  ┌────────────▼───────────────┐      │
            │  │     Service Layer           │      │
            │  │  ScoringEngine             │      │
            │  │  ForecastEngine            │      │
            │  │  BadgeAwardEngine          │      │
            │  │  NudgeEngine               │      │
            │  │  EmailService              │      │
            │  │  PDFService                │      │
            │  │  RewardRedemption          │      │
            │  │  NotificationService       │      │
            │  └────────────┬───────────────┘      │
            │               │                      │
            │  ┌────────────▼───────────────┐      │
            │  │      Prisma ORM            │      │
            │  │   20+ Models / Tables      │      │
            │  └────────────┬───────────────┘      │
            │               │                      │
            │  ┌────────────┘  ┌────────────┐      │
            │  │               │ CRON Jobs  │      │
            │  │               │ SLAWatcher │      │
            │  │               └────────────┘      │
            └──┼───────────────────────────────────┘
               │
               ▼
        ┌──────────────┐
        │ PostgreSQL 16 │
        │   (Docker)    │
        └──────────────┘
```

---

## Data Flow Patterns

### 1. ESG Score Calculation Flow

```
User Action (e.g., approve CSR participation)
    │
    ▼
Route Handler (social.routes.ts)
    │ Update User XP, PointsBalance
    │ Update EmployeeParticipation status
    │
    ├──▶ BadgeAwardEngine.checkAndAwardBadges(employeeId)
    │       │ Check all unearned badges against current stats
    │       │ Award qualifying badges
    │       └──▶ emitToUser('badge:awarded', ...)
    │            emitToAll('activity:feed', ...)
    │
    └──▶ ScoringEngine.recalculateAndEmit(departmentId)
            │ Calculate ENV score (goal progress avg)
            │ Calculate SOCIAL score (participation rate)
            │ Calculate GOV score (issue resolution + ack rate)
            │ Apply configurable weights (E:40, S:30, G:30)
            │ Upsert DepartmentScore record
            │
            ├──▶ NudgeEngine.evaluateNudges()
            │       │ Clear stale nudges
            │       │ Generate fresh behavioral recommendations
            │
            └──▶ emitToAll('score:update', { scores, orgScore })
                    │
                    ▼
              All connected clients refresh dashboard
```

### 2. Real-Time Event Flow

```
Server Event (e.g., badge awarded)
    │
    ▼
EventBus.emitToUser(userId, 'badge:awarded', payload)
    │
    ▼
Socket.IO Server → user:{userId} room
    │
    ▼
Socket.IO Client (useSocketEvents hook)
    │
    ├──▶ Show celebration overlay (XPCelebrationOverlay)
    ├──▶ Show toast notification
    ├──▶ Update notificationStore (increment unread count)
    └──▶ Update activity feed
```

### 3. SLA Watcher Compliance Flow

```
CRON Job (every 5 minutes)
    │
    ▼
SLAWatcher.ts
    │ Query: ComplianceIssue WHERE status IN (OPEN, IN_PROGRESS)
    │         AND dueDate < NOW() AND isOverdue = false
    │
    ▼
For each overdue issue:
    ├──▶ Update isOverdue = true
    ├──▶ Create Notification (COMPLIANCE_OVERDUE)
    ├──▶ EmailService.sendAlertEmail (simulated SMTP)
    └──▶ emitToAll('compliance:overdue', { issueId, ownerId })
```

### 4. Concurrency-Safe Reward Redemption

```
POST /api/gamification/rewards/:id/redeem
    │
    ▼
Prisma $transaction (timeout: 15s)
    │
    ├──▶ SELECT ... FROM "Reward" WHERE id = X FOR UPDATE  ← Row Lock
    │       │ Verify: status = ACTIVE, stock > 0
    │
    ├──▶ SELECT ... FROM "User" WHERE id = Y FOR UPDATE   ← Row Lock
    │       │ Verify: pointsBalance >= pointsRequired
    │
    ├──▶ UPDATE Reward SET stock = stock - 1
    ├──▶ UPDATE User SET pointsBalance = pointsBalance - cost
    └──▶ INSERT RewardRedemption (FULFILLED)
    │
    ▼ (Outside transaction)
    ├──▶ Create Notification (REWARD_REDEEMED)
    ├──▶ emitToUser('user:update', updatedUser)
    └──▶ emitToAll('activity:feed', { type: 'REWARD_REDEEMED', ... })
```

---

## Scoring Algorithm

The ESG Scoring Engine calculates department-level scores from real operational data:

### Environmental Score (0–100)

```
For each EnvironmentalGoal in department:
    progress = (1 - currentCO₂ / targetCO₂) × 100
    progress = clamp(progress, 0, 100)

envScore = average(all goal progresses)
Default: 50 (if no goals exist)
```

### Social Score (0–100)

```
approvedParticipations = count(EmployeeParticipation WHERE approved AND dept)
activeEmployees = count(User WHERE dept AND role=EMPLOYEE AND active)

socialScore = min(100, (approvedParticipations / activeEmployees) × 100)
Default: 50 (if no employees)
```

### Governance Score (0–100)

```
resolvedIssues = count(ComplianceIssue WHERE resolved AND dept)
totalIssues = count(ComplianceIssue WHERE dept)

acknowledgedPolicies = count(PolicyAcknowledgement WHERE acknowledged AND dept)
totalAcks = count(PolicyAcknowledgement WHERE dept)

issueScore = (resolvedIssues / totalIssues) × 100
ackScore = (acknowledgedPolicies / totalAcks) × 100

govScore = (issueScore × 0.6) + (ackScore × 0.4)
Default: 50 (if no data)
```

### Total ESG Score

```
totalScore = (envScore × envWeight + socialScore × socialWeight + govScore × govWeight) / 100

Where weights are admin-configurable (default: E:40, S:30, G:30)
```

---

## Forecast Engine Algorithm

### Linear Regression

```
Given n historical data points (month_index, co2_total):

    sumX  = Σ(x_i)
    sumY  = Σ(y_i)
    sumXY = Σ(x_i × y_i)
    sumXX = Σ(x_i²)

    slope     = (n × sumXY - sumX × sumY) / (n × sumXX - sumX²)
    intercept = (sumY - slope × sumX) / n

Forecast next 3 months:
    projected_y = slope × (n + offset) + intercept
    projected_y = max(0, projected_y)  // Emissions can't be negative
```

### Anomaly Detection

```
For each month (after 3 months of history):
    rollingAvg = average(previous 3 months)
    deviation  = ((current - rollingAvg) / rollingAvg) × 100%
    
    isAnomaly = deviation > 30%
```

---

## Database Design Highlights

| Design Decision | Rationale |
|-----------------|-----------|
| **UUID primary keys** | Avoid sequential ID exposure, safer for public APIs |
| **Decimal fields for CO₂** | `Decimal(12,4)` precision prevents floating-point rounding in financial/regulatory calculations |
| **Composite unique constraints** | `@@unique([employeeId, activityId])` prevents duplicate participation |
| **Soft delete pattern** | `status: ACTIVE/INACTIVE` instead of hard deletes preserves audit trail |
| **Denormalized `co2Kg`** | Pre-calculated `quantity × factorValue` on CarbonTransaction for fast aggregation queries |
| **Historical score snapshots** | `DepartmentScore` creates new records (not upserts) to maintain score history over time |

---

## Security Measures

| Layer | Implementation |
|-------|----------------|
| **Authentication** | JWT tokens with 24h expiry, bcrypt password hashing (10 salt rounds) |
| **Authorization** | Role-based middleware (`requireAuth`, `requireRole`) on all protected routes |
| **Input Validation** | Zod schemas on every POST/PATCH route with detailed error messages |
| **HTTP Security** | Helmet.js (CSP, X-Frame-Options, HSTS, X-Content-Type-Options) |
| **CORS** | Strict origin allowlist (client URL only) |
| **SQL Injection** | Prevented by Prisma's parameterized queries |
| **File Uploads** | Multer with disk storage, filename sanitization |
| **Transaction Safety** | Row-level locking (`FOR UPDATE`) for concurrent write operations |

---

## Performance Considerations

| Area | Optimization |
|------|-------------|
| **Dashboard** | `Promise.all()` for parallel data fetching (scores, trends, insights, stats) |
| **Score calculation** | Only recalculates affected department + org average (not all departments) |
| **Nudge engine** | Clears all non-dismissed nudges before regenerating (prevents stale data accumulation) |
| **Frontend state** | Zustand (minimal re-renders vs. Context API) |
| **Chart rendering** | Recharts with responsive containers (lazy rendering on viewport) |
| **Socket.IO rooms** | User-specific rooms (`user:{id}`) for targeted event delivery (not broadcast) |

---

*This document is part of the EcoSphere ESG Platform — Odoo Hackathon 2K26*
