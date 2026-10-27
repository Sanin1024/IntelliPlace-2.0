# IntelliPlace

> **Personalized Placement Training and Career Readiness Platform**  
> A full-stack web application designed for higher education institutions to monitor student career readiness, administer structured placement mock tests, and deliver data-driven aptitude and technical preparation.

---

## 1. System Overview

IntelliPlace is an enterprise-grade placement preparation and analytics portal designed for engineering colleges. It bridges the gap between students, technical trainers, and the institutional Training & Placement Officer (TPO) by establishing a transparent, unified source of truth for campus placement readiness.

### Key Capabilities
- **Institutional Hierarchy**: Organizes students by Academic Branch and Graduation Batch with granular activation/deactivation controls.
- **Unified Readiness Engine**: Computes deterministic, three-factor readiness scores ($[0, 100]$) classifying students into strict readiness bands.
- **Mock Examination Portal**: Server-enforced timed tests with windowed scheduling, batch isolation, real-time keyboard navigation, and immediate scoring.
- **Adaptive Practice & Diagnostics**: Topic-wise practice sessions identifying weak areas (<50% accuracy) and generating targeted study recommendations.
- **Placement Officer Intelligence**: Cohort analytics, interactive drive publishing, at-risk student intervention lists, and CSV export shielded against formula injection.
- **Multi-Role RBAC**: Strict separation of concerns across Administrator, Placement Officer, Trainer, and Student personas.

---

## 2. Architecture

```mermaid
flowchart TB
    subgraph Client["Frontend Client (React 19 + Vite)"]
        UI["Tailored Role Portals\n(Admin, PO, Trainer, Student)"]
        Axios["Axios API Client\n(Bearer Interceptor & Global Error Toast)"]
        A11y["Accessible Components\n(WCAG Compliant, 375px+ Mobile Responsive)"]
    end

    subgraph Gateway["API Server (Express 5 + TypeScript)"]
        Helmet["Helmet & CORS Security"]
        RateLimit["Multi-Tier Rate Limiters\n(Auth, Submits, Global API)"]
        AuthMid["JWT Authentication & RBAC Middleware"]
        OwnershipMid["Trainer & Student Ownership Guards"]
        Validation["Zod Schema Validation Middleware"]
    end

    subgraph Services["Core Application Services"]
        ReadinessSvc["services/readiness.ts\n(Unified 60/30/10 Readiness Formula)"]
        AnalyticsSvc["Cohort Analytics & Weak Topic Detector"]
        ExportSvc["CSV Exporter\n(Neutralizes Formula Injection)"]
        RunnerService["LocalProcessRunner\n(Semaphore, 2s Timeout, 64KB Max)"]
    end

    subgraph DataTier["Data Tier"]
        Prisma["Prisma 7 ORM (@prisma/adapter-pg)"]
        Postgres[(PostgreSQL 17 Database)]
        Storage[("Secure File Storage\n(/uploads - No Direct Public Execution)")]
    end

    UI --> Axios
    Axios --> Gateway
    Gateway --> Helmet --> RateLimit --> AuthMid --> OwnershipMid --> Validation
    Validation --> Services
    Services --> Prisma
    Prisma --> Postgres
    Services --> Storage
    Services -.->|"When CODE_RUNNER_ENABLED=true"| RunnerService
```

---

## 3. Technology Stack

| Layer | Technologies | Rationale / Key Libraries |
|---|---|---|
| **Frontend Framework** | React 19, TypeScript 5.9 | Concurrent rendering, typed state management |
| **Build & Tooling** | Vite 7, TypeScript (`tsc -b`) | Sub-second HMR, optimized production chunks |
| **Routing & Navigation** | React Router v7 | Nested route configurations, layout wrappers |
| **Data Visualization** | Recharts 3.10 | Responsive SVG charting for analytics & score trends |
| **Iconography & Styling** | Lucide React, Vanilla CSS | Lightweight icons, responsive design system, zero bloated CSS runtime |
| **E2E & Accessibility** | Playwright, `@axe-core/playwright` | Automated browser regressions & WCAG 2.1 compliance |
| **Backend Runtime** | Node.js (v20+), Express 5 | High-throughput asynchronous REST API |
| **Database & ORM** | PostgreSQL 17, Prisma 7 | Strict relational integrity, `@prisma/adapter-pg` driver adapter |
| **Authentication & Auth** | JSON Web Tokens (`jsonwebtoken`), `bcryptjs` | Stateless authentication with 64-byte rotating secrets, 10-round salt hashing |
| **Validation & Security** | Zod 4, Helmet 8, `express-rate-limit` 8 | Request contract validation, secure HTTP headers, abusive request throttling |

---

## 4. Environment Variables

### Backend (`backend/.env`)

| Variable | Type | Default / Example | Purpose / Constraints |
|---|---|---|---|
| `DATABASE_URL` | String | `postgresql://intelliplace:intelliplace_dev_only@localhost:5433/intelliplace` | PostgreSQL connection string with credentials |
| `PORT` | Number | `4000` | Port for the Express application server |
| `NODE_ENV` | String | `development` | Runtime mode: `development`, `production`, or `test` |
| `CORS_ORIGIN` | String | `http://localhost:5173` | Allowed origin for Cross-Origin Resource Sharing |
| `JWT_SECRET` | Hex String | *(64-byte cryptographically secure random string)* | Secret key for signing and verifying authentication tokens |
| `JWT_EXPIRES_IN` | String | `7d` | Token validity duration |
| `CODE_RUNNER_ENABLED` | Boolean | `false` | Gate for local process code execution (keep `false` unless testing) |
| `RUNNER_MAX_CONCURRENCY` | Number | `2` | Maximum concurrent compilation/execution worker processes |
| `RUNNER_TIMEOUT_MS` | Number | `2000` | Execution timeout in milliseconds before killing process |
| `RUNNER_MAX_SOURCE_BYTES` | Number | `65536` | Maximum accepted submission payload size (64 KB) |

### Frontend (`frontend/.env`)

| Variable | Type | Default / Example | Purpose |
|---|---|---|---|
| `VITE_API_URL` | String | `http://localhost:4000/api` | Base URL for REST API requests |

---

## 5. npm Scripts Reference

Run from repository root or using `--workspace <backend|frontend>`.

| Script | Working Directory | Command / Action |
|---|---|---|
| `npm run dev:backend` | Root | Starts backend server in watch mode via `tsx` (`http://localhost:4000`) |
| `npm run dev:frontend` | Root | Starts frontend Vite dev server (`http://localhost:5173`) |
| `npm run build` | Root | Type-checks and compiles both backend (`tsc`) and frontend (`vite build`) |
| `npm run seed` | Root / Backend | Executes base seeder: branches, batches, foundational topics, initial users |
| `npm run seed:reset` | Root / Backend | Truncates all tables and re-executes base seed |
| `npm run seed:demo` | Root / Backend | Populates full 6-week activity seed, test questions, problems, and student personas |
| `npm run demo:reset` | Root / Backend | Idempotent one-command reset: executes `seed:reset` followed by `seed:demo` |
| `npm run validate:content` | Root / Backend | Programmatic validation verifying zero question arithmetic or key mismatches |
| `npm run db:counts` | Root / Backend | Verifies database integrity against exact expected record counts across 14 tables |
| `npm run e2e` | Root / Backend | Executes comprehensive 24-point backend API integration and security regression suite |
| `npm run smoke` | Root / Frontend | Executes Playwright browser smoke test across all roles, pages, and take-test flow |

---

## 6. Setup from a Clean Clone

### Prerequisites
- **Node.js**: `v20.0.0` or higher (Node 24 LTS verified)
- **npm**: `v10.0.0` or higher
- **PostgreSQL**: `17` running on port `5433` (or configured port)

### Step-by-Step Instructions

1. **Clone and Install Dependencies**:
   ```bash
   git clone <repository-url> intelliplace
   cd intelliplace
   npm install
   ```

2. **Configure Environment Variables**:
   ```bash
   # Backend configuration
   cp backend/.env.example backend/.env
   ```
   Generate a secure 64-byte JWT secret and append it:
   ```bash
   node -e "console.log('JWT_SECRET=\"' + require('crypto').randomBytes(64).toString('hex') + '\"')" >> backend/.env
   ```

3. **Initialize Database Schema & Generate Prisma Client**:
   ```bash
   npm run prisma:generate --workspace backend
   npm run db:push --workspace backend
   ```

4. **Seed Demo Dataset**:
   ```bash
   npm run demo:reset
   ```

5. **Verify Database Counts**:
   ```bash
   npm run db:counts
   ```

6. **Start Local Development Servers**:
   ```bash
   # Terminal 1: Backend API
   npm run dev:backend

   # Terminal 2: Frontend Client
   npm run dev:frontend
   ```
   Open `http://localhost:5173` in your browser.

---

## 7. Demo Accounts & Student Personas

All accounts use predictable passwords for demonstration and evaluation:

| Role / Persona | Email | Password | Readiness | Characteristics & Demonstration Scope |
|---|---|---|---|---|
| **Administrator** | `admin@intelliplace.edu` | `Admin@123` | N/A | System administration: academic branches, batches, user lifecycle & role forcing. |
| **Placement Officer (PO)** | `po@intelliplace.edu` | `Po@12345` | N/A | Executive dashboard, readiness breakdown, CSV roster export, company drive publisher. |
| **Trainer 1 (Aptitude)** | `trainer1@intelliplace.edu` | `Trainer@123` | N/A | Aptitude question bank author, PDF study material manager, timed test creator. |
| **Trainer 2 (Technical)** | `trainer2@intelliplace.edu` | `Trainer@123` | N/A | Technical problem author, coding test cases & starter template manager. |
| **Student: Alice Johnson** | `alice@student.edu` | `Student@123` | **Ready (80/100)** | CSE 2025 (CGPA 9.1). High achiever: 5 distinct coding problems solved, 3 mock attempts. Eligible for all Tier-1 company drives. |
| **Student: Bob Smith** | `bob@student.edu` | `Student@123` | **Almost Ready (54/100)** | CSE 2025 (CGPA 7.8). Moderate readiness: 4 coding problems solved. Demonstrates weak topic diagnostic in Verbal Ability (33% accuracy) with targeted resource recommendations. |
| **Student: Carol Williams** | `carol@student.edu` | `Student@123` | **Almost Ready (43/100)** | IT 2026 (CGPA 6.5). Demonstrates consistent 6-week upward progression across 5 mock tests (40% → 47% → 53% → 67% → 73%). |
| **Student: Dave Brown** | `dave@student.edu` | `Student@123` | **Not Ready (5/100)** | ECE 2025 (CGPA 8.2). High academic CGPA but disengaged from placement prep: 1 coding problem attempted (0 solved). Top candidate on PO "Needs Attention" list. |
| **Student: Eve Davis** | `eve@student.edu` | `Student@123` | **Not Ready (5/100)** | IT 2026 (CGPA 8.9). Zero mock tests and zero coding attempts. Showcases seamless empty states and onboarding guidance. |

---

## 8. Readiness Scoring: One Source of Truth

Student readiness is calculated deterministically by a single function (`backend/src/services/readiness.ts`) utilized identically by the student dashboard, student analytics endpoint, and the Placement Officer cohort summary.

### Mathematical Formula

$$\text{Readiness Score} = \text{round}(\text{Aptitude Component} + \text{Coding Component} + \text{Profile Component})$$

Clamped strictly within the integer range $[0, 100]$.

1. **Aptitude Component (Maximum 60 points)**:
   - Proportional to the student's cumulative performance across mock tests:
     $$\text{Aptitude Points} = 60 \times \frac{\sum \text{Best Marks Per Distinct Test}}{\sum \text{Total Marks Per Distinct Test}}$$
   - If no mock tests have been attempted, points $= 0$.

2. **Coding Component (Maximum 30 points)**:
   - **Proportional Model**: Evaluates distinct coding problems solved against total published coding problems:
     $$\text{Coding Points} = 30 \times \frac{\text{Distinct Solved Problems}}{\text{Total Published Coding Problems}}$$
   - Only accepted submissions count. Repeated solves of the same problem do not grant duplicate points.

3. **Profile Component (Maximum 10 points)**:
   - Awarded based on placement profile completeness:
     - **+4 points**: Valid academic CGPA entered ($> 0.0$).
     - **+3 points**: Valid Resume URL uploaded/linked.
     - **+3 points**: At least one technical skill tag declared.

### Exact Readiness Bands
- **`Not Ready`**: Score strictly less than 40 ($< 40$).
- **`Almost Ready`**: Score from 40 up to 70 inclusive ($40 - 70$).
- **`Ready`**: Score strictly greater than 70 ($> 70$).

*(Note: Replaced earlier legacy labels "Preparing" and "Not Started" to enforce an unambiguous three-tier readiness taxonomy).*

---

## 9. API Endpoint Summary by Module

All endpoints are prefixed with `/api`. Protected routes require `Authorization: Bearer <token>`.

### Authentication (`/api/auth`)
- `POST /register`: Student registration with batch/branch validation.
- `POST /login`: Credential verification; returns JWT and user profile.
- `GET /me`: Authenticated identity and role verification.
- `POST /change-password`: Self-service password change.

### Student Portal (`/api/student`)
- `GET /profile`: Fetch student academic profile, resume, and skills.
- `PUT /profile`: Update profile fields (recomputes profile score).
- `GET /dashboard`: Aggregated dashboard metrics, active tests, upcoming drives, and readiness breakdown.

### Practice Module (`/api/practice`)
- `GET /topics`: List question bank topics with question counts.
- `POST /start`: Generate an un-timed practice session for selected topic.
- `POST /submit`: Score practice session, update student history, return answer rationales.

### Test Engine (`/api/tests`)
- `GET /`: List eligible mock tests for authenticated student's batch.
- `GET /:id`: Fetch test details and sanitized questions (answers stripped).
- `POST /:id/start`: Initialize timed attempt; creates attempt timestamp.
- `POST /:id/submit`: Grade submitted answers; enforces server-side time window.
- `GET /:id/results`: Fetch detailed post-submission score and question breakdown.

### Coding Problems (`/api/problems`)
- `GET /`: List coding problems with difficulty and tags.
- `GET /:id`: Fetch problem details and visible sample cases (hidden cases strictly omitted).
- `POST /:id/submit`: Submit solution; evaluated by code runner or test simulator.

### Analytics (`/api/analytics`)
- `GET /student/:id/readiness`: Comprehensive readiness components and band.
- `GET /student/:id/weak-topics`: Identified weak areas ($<50\%$ accuracy) with minimum attempt threshold.
- `GET /student/:id/trend`: Historical chronological score progression.

### Placement Officer (`/api/po`)
- `GET /summary`: Aggregated institutional readiness statistics and band distribution.
- `GET /students`: Filterable student roster with readiness scores and eligibility.
- `GET /attention`: At-risk students requiring placement intervention.
- `GET /export-csv`: Export student roster with formula injection sanitization.

### Company Drives (`/api/companies`)
- `GET /`: List active recruitment drives and eligibility criteria.
- `POST /`: Create company drive (PO only).
- `PUT /:id`: Update drive details and deadlines (PO only).
- `POST /:id/target`: Student bookmarking/targeting of drive.

### Trainer Management (`/api/trainer`)
- `POST /questions`: Create aptitude questions with explanations.
- `POST /tests`: Create mock test with time limit, window, and batch assignment.
- `POST /resources`: Upload study PDFs with metadata and ownership tracking.
- `GET /resources`: List resources authored by authenticated trainer.

### Administration (`/api/admin`)
- `GET /branches`, `POST /branches`: Manage institutional branches.
- `GET /batches`, `POST /batches`: Manage graduation batches.
- `GET /users`, `PATCH /users/:id/toggle-active`: User activation control.

---

## 10. Security Measures Implemented

1. **Cryptographic Authentication**:
   - Passwords hashed using `bcryptjs` with salt work factor of 10.
   - JWT tokens signed with high-entropy 64-byte secrets; invalid or expired tokens rejected uniformly.

2. **Role-Based Access Control (RBAC)**:
   - Dedicated `requireRole(['ADMIN', 'PO', 'TRAINER', 'STUDENT'])` middleware.
   - Role boundaries enforced at the controller layer; students cannot access trainer test creation or administrative routes.

3. **Ownership Verification**:
   - Trainers can only edit, inspect, or delete tests and resources they personally authored.
   - Students can only view their own test submissions, attempts, and diagnostic profiles.

4. **Multi-Tier Rate Limiting**:
   - `authLimiter`: 10 requests per 15-minute window on `/api/auth/login` to prevent credential brute-forcing.
   - `submitLimiter`: 10 test submits per minute per IP to mitigate flood attacks.
   - `apiLimiter`: 300 general API requests per 15-minute window.

5. **Student Answer-Key & Hidden Case Protection**:
   - Student test endpoints (`GET /api/tests/:id`) utilize Prisma projection filtering to strip `isCorrect` and `explanation` flags.
   - Coding problem endpoints (`GET /api/problems/:id`) deliver only `isSample: true` test cases; hidden test cases never leave the database server.

6. **Malicious File Upload Validation**:
   - Resources upload restricted strictly to `.pdf` MIME types.
   - Dangerous extensions (`.exe`, `.sh`, `.bat`, `.cmd`, `.js`) immediately rejected with HTTP 400.
   - Upload directory isolated outside public static web roots; downloads streamed through authenticated endpoint verifying file existence and path traversal guards.

7. **CSV Formula Injection Neutralization**:
   - Placement Officer CSV exports sanitize all string fields. Any field starting with spreadsheet formula triggers (`=`, `+`, `-`, `@`, `\t`, `\r`) is automatically prepended with a single quote (`'`).

8. **Test Window & Timer Integrity**:
   - Tests enforce start and end date-time windows. Attempts outside window are rejected.
   - Attempt duration is tracked server-side; submissions exceeding the test duration by more than the 30-second network grace window are graded based on answers submitted at time of expiry.

---

## 11. Code Runner: Security Limits & Architecture

> **IMPORTANT SECURITY DISCLOSURE:**  
> A child process spawned on the host OS is **NOT** a virtualization sandbox.

The local runner (`LocalProcessRunner` in `backend/src/services/codeRunner.ts`) is designed for local offline development, demonstration, and evaluation without requiring cloud dependencies or container daemons.

### Guardrails Implemented
- **Gated by Default**: `CODE_RUNNER_ENABLED=false` in standard development and production environments.
- **Process Semaphore**: Concurrency hard-capped (`RUNNER_MAX_CONCURRENCY=2`) using an asynchronous counting semaphore to prevent CPU exhaustion.
- **Strict Execution Timeouts**: Host execution capped at `RUNNER_TIMEOUT_MS=2000` (2 seconds). Subprocesses exceeding this limit are terminated via `SIGKILL`.
- **Payload Size Limits**: Source code payloads exceeding `RUNNER_MAX_SOURCE_BYTES=65536` (64 KB) are rejected prior to execution.
- **Path Sanitization**: Compiler error messages and runtime stack traces are scrubbed to mask local host filesystem paths with `<sandbox>`.
- **Environment Scrubbing**: Subprocesses run with an empty environment dictionary (`env: {}`), preventing access to `process.env` or database credentials.

### Production Recommendation
For enterprise production environments accepting untrusted student code, the runner service should be replaced with an isolated container sandbox provider (e.g., Judge0 API, AWS Lambda, or an isolated gVisor/Docker runner). A stub interface `Judge0Runner` is included in `codeRunner.ts` to facilitate this integration.

---

## 12. Known Limitations

- **Shared Question Bank**: Aptitude questions reside in a common institutional pool organized by topic rather than isolated per department.
- **Local Runner Isolation**: As noted above, the local process runner relies on OS-level process management rather than hardware virtualization.
- **Mocked Notifications**: System announcements and reminders are persisted to the database and displayed in-app; external SMTP email delivery is stubbed.
- **Single Concurrent Session**: Session tracking relies on standard JWT lifecycles rather than Redis-backed single-device revocation.

---

## 13. Future Scope

In alignment with the institutional project abstract, planned enhancements include:
1. **MicroVM Execution**: Integrating Firecracker or gVisor for millisecond-latency, fully hardware-isolated code execution.
2. **AI Resume Parser & Matcher**: Utilizing LLM-assisted vector embeddings to match student project experiences against published job descriptions.
3. **Automated Proctoring**: Optional browser tab-switch detection and webcam snapshot verification during formal mock placement tests.
4. **Adaptive Item Response Theory (IRT)**: Dynamically selecting aptitude practice questions based on real-time student ability estimates.
